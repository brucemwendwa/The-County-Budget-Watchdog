"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, Calendar, ExternalLink, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetDocument } from "@/lib/types";

const DOCUMENT_TYPE_LABELS: Record<BudgetDocument["type"], string> = {
  "approved-budget": "County Budget Estimates",
  "supplementary-budget": "Supplementary Budget",
  "gazette-notice": "Gazette Notice",
  "expenditure-report": "Expenditure Report",
  "implementation-report": "Implementation Report"
};

export function DocumentsPage({ documents }: { documents: BudgetDocument[] }) {
  const [countyFilter, setCountyFilter] = useState("all");
  const counties = ["all", ...Array.from(new Set(documents.map((document) => document.county)))];

  const filtered =
    countyFilter === "all" ? documents : documents.filter((document) => document.county === countyFilter);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Badge variant="secondary">Source documents</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Official county finance documents</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every insight should trace back to a named document, financial year, and page reference where available.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {counties.map((county) => (
          <Button
            key={county}
            size="sm"
            variant={countyFilter === county ? "default" : "outline"}
            onClick={() => setCountyFilter(county)}
          >
            {county === "all" ? "All counties" : county}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No official source documents match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((document) => (
            <Card key={document.id} className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-start gap-2 text-base leading-snug">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  {document.title}
                </CardTitle>
                <CardDescription>
                  {document.county} · {document.fiscalYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{DOCUMENT_TYPE_LABELS[document.type] ?? document.type}</Badge>
                  <Badge variant="secondary">{document.status.replace(/-/g, " ")}</Badge>
                  <Badge variant="outline">Demo Data</Badge>
                </div>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Added {new Date(document.uploadedAt).toLocaleDateString()} · {document.pages} pages
                </p>
                <div className="flex flex-wrap gap-2">
                  {document.sourceUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={document.sourceUrl} target="_blank" rel="noopener noreferrer">
                        View PDF
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Source URL not yet linked</span>
                  )}
                  <Button asChild size="sm">
                    <Link href="/ask-ai">
                      <Bot className="h-3.5 w-3.5" />
                      Ask AI
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
