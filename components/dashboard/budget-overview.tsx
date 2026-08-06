"use client";

import { Building2, Coins, FileText, Layers, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationInsights } from "@/lib/location-insights";
import { formatKes } from "@/lib/utils";

/**
 * The headline figures for a place.
 *
 * A figure the documents did not state is shown as "Not stated in documents" rather than a zero —
 * zero would read as a real allocation of nothing, which is a different claim entirely.
 */
export function BudgetOverview({ insights }: { insights: LocationInsights }) {
  const { totals, countyTotals, lineItems, departments, documents } = insights;
  const isCountyLevel = insights.level === "county" || insights.level === "kenya";
  const scopeNote =
    insights.level === "ward"
      ? "Counted from rows that name this ward."
      : insights.level === "sub-county"
        ? "Counted from rows that name this sub-county."
        : "Counted from every row extracted for this county.";

  return (
    <section className="space-y-4" aria-labelledby="budget-overview-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="budget-overview-heading" className="text-lg font-bold">
            Budget overview
          </h2>
          <p className="text-sm text-muted-foreground">{scopeNote}</p>
        </div>
        <Badge variant="outline">
          {documents.length} source document{documents.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Coins}
          label="Allocation in extracted rows"
          value={lineItems.length > 0 ? formatKes(totals.allocationKes) : null}
          detail={`${lineItems.length} row${lineItems.length === 1 ? "" : "s"}`}
        />
        <Stat
          icon={Building2}
          label="Development"
          value={lineItems.length > 0 ? formatKes(totals.developmentKes) : null}
          detail="Money for new or improved assets"
        />
        <Stat
          icon={Layers}
          label="Recurrent"
          value={lineItems.length > 0 ? formatKes(totals.recurrentKes) : null}
          detail="Salaries and running costs"
        />
        <Stat
          icon={FileText}
          label="Departments"
          value={departments.length > 0 ? String(departments.length) : null}
          detail="Found in the extracted rows"
        />
      </div>

      {/* County-wide totals are labelled as such: they describe the county, not the selected ward. */}
      {countyTotals.revenueKes !== null || countyTotals.expenditureKes !== null ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {countyTotals.countyName ? `${countyTotals.countyName} County totals` : "County totals"}
            </CardTitle>
            <CardDescription>
              {isCountyLevel
                ? "Stated by the documents for the whole county."
                : `Stated for the whole county, not for ${insights.place}. Shown for context.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Stat
              icon={TrendingUp}
              label="Total revenue"
              value={countyTotals.revenueKes !== null ? formatKes(countyTotals.revenueKes) : null}
              detail="As stated in the document"
            />
            <Stat
              icon={TrendingDown}
              label="Total expenditure"
              value={countyTotals.expenditureKes !== null ? formatKes(countyTotals.expenditureKes) : null}
              detail="As stated in the document"
            />
          </CardContent>
        </Card>
      ) : null}

      {insights.keyNumbers.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key numbers stated in the documents</CardTitle>
            <CardDescription>
              County-level figures, each quoted from the page it appears on.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {insights.keyNumbers.slice(0, 8).map((number) => (
              <div key={`${number.label}-${number.page}`} className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{number.label}</p>
                <p className="mt-1 text-lg font-bold">{formatKes(number.amountKes)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Page {number.page}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        </div>
        {value ? (
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        ) : (
          <p className="mt-2 text-sm font-medium text-muted-foreground">Not stated in documents</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
