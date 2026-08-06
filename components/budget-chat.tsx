"use client";

import { FormEvent, useState } from "react";
import { Bot, ChevronDown, ChevronUp, Send, Sparkles, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BudgetAnswer, County } from "@/lib/types";

const starterQuestions = [
  "How much was allocated to health?",
  "What projects are mentioned in this ward?",
  "Which items need clarification?",
  "What does this mean for residents?"
];

type BudgetChatProps = {
  county?: County;
  ward?: string;
  compact?: boolean;
};

export function BudgetChat({ county = "Nairobi", ward, compact = false }: BudgetChatProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<BudgetAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [degraded, setDegraded] = useState(false);

  async function askBudget(event?: FormEvent<HTMLFormElement>, seededQuestion?: string) {
    event?.preventDefault();
    const query = seededQuestion ?? question;
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setQuestion(query);
    setShowEvidence(false);
    setDegraded(false);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, county, ward: ward ?? "Kileleshwa" })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not answer that question.");
      }
      const payload = (await response.json()) as BudgetAnswer & { demo?: boolean; degraded?: boolean };
      setAnswer(payload);
      setDemoMode(Boolean(payload.demo));
      setDegraded(Boolean(payload.degraded));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not answer that question.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={compact ? "shadow-sm" : "h-full shadow-civic"}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          Ask AI
        </CardTitle>
        <CardDescription>Answers grounded in official documents with source citations and confidence levels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {demoMode ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            AI service is not configured. Add GEMINI_API_KEY to enable document Q&amp;A. Showing demo preview from sample data.
          </p>
        ) : null}
        {degraded ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            The AI service did not return a usable answer, so this reply was built directly from the stored budget
            records instead. Verify it against the cited source pages.
          </p>
        ) : null}
        {!compact ? (
        <div className="flex flex-wrap gap-2">
          {starterQuestions.map((item) => (
            <Button
              key={item}
              type="button"
              variant="secondary"
              size="sm"
              className="h-auto min-h-9 whitespace-normal text-left"
              onClick={() => askBudget(undefined, item)}
            >
              <Sparkles className="h-4 w-4" />
              {item}
            </Button>
          ))}
        </div>
        ) : null}
        <form className="flex gap-2" onSubmit={askBudget}>
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about allocations, sectors, wards, or source documents..."
          />
          <Button type="submit" size="icon" disabled={loading} aria-label="Ask question">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        ) : null}
        <div className="rounded-lg border bg-muted/40 p-4">
          {answer ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="space-y-3">
                  <InfoBlock label="Direct answer" value={answer.directAnswer ?? answer.simpleExplanation} />
                  <InfoList label="Amounts involved" values={answer.amountsInvolved ?? []} />
                  <InfoBlock label="Source citation" value={answer.sourceCitation ?? "See source pages below."} />
                  <InfoBlock label="Plain-language explanation" value={answer.simpleExplanation} />
                </div>
              </div>
              <div className="grid gap-3">
                <InfoList label="Facts from documents" values={answer.facts ?? []} />
                <InfoBlock label="Interpretation" value={answer.interpretation ?? "No interpretation available."} />
                {answer.swahiliFriendlyExplanation ? (
                  <InfoBlock label="Swahili-friendly explanation" value={answer.swahiliFriendlyExplanation} />
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="Resident meaning" value={answer.whyThisMatters} />
                <InfoBlock label="Suggested public participation question" value={answer.suggestedQuestion ?? answer.suggestedCivicAction} />
              </div>
              <div className="rounded-md bg-background p-3">
                <p className="font-semibold">Confidence</p>
                <p className="mt-1 text-muted-foreground">{Math.round(answer.confidence * 100)}%</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => setShowEvidence((open) => !open)}
              >
                View source evidence
                {showEvidence ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {showEvidence ? (
                <div className="rounded-md border bg-background p-3">
                  <ul className="space-y-2 text-muted-foreground">
                    {answer.sourcePages.map((source) => (
                      <li key={`${source.documentId}-${source.page}`}>
                        {source.title}, page {source.page}
                        {source.section ? `, ${source.section}` : ""}
                        {source.table ? `, ${source.table}` : ""}: {source.excerpt}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <UserRound className="h-5 w-5" />
              Try: &quot;What does this budget say about health?&quot;
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 leading-6">{value || "The source document does not clearly provide this information."}</p>
    </div>
  );
}

function InfoList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md bg-background p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      {values.length > 0 ? (
        <ul className="mt-1 space-y-1 leading-6">
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 leading-6 text-muted-foreground">
          The source document does not clearly provide this information.
        </p>
      )}
    </div>
  );
}
