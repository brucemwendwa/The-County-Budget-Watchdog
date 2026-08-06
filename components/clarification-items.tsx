"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetDocument, SuspiciousChange } from "@/lib/types";
import { formatKes } from "@/lib/utils";

const RISK_LABELS: Record<SuspiciousChange["risk"], string> = {
  low: "Low — worth clarifying",
  medium: "Medium — requires verification",
  high: "High — needs public explanation"
};

export function ClarificationItems({
  items,
  documents
}: {
  items: SuspiciousChange[];
  documents: BudgetDocument[];
}) {
  return (
    <section id="clarification">
      <h2 className="mb-2 text-xl font-bold">Items needing clarification</h2>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Informational flags from source documents — possible concerns that merit public explanation, not accusations.
      </p>
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No items flagged in the current county selection.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const source = documents.find((document) => document.county === item.county);
            return (
              <Card key={item.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      {item.department}
                    </CardTitle>
                    <Badge variant={item.risk === "high" ? "danger" : item.risk === "medium" ? "warning" : "outline"}>
                      {RISK_LABELS[item.risk]}
                    </Badge>
                  </div>
                  <CardDescription>
                    {item.county} / {item.ward}
                    {source ? ` · ${source.title}` : ""} · Page {item.sourcePage}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="leading-6 text-muted-foreground">{item.description}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Fact label="Before" value={formatKes(item.beforeKes)} />
                    <Fact label="After" value={formatKes(item.afterKes)} />
                    <Fact label="Change" value={formatKes(item.deltaKes)} />
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="font-semibold">Question citizens can ask</p>
                    <p className="mt-1 text-muted-foreground">
                      Why was this allocation described this way, and what public explanation supports the change?
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
