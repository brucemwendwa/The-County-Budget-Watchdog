"use client";

import { useState, type FormEvent } from "react";
import { Bot, ChevronDown, ChevronUp, Info, Loader2, Send, Sparkles } from "lucide-react";

import { useLocationState } from "@/components/location-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { locationLabel } from "@/lib/kenya";
import type { BudgetAnswer } from "@/lib/types";

type AnswerResponse = BudgetAnswer & {
  searchedDocuments: Array<{ id: string; title: string; fiscalYear: string }>;
  modelConfigured: boolean;
};

const STARTERS = [
  "How much was allocated to health?",
  "Which projects are listed for this ward?",
  "What is the development budget?",
  "What changed in this budget?"
];

/**
 * Questions answered from processed documents only.
 *
 * Every answer carries the document, the page, and a confidence level, and an answer the documents
 * cannot support is shown as exactly that rather than filled in.
 */
export function AskAiPanel({ className }: { className?: string }) {
  const { selection, location } = useLocationState();
  const place = locationLabel(location);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);

  async function ask(event?: FormEvent<HTMLFormElement>, preset?: string) {
    event?.preventDefault();
    const query = (preset ?? question).trim();
    if (query.length < 3 || loading) return;

    setQuestion(query);
    setLoading(true);
    setError("");
    setShowEvidence(false);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, ...selection })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "That question could not be answered.");
      }
      setAnswer(payload as AnswerResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That question could not be answered.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" aria-hidden />
          Ask AI about {place}
        </CardTitle>
        <CardDescription>
          Answers come only from documents processed on this platform, with the page they were read from.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <Button
              key={starter}
              type="button"
              variant="secondary"
              size="sm"
              className="h-auto min-h-9 whitespace-normal text-left"
              onClick={() => ask(undefined, starter)}
              disabled={loading}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {starter}
            </Button>
          ))}
        </div>

        <form className="flex gap-2" onSubmit={ask}>
          <label className="sr-only" htmlFor="ask-ai-question">
            Your question
          </label>
          <Input
            id="ask-ai-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about allocations, projects, or changes…"
            maxLength={500}
          />
          <Button type="submit" size="icon" disabled={loading} aria-label="Ask question">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {answer ? <AnswerView answer={answer} showEvidence={showEvidence} onToggleEvidence={setShowEvidence} /> : null}
      </CardContent>
    </Card>
  );
}

function AnswerView({
  answer,
  showEvidence,
  onToggleEvidence
}: {
  answer: AnswerResponse;
  showEvidence: boolean;
  onToggleEvidence: (open: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      {!answer.modelConfigured && !answer.unanswered ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No language model is configured on this deployment, so this reply lists the matching source passages without
          summarising them. Set GEMINI_API_KEY to enable written answers.
        </p>
      ) : null}

      <Block label="Direct answer" value={answer.directAnswer} emphasis />
      <Block label="Simple explanation" value={answer.simpleExplanation} />

      {answer.amountsInvolved.length > 0 ? (
        <div className="rounded-md bg-card p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Amounts involved</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {answer.amountsInvolved.map((amount) => (
              <li key={amount}>{amount}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Block label="What this means for citizens" value={answer.meaningForCitizens} />
        <Block label="Suggested follow-up question" value={answer.suggestedQuestion} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {answer.sourceDocument ? <Badge variant="outline">Source: {answer.sourceDocument}</Badge> : null}
        <Badge variant={answer.confidence >= 0.7 ? "success" : answer.confidence >= 0.4 ? "warning" : "secondary"}>
          Confidence {Math.round(answer.confidence * 100)}%
        </Badge>
        {answer.searchedDocuments.length > 0 ? (
          <span className="text-muted-foreground">
            Searched {answer.searchedDocuments.length} processed document
            {answer.searchedDocuments.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {answer.sourcePages.length > 0 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between"
            onClick={() => onToggleEvidence(!showEvidence)}
            aria-expanded={showEvidence}
          >
            {showEvidence ? "Hide source evidence" : `Show source evidence (${answer.sourcePages.length})`}
            {showEvidence ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showEvidence ? (
            <ul className="space-y-2">
              {answer.sourcePages.map((source, index) => (
                <li key={`${source.documentId}-${source.page}-${index}`} className="rounded-md border bg-card p-3">
                  <p className="text-xs font-semibold">
                    {source.title} · page {source.page}
                    {source.section ? ` · ${source.section}` : ""}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{source.excerpt}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Block({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-md bg-card p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 leading-6 ${emphasis ? "text-sm font-semibold" : "text-sm"}`}>
        {value || "The uploaded document does not clearly provide this information."}
      </p>
    </div>
  );
}
