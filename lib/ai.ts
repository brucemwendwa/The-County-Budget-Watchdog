import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { resolve } from "@/lib/kenya-server";
import { locationLabel } from "@/lib/kenya";
import { buildBudgetAnswerPrompt } from "@/lib/prompts";
import { listExtractions } from "@/lib/store";
import type { BudgetAnswer, ExtractionResult, RagSource } from "@/lib/types";
import { formatKes } from "@/lib/utils";

export type LocationScopeInput = {
  countyCode?: string;
  subCountyCode?: string;
  wardCode?: string;
};

export type AnswerSource = "gemini" | "documents" | "no-documents";

export type BudgetAnswerResult = {
  answer: BudgetAnswer;
  source: AnswerSource;
  /** Documents the retrieval actually searched, so the UI can show the scope of the answer. */
  searchedDocuments: Array<{ id: string; title: string; fiscalYear: string }>;
};

/** The wording the product uses whenever the documents do not cover a question. */
const NO_INFORMATION = "The uploaded document does not clearly provide this information.";

const NO_DOCUMENTS =
  "No budget documents have been processed for this area yet, so there is nothing to answer from. Upload a county budget PDF to get started.";

const AnswerSchema = z.object({
  directAnswer: z.string().min(1),
  simpleExplanation: z.string().min(1),
  amountsInvolved: z.array(z.string()).default([]),
  sourceDocument: z.string().default(""),
  citedEvidence: z.array(z.number().int().positive()).default([]),
  confidence: z.number().default(0.5),
  meaningForCitizens: z.string().default(""),
  suggestedQuestion: z.string().default(""),
  unanswered: z.boolean().default(false)
});

export async function answerBudgetQuestion({
  question,
  scope
}: {
  question: string;
  scope: LocationScopeInput;
}): Promise<BudgetAnswerResult> {
  const extractions = await findExtractionsInScope(scope);
  const place = locationLabel(resolve(scope));

  if (extractions.length === 0) {
    return {
      answer: emptyAnswer(NO_DOCUMENTS),
      source: "no-documents",
      searchedDocuments: []
    };
  }

  const searchedDocuments = extractions.map((result) => ({
    id: result.document.id,
    title: result.document.title,
    fiscalYear: result.document.fiscalYear
  }));

  const evidence = retrieveEvidence(question, extractions, scope);

  if (evidence.length === 0) {
    return {
      answer: {
        ...emptyAnswer(NO_INFORMATION),
        sourceDocument: extractions[0].document.title
      },
      source: "documents",
      searchedDocuments
    };
  }

  if (process.env.GEMINI_API_KEY) {
    const modelAnswer = await answerWithGemini(question, place, evidence);
    if (modelAnswer) {
      return { answer: modelAnswer, source: "gemini", searchedDocuments };
    }
  }

  return {
    answer: answerFromEvidence(question, evidence),
    source: "documents",
    searchedDocuments
  };
}

async function findExtractionsInScope(scope: LocationScopeInput): Promise<ExtractionResult[]> {
  const all = await listExtractions();
  if (!scope.countyCode) return all;
  return all.filter((result) => result.document.countyCode === scope.countyCode);
}

/**
 * Lexical retrieval over everything a document yielded: its budget rows, the totals it stated, and
 * any change language it contains. Each passage keeps the page it came from so the answer can be
 * checked against the source.
 */
