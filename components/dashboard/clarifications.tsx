"use client";

import { HelpCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ClarificationItem, DocumentChange } from "@/lib/types";
import { formatKes } from "@/lib/utils";

/**
 * Rows worth asking about, and changes the document itself records.
 *
 * These are prompts for a question at a public participation forum. Nothing here is a finding of
 * wrongdoing, and the wording deliberately avoids implying one.
 */
export function ClarificationsPanel({
  clarifications,
  changes
}: {
  clarifications: ClarificationItem[];
  changes: DocumentChange[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Items needing clarification</CardTitle>
          <CardDescription>Questions worth asking — not accusations.</CardDescription>
        </CardHeader>
        <CardContent>
          {clarifications.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="Nothing flagged"
              description="No extracted row was vague, unusually repeated, or read with low confidence."
            />
          ) : (
            <ul className="space-y-3">
              {clarifications.slice(0, 8).map((item) => (
                <li key={item.id} className="rounded-lg border p-3">
                  <p className="text-sm font-semibold">{item.reason}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.project} · {item.department} · page {item.page}
                    {item.amountKes !== null ? ` · ${formatKes(item.amountKes)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent changes</CardTitle>
          <CardDescription>Passages where the document describes a revision.</CardDescription>
        </CardHeader>
        <CardContent>
          {changes.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No changes recorded"
              description="The processed documents contain no supplementary, revised, or reallocation language."
            />
          ) : (
            <ul className="space-y-3">
              {changes.slice(0, 8).map((change) => (
                <li key={change.id} className="rounded-lg border p-3">
                  <p className="text-sm leading-6">{change.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Page {change.page}
                    {change.amountKes !== null ? ` · ${formatKes(change.amountKes)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
