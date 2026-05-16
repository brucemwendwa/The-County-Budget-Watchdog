"use client";

import { BookOpenText, Languages, Lightbulb, Quote, ShieldCheck } from "lucide-react";

import { BudgetChat } from "@/components/budget-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetDocument } from "@/lib/types";

const suggestedQuestions = [
  "How much was allocated to my ward?",
  "Which health projects are planned in my area?",
  "What changed after the amendment?",
  "Where is money allocated but not spent?"
];

export function ChatPage({ documents }: { documents: BudgetDocument[] }) {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
      <section className="space-y-5">
        <div>
          <Badge variant="secondary">Grounded budget chat</Badge>
          <h1 className="mt-3 text-3xl font-black tracking-normal sm:text-5xl">Ask the budget in plain English.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Get resident-friendly answers with source citations, page references, confidence, and follow-up questions.
          </p>
        </div>
        <BudgetChat />
      </section>

      <aside className="space-y-4">
        <Card className="shadow-civic">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Suggested questions
            </CardTitle>
            <CardDescription>Tap one in the chat or adapt it to your ward.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestedQuestions.map((question) => (
              <div key={question} className="rounded-md border bg-card p-3 text-sm font-medium">
                {question}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resident tools</CardTitle>
            <CardDescription>Demo controls for simplifying or translating an answer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start">
              <BookOpenText className="h-4 w-4" />
              Explain like I am 10
            </Button>
            <Button variant="outline" className="justify-start">
              <Languages className="h-4 w-4" />
              Translate to Swahili
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Quote className="h-5 w-5 text-primary" />
              Source stack
            </CardTitle>
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
              The assistant should answer only from uploaded documents and public finance sources. Missing figures are
              shown as missing, not guessed.
            </p>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
