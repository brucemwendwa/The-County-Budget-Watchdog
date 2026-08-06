"use client";

import { useState } from "react";
import { FileText, Loader2, MessageSquareText } from "lucide-react";

import { AskAiPanel } from "@/components/ask-ai-panel";
import { CitizenIdeasPanel } from "@/components/citizen-ideas-panel";
import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { ClarificationsPanel } from "@/components/dashboard/clarifications";
import { DocumentList } from "@/components/dashboard/document-list";
import { KeyProjects } from "@/components/dashboard/key-projects";
import { SectorAllocationChart } from "@/components/dashboard/sector-allocation";
import { useLocationState } from "@/components/location-provider";
import { useInsights } from "@/components/use-insights";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Documents" },
  { id: "ask", label: "Ask AI" },
  { id: "ideas", label: "Citizen Ideas" }
] as const;

type TabId = (typeof TABS)[number]["id"];

/** The dashboard for whatever place is currently selected. */
export function LocationDashboard({ className }: { className?: string }) {
  const { selection, location } = useLocationState();
  const [tab, setTab] = useState<TabId>("overview");
  const [fiscalYear, setFiscalYear] = useState("");

  const { data, loading, error } = useInsights(selection, fiscalYear || undefined);

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{data?.place ?? "Kenya"}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {location.county ? `${location.county.name} County` : "Select a county to begin"}
            {location.subCounty ? ` · ${location.subCounty.name}` : ""}
          </p>
        </div>

        {data && data.fiscalYears.length > 0 ? (
          <label className="w-44 shrink-0">
            <span className="sr-only">Financial year</span>
            <Select
              value={fiscalYear}
              onChange={(event) => setFiscalYear(event.target.value)}
              options={[
                { label: "All financial years", value: "" },
                ...data.fiscalYears.map((year) => ({ label: year, value: year }))
              ]}
            />
          </label>
        ) : null}
      </div>

      <div role="tablist" aria-label="Budget information" className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
              tab === item.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading budget information…
        </p>
      ) : error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : !data ? null : (
        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-5">
          {tab === "overview" ? (
            data.documents.length === 0 ? (
              <NoDocuments place={data.place} />
            ) : (
              <>
                <BudgetOverview insights={data} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <SectorAllocationChart sectors={data.sectors} />
                  <KeyProjects
                    items={data.topProjects}
                    countywideItems={data.countywideItems}
                    place={data.place}
                  />
                </div>
                <ClarificationsPanel clarifications={data.clarifications} changes={data.changes} />
              </>
            )
          ) : null}

          {tab === "documents" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" aria-hidden />
                <h2 className="text-base font-bold">Source documents</h2>
                <Badge variant="outline">{data.documents.length}</Badge>
              </div>
              <DocumentList documents={data.documents} place={data.place} />
            </div>
          ) : null}

          {tab === "ask" ? <AskAiPanel /> : null}

          {tab === "ideas" ? <CitizenIdeasPanel /> : null}
        </div>
      )}
    </div>
  );
}

function NoDocuments({ place }: { place: string }) {
  return (
    <EmptyState
      icon={MessageSquareText}
      title={`No budget documents processed for ${place}`}
      description="This platform only shows figures it has read from a real document, so there is nothing to display yet. Upload a county budget, finance bill, or implementation report and the dashboard will fill in from its pages."
    />
  );
}
