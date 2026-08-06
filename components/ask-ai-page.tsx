"use client";

import { BookOpen, ShieldCheck } from "lucide-react";

import { BudgetChat } from "@/components/budget-chat";
import { ResponsibleAiNote } from "@/components/responsible-ai-note";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CITIZEN_QUESTIONS } from "@/lib/counties";
import type { BudgetDocument } from "@/lib/types";

const suggestedQuestions = [
  "How much was allocated to health?",
  "What projects are mentioned in this ward?",
  "What changed in the Finance Bill?",
  "Which items need clarification?",
  "What does this mean for residents?",
  "Which source document supports this?"
];

export function AskAiPage({ documents }: { documents: BudgetDocument[] }) {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
      <section className="space-y-5">
        <div>
          <Badge variant="secondary">Ask AI</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Ask questions about official county budgets
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Get direct answers with simple explanations, source document references, page numbers, and confidence
            levels. Never guess — if information is missing, the assistant will say so.
          </p>
        </div>
        <BudgetChat />
      </section>

      <aside className="space-y-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              Suggested questions
            </CardTitle>
            <CardDescription>Tap one in the chat or adapt it to your county and ward.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestedQuestions.map((question) => (
              <div key={question} className="rounded-md border bg-card p-3 text-sm font-medium">
                {question}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Source documents indexed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="rounded-md bg-muted p-3">
                <p className="text-sm font-semibold">{document.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {document.county} / {document.fiscalYear} / {document.pages} pages
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
            <p className="text-sm leading-6 text-muted-foreground">
              The assistant answers only from uploaded documents and stored county data. Missing figures are shown as
              missing, not guessed.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions citizens can ask</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {CITIZEN_QUESTIONS.slice(0, 4).map((question) => (
              <p key={question}>{question}</p>
            ))}
          </CardContent>
        </Card>

        <ResponsibleAiNote />
      </aside>
    </main>
  );
}
