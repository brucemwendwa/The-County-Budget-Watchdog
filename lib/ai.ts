import { GoogleGenerativeAI } from "@google/generative-ai";

import { budgetDocuments, suspiciousChanges, wardAllocations } from "@/data/sample-budget";
import { buildBudgetRagPrompt } from "@/lib/prompts";
import type { BudgetAnswer, County, RagSource } from "@/lib/types";
import { formatKes, percentage } from "@/lib/utils";

type AskBudgetInput = {
  question: string;
  county?: County;
  ward?: string;
};

export async function answerBudgetQuestion({ question, county, ward }: AskBudgetInput): Promise<BudgetAnswer> {
  const contexts = retrieveBudgetContext(question, county, ward);

  if (process.env.GEMINI_API_KEY) {
    return answerWithGemini(question, contexts);
  }

  return answerWithDemoRag(question, contexts);
}

function retrieveBudgetContext(question: string, county?: County, ward?: string) {
  const query = [question, county, ward].filter(Boolean).join(" ").toLowerCase();
  const scored = wardAllocations
    .map((allocation) => {
      const haystack = [
        allocation.county,
        allocation.ward,
        allocation.constituency,
        allocation.department,
        allocation.programme,
        allocation.project,
        allocation.status
      ]
        .join(" ")
        .toLowerCase();
      const score = query
        .split(/\s+/)
        .filter((token) => token.length > 2)
        .reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { allocation, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map(({ allocation }) => allocation);
}

async function answerWithGemini(question: string, contexts: ReturnType<typeof retrieveBudgetContext>) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-1.5-pro-latest",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json"
    }
  });

  const result = await model.generateContent(buildBudgetRagPrompt(question, contexts));

  const text = result.response.text();
  return JSON.parse(text) as BudgetAnswer;
}

function answerWithDemoRag(question: string, contexts: ReturnType<typeof retrieveBudgetContext>): BudgetAnswer {
  const allocation = contexts[0] ?? wardAllocations[0];
  const document = budgetDocuments.find((item) => item.county === allocation.county) ?? budgetDocuments[0];
  const absorption = percentage(allocation.expenditureKes, allocation.allocationKes);
  const isChangeQuestion = /change|amend|supplementary|gazette/i.test(question);
  const change = suspiciousChanges.find((item) => item.ward === allocation.ward);

  const sourcePages: RagSource[] = [
    {
      documentId: document.id,
      title: document.title,
      page: allocation.page,
      section: allocation.department,
      table: "Ward project allocations",
      programme: allocation.programme,
      excerpt: `${allocation.project}: ${formatKes(allocation.allocationKes)} allocated; ${formatKes(
        allocation.expenditureKes
      )} spent.`
    }
  ];

  if (isChangeQuestion && change) {
    sourcePages.push({
      documentId: "monitor-amendment-feed",
      title: "Amendment comparison monitor",
      page: change.sourcePage,
      section: change.department,
      table: "Budget change comparison",
      programme: change.department,
      excerpt: change.description
    });
  }

  const directAnswer =
    isChangeQuestion && change
      ? `${change.ward} has a documented budget change in ${change.department}.`
      : `${allocation.ward} has a documented allocation for ${allocation.project}.`;
  const amountsInvolved =
    isChangeQuestion && change
      ? [
          `Before amendment: ${formatKes(change.beforeKes)}`,
          `After amendment: ${formatKes(change.afterKes)}`,
          `Change: ${formatKes(change.deltaKes)}`
        ]
      : [
          `Allocation: ${formatKes(allocation.allocationKes)}`,
          `Recorded expenditure: ${formatKes(allocation.expenditureKes)}`,
          `Absorption rate: ${absorption}%`
        ];
  const sourceCitation =
    isChangeQuestion && change
      ? `${document.title}, page ${allocation.page}, ${allocation.department}; Amendment comparison monitor, page ${change.sourcePage}, ${change.department}`
      : `${document.title}, page ${allocation.page}, ${allocation.department}, ${allocation.programme}`;
  const simpleExplanation =
    isChangeQuestion && change
      ? `${change.ward} has a flagged budget change in ${change.department}. The amount moved from ${formatKes(
          change.beforeKes
        )} to ${formatKes(change.afterKes)}, a change of ${formatKes(change.deltaKes)}.`
      : `${allocation.ward} has ${formatKes(allocation.allocationKes)} allocated for ${allocation.project}. The records show ${formatKes(
          allocation.expenditureKes
        )} spent so far. Absorption rate means the share of allocated money that has actually been spent; here it is about ${absorption}%.`;

  return {
    directAnswer,
    amountsInvolved,
    sourceCitation,
    simpleExplanation,
    facts:
      isChangeQuestion && change
        ? [
            `${change.department} in ${change.ward} changed from ${formatKes(change.beforeKes)} to ${formatKes(
              change.afterKes
            )}.`,
            `The source page for the change alert is page ${change.sourcePage}.`
          ]
        : [
            `${allocation.project} is listed under ${allocation.department}.`,
            `${formatKes(allocation.allocationKes)} is allocated and ${formatKes(
              allocation.expenditureKes
            )} is recorded as spent.`
          ],
    interpretation:
      absorption < 35
        ? "Interpretation: this may point to delayed implementation or procurement follow-up needs. It is not proof of wrongdoing by itself."
        : "Interpretation: this looks closer to normal implementation, but residents can still ask for timelines and evidence of delivery.",
    swahiliFriendlyExplanation:
      absorption < 35
        ? "Kwa lugha rahisi: pesa imepangwa, lakini matumizi yaliyoandikwa bado ni kidogo. Uliza hali ya mradi na lini utakamilika."
        : "Kwa lugha rahisi: pesa imepangwa na sehemu yake imetumika. Uliza ushahidi wa kazi iliyofanyika na ratiba ya kukamilisha.",
    sourcePages,
    confidence: Math.max(0.68, allocation.confidence - 0.03),
    whyThisMatters:
      absorption < 35
        ? "Low spending can mean a promised service is delayed, procurement is stuck, or the project needs public follow-up."
        : "This helps residents compare promises in the budget with visible services on the ground.",
    suggestedCivicAction:
      "Ask your MCA or ward administrator for the project implementation status, contractor details, and expected completion date.",
    suggestedQuestion:
      "What is the current implementation status, who is responsible, and when should residents expect the service to be completed?"
  };
}