function retrieveEvidence(
  question: string,
  extractions: ExtractionResult[],
  scope: LocationScopeInput,
  limit = 6
): RagSource[] {
  const tokens = tokenize(question);
  const scored: Array<{ source: RagSource; score: number }> = [];

  for (const result of extractions) {
    const { document, analysis } = result;

    for (const item of result.lineItems) {
      // Rows for the selected ward matter more than the county's other rows.
      const locationBoost =
        (scope.wardCode && item.wardCode === scope.wardCode) ||
        (scope.subCountyCode && item.subCountyCode === scope.subCountyCode)
          ? 3
          : 0;

      const haystack = [
        item.wardName,
        item.subCountyName,
        item.department,
        item.programme,
        item.project,
        item.budgetType
      ]
        .filter(Boolean)
        .join(" ");

      const score = overlap(tokens, haystack) + locationBoost;
      if (score === 0) continue;

      scored.push({
        score,
        source: {
          documentId: document.id,
          title: document.title,
          page: item.page,
          section: item.department,
          programme: item.programme,
          excerpt: `${item.project} — ${formatKes(item.allocationKes)} allocated${
            item.expenditureKes !== null ? `, ${formatKes(item.expenditureKes)} in the comparison column` : ""
          }${item.wardName ? ` (${item.wardName} Ward)` : " (county-wide row)"}. Source line: "${item.excerpt}"`
        }
      });
    }

    for (const number of analysis.keyNumbers) {
      const score = overlap(tokens, number.label) + 1;
      scored.push({
        score,
        source: {
          documentId: document.id,
          title: document.title,
          page: number.page,
          section: number.label,
          excerpt: `${number.label}: ${formatKes(number.amountKes)}. Source line: "${number.excerpt}"`
        }
      });
    }

    for (const change of analysis.changes) {
      const score = overlap(tokens, change.description);
      if (score === 0) continue;
      scored.push({
        score,
        source: {
          documentId: document.id,
          title: document.title,
          page: change.page,
          section: "Recorded change",
          excerpt: change.excerpt
        }
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.source);
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "what",
  "how",
  "much",
  "was",
  "are",
  "does",
  "did",
  "this",
  "that",
  "with",
  "from",
  "has",
  "have",
  "county",
  "budget",
  "ward"
]);

function overlap(tokens: string[], haystack: string) {
  const text = haystack.toLowerCase();
  return tokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
}

async function answerWithGemini(
  question: string,
  place: string,
  evidence: RagSource[]
): Promise<BudgetAnswer | null> {
  try {
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    });

    const response = await model.generateContent(buildBudgetAnswerPrompt({ question, place, evidence }));
    const parsed = AnswerSchema.safeParse(JSON.parse(response.response.text()));

    if (!parsed.success) {
      console.error("Model returned an unusable answer", parsed.error.issues);
      return null;
    }

    const data = parsed.data;

    // Only citations pointing at evidence that was actually supplied survive. A model that cites
    // something it was not given has left the documents, and the citation must not reach the reader.
    const citedPages = data.citedEvidence
      .map((index) => evidence[index - 1])
      .filter((source): source is RagSource => Boolean(source));
    const sourcePages = citedPages.length > 0 ? citedPages : evidence.slice(0, 2);

    if (data.unanswered) {
      return { ...emptyAnswer(NO_INFORMATION), sourceDocument: evidence[0].title, sourcePages };
    }

    return {
      directAnswer: data.directAnswer,
      simpleExplanation: data.simpleExplanation,
      amountsInvolved: data.amountsInvolved,
      sourceDocument: data.sourceDocument || evidence[0].title,
      sourcePages,
      confidence: normalizeConfidence(data.confidence),
      meaningForCitizens: data.meaningForCitizens,
      suggestedQuestion: data.suggestedQuestion,
      unanswered: false
    };
  } catch (error) {
    console.error("Model answer failed", error);
    return null;
  }
}

/**
 * The answer used when no model is configured, or when the model call fails. It restates what the
 * retrieved rows say and nothing more, so it is always as grounded as the documents themselves.
 */
function answerFromEvidence(question: string, evidence: RagSource[]): BudgetAnswer {
  const top = evidence[0];
  const amounts = evidence
    .map((source) => source.excerpt.match(/(?:KES|KSh)\s?[\d.,]+[MBK]?/i)?.[0])
    .filter((value): value is string => Boolean(value))
    .slice(0, 5);

  return {
    directAnswer: `The processed documents contain ${evidence.length} passage${
      evidence.length === 1 ? "" : "s"
    } relevant to this question. The closest match is on page ${top.page} of ${top.title}${
      top.section ? `, under ${top.section}` : ""
    }.`,
    simpleExplanation:
      "This reply lists what the source pages record, without interpretation. The AI assistant is not configured on this deployment, so nothing has been summarised for you — read the cited pages below to see the wording the document uses.",
    amountsInvolved: amounts,
    sourceDocument: top.title,
    sourcePages: evidence,
    confidence: 0.5,
    meaningForCitizens:
      "These are the budget lines your county recorded for this area. Comparing them with what has been built or delivered is the basis for a question at a public participation forum.",
    suggestedQuestion: `What is the current implementation status of the item on page ${top.page}, and who is responsible for delivering it?`,
    unanswered: false
  };
}

function emptyAnswer(message: string): BudgetAnswer {
  return {
    directAnswer: message,
    simpleExplanation: message,
    amountsInvolved: [],
    sourceDocument: "",
    sourcePages: [],
    confidence: 0,
    meaningForCitizens:
      "A missing answer is still useful information: it means the published documents do not record this, which is itself worth asking about.",
    suggestedQuestion: "Which document records this, and can the county publish it?",
    unanswered: true
  };
}

/** Models sometimes report confidence as a percentage; everything is clamped to 0–1. */
function normalizeConfidence(value: number) {
  const normalized = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, Number(normalized.toFixed(2))));
}
