"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, Sparkles, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BudgetAnswer } from "@/lib/types";

const starterQuestions = [
  "How much was allocated to Kileleshwa ward?",
  "Where is money allocated but not spent?",
  "Which health projects are planned in my area?"
];

export function BudgetChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<BudgetAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  async function askBudget(event?: FormEvent<HTMLFormElement>, seededQuestion?: string) {
    event?.preventDefault();
    const query = seededQuestion ?? question;
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setQuestion(query);
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: query, county: "Nairobi", ward: "Kileleshwa" })
    });
    const payload = (await response.json()) as BudgetAnswer;
    setAnswer(payload);
    setLoading(false);
  }

  return (
    <Card className="h-full shadow-civic">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Ask the budget
        </CardTitle>
        <CardDescription>Simple answers with facts, page citations, confidence, and civic next steps.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <form className="flex gap-2" onSubmit={askBudget}>
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about your ward, health projects, amendments..."
          />
          <Button type="submit" size="icon" disabled={loading} aria-label="Ask question">
            <Send className="h-4 w-4" />
          </Button>
        </form>
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
                <InfoBlock label="Why residents should care" value={answer.whyThisMatters} />
                <InfoBlock label="Suggested question" value={answer.suggestedQuestion ?? answer.suggestedCivicAction} />
              </div>
              <div className="rounded-md bg-background p-3">
                <p className="font-semibold">Sources and confidence</p>
                <p className="mt-1 text-muted-foreground">Confidence: {Math.round(answer.confidence * 100)}%</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {answer.sourcePages.map((source) => (
                    <li key={`${source.documentId}-${source.page}`}>
                      {source.title}, page {source.page}
                      {source.section ? `, ${source.section}` : ""}
                      {source.table ? `, ${source.table}` : ""}: {source.excerpt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <UserRound className="h-5 w-5" />
              Try: "What changed after the amendment?"
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
      <p className="mt-1 leading-6">{value}</p>
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
        <p className="mt-1 leading-6">No figure found in the available documents.</p>
      )}
    </div>
  );
}
