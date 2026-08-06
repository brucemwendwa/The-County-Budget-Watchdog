"use client";

import { FileText, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { BudgetLineItem } from "@/lib/types";
import { formatKes } from "@/lib/utils";

/** The largest budget rows for a place, each showing the page it was read from. */
export function KeyProjects({
  items,
  countywideItems,
  place
}: {
  items: BudgetLineItem[];
  countywideItems: BudgetLineItem[];
  place: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Key projects</CardTitle>
        <CardDescription>Largest allocations recorded for {place}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={`No budget rows name ${place}`}
            description="The processed documents do not contain a row naming this place. That may mean the budget records it at a higher level, or that the relevant document has not been uploaded yet."
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{item.project}</p>
                  <p className="shrink-0 text-sm font-bold tabular-nums">{formatKes(item.allocationKes)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{item.department}</Badge>
                  <Badge variant={item.budgetType === "development" ? "success" : "secondary"}>
                    {item.budgetType === "development" ? "Development" : "Recurrent"}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {item.wardName ? `${item.wardName} Ward` : "County-wide"}
                  </span>
                  <span>Page {item.page}</span>
                  <span>{Math.round(item.confidence * 100)}% extraction confidence</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {countywideItems.length > 0 ? (
          <details className="rounded-lg border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              {countywideItems.length} county-wide row{countywideItems.length === 1 ? "" : "s"} that also cover this
              area
            </summary>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              These rows do not name a ward, so they are not counted in the totals above. They are budgets recorded for
              the county as a whole.
            </p>
            <ul className="mt-3 space-y-2">
              {countywideItems.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{item.project}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatKes(item.allocationKes)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">p.{item.page}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
