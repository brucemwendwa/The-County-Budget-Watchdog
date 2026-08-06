"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ElementType } from "react";
import {
  AlertCircle,
  BookOpen,
  Building2,
  ChevronRight,
  FileText,
  MapPin,
  Wallet
} from "lucide-react";

import { BudgetChat } from "@/components/budget-chat";
import { DepartmentBarChart, DevelopmentPieChart } from "@/components/budget-charts";
import { ClarificationItems } from "@/components/clarification-items";
import { ResponsibleAiNote } from "@/components/responsible-ai-note";
import { SectorAllocationChart } from "@/components/sector-allocation-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CITIZEN_QUESTIONS, FINANCIAL_YEARS, getCountyByName, statusLabel } from "@/lib/counties";
import type { BudgetDocument, County, DepartmentSummary, SuspiciousChange, WardAllocation } from "@/lib/types";
import { formatKes } from "@/lib/utils";

type InsightsData = {
  documents: BudgetDocument[];
  allocations: WardAllocation[];
  departments: DepartmentSummary[];
  changes: SuspiciousChange[];
};

export function CountyInsightsPage({ data }: { data: InsightsData }) {
  const searchParams = useSearchParams();
  const requestedCounty = searchParams.get("county");

  const analyzedCounties = useMemo(
    () => Array.from(new Set(data.allocations.map((allocation) => allocation.county))),
    [data.allocations]
  );

  // A requested county with no extracted rows stays selected so the empty state can name it,
  // rather than silently showing a different county's budget under its heading.
  const [county, setCounty] = useState<string>(requestedCounty ?? analyzedCounties[0] ?? "Nairobi");

  const countyOptions = useMemo(
    () => (analyzedCounties.includes(county as County) ? analyzedCounties : [...analyzedCounties, county]),
    [analyzedCounties, county]
  );
  const [subCounty, setSubCounty] = useState("");
  const [ward, setWard] = useState("");
  const [fiscalYear, setFiscalYear] = useState("2025/2026");

  const countyMeta = getCountyByName(county);
  const subCountyOptions = countyMeta?.subCounties ?? [];
  const wardOptions = subCounty
    ? (subCountyOptions.find((item) => item.name === subCounty)?.wards ?? [])
    : subCountyOptions.flatMap((item) => item.wards);

  const countyAllocations = data.allocations.filter(
    (allocation) => allocation.county === county && allocation.fiscalYear === fiscalYear
  );
  const wardAllocations = ward
    ? countyAllocations.filter((allocation) => allocation.ward === ward)
    : subCounty
      ? countyAllocations.filter((allocation) =>
          subCountyOptions.find((item) => item.name === subCounty)?.wards.includes(allocation.ward)
        )
      : countyAllocations;

  const countyDepartments = data.departments.filter((department) =>
    countyAllocations.some((allocation) => allocation.department === department.department)
  );
  const countyDocuments = data.documents.filter((document) => document.county === county);
  const countyChanges = data.changes.filter((change) => change.county === county);

  const totalBudget = countyAllocations.reduce((sum, allocation) => sum + allocation.allocationKes, 0);
  const developmentTotal = countyAllocations
    .filter((allocation) => allocation.budgetType === "development")
    .reduce((sum, allocation) => sum + allocation.allocationKes, 0);
  const recurrentTotal = countyAllocations
    .filter((allocation) => allocation.budgetType === "recurrent")
    .reduce((sum, allocation) => sum + allocation.allocationKes, 0);
  const hasData = countyAllocations.length > 0;
  const isDemo = countyMeta?.status === "demo";

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">County budget insights</Badge>
          {countyMeta ? <Badge variant="outline">{statusLabel(countyMeta.status)}</Badge> : null}
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Track allocations from county to ward</h1>
        <p className="max-w-3xl text-muted-foreground">
          Select county, sub-county, ward, and financial year to explore official budget information with source
          verification.
        </p>
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Location drilldown</CardTitle>
          <CardDescription>County → Sub-county → Ward → Financial year</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Field label="County">
            <Select
            value={county}
            onChange={(event) => {
              setCounty(event.target.value);
              setSubCounty("");
              setWard("");
            }}
            options={countyOptions.map((item) => ({ label: item, value: item }))}
            />
          </Field>
          <Field label="Sub-county">
            <Select
            value={subCounty}
            onChange={(event) => {
              setSubCounty(event.target.value);
              setWard("");
            }}
            options={[
              { label: "All sub-counties", value: "" },
              ...subCountyOptions.map((item) => ({ label: item.name, value: item.name }))
            ]}
            />
          </Field>
          <Field label="Ward">
            <Select
            value={ward}
            onChange={(event) => setWard(event.target.value)}
            options={[
              { label: "All wards", value: "" },
              ...wardOptions.map((item) => ({ label: item, value: item }))
            ]}
            />
          </Field>
          <Field label="Financial year">
            <Select
            value={fiscalYear}
            onChange={(event) => setFiscalYear(event.target.value)}
            options={FINANCIAL_YEARS.map((year) => ({ label: year, value: year }))}
            />
          </Field>
        </CardContent>
      </Card>

      {!hasData ? (
        <EmptyState message={`No analyzed budget data available yet for ${county}.`} />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <OverviewCard icon={Wallet} label="Total budget" value={formatKes(totalBudget)} demo={isDemo} />
            <OverviewCard icon={Building2} label="Development allocation" value={formatKes(developmentTotal)} demo={isDemo} />
            <OverviewCard icon={Building2} label="Recurrent allocation" value={formatKes(recurrentTotal)} demo={isDemo} />
            <OverviewCard icon={BookOpen} label="Key sectors" value={`${countyDepartments.length}`} demo={isDemo} />
            <OverviewCard icon={FileText} label="Source documents" value={`${countyDocuments.length}`} />
            <OverviewCard icon={AlertCircle} label="Items needing clarification" value={`${countyChanges.length}`} />
          </section>

          <section id="sectors" className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Sector allocation</CardTitle>
                <CardDescription>
                  Budget allocation by sector{isDemo ? " (Demo Data)" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SectorAllocationChart
                  departments={countyDepartments.length ? countyDepartments : data.departments}
                  demo={isDemo}
                />
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Development vs recurrent</CardTitle>
                <CardDescription>County-level split from extracted records</CardDescription>
              </CardHeader>
              <CardContent>
                <DevelopmentPieChart departments={countyDepartments.length ? countyDepartments : data.departments} />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Department allocations</CardTitle>
                <CardDescription>Allocated vs recorded spending from source documents</CardDescription>
              </CardHeader>
              <CardContent>
                <DepartmentBarChart departments={countyDepartments.length ? countyDepartments : data.departments} />
              </CardContent>
            </Card>
            <BudgetChat county={county as County} ward={ward || undefined} compact />
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold">Ward-level insights</h2>
            {ward && wardAllocations.length === 0 ? (
              <EmptyState message="Ward-level allocation was not clearly found in the source documents." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(ward ? wardAllocations : countyAllocations.slice(0, 4)).map((allocation) => (
                  <Card key={allocation.id} className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base leading-snug">{allocation.project}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {allocation.ward}, {allocation.constituency} · Page {allocation.page}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">Allocation:</span> {formatKes(allocation.allocationKes)}
                      </p>
                      <p>
                        <span className="font-semibold">Department:</span> {allocation.department}
                      </p>
                      <p className="text-muted-foreground">{allocation.programme}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Source documents</h2>
              <Link href="/documents" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {countyDocuments.length === 0 ? (
              <EmptyState message="No official source document has been added for this county yet." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {countyDocuments.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            )}
          </section>

          <ClarificationItems items={countyChanges} documents={countyDocuments} />

          <section>
            <h2 className="mb-4 text-xl font-bold">Questions citizens can ask</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CITIZEN_QUESTIONS.map((question) => (
                <div key={question} className="rounded-lg border bg-card p-4 text-sm">
                  {question}
                </div>
              ))}
            </div>
          </section>

          <ResponsibleAiNote />
        </>
      )}
    </main>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  demo
}: {
  icon: ElementType;
  label: string;
  value: string;
  demo?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <Icon className="h-4 w-4 text-primary" />
        <p className="mt-2 text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {demo ? (
          <Badge variant="secondary" className="mt-2 text-[10px]">
            Demo Data
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DocumentCard({ document }: { document: BudgetDocument }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-4">
        <p className="font-semibold">{document.title}</p>
        <p className="text-xs text-muted-foreground">
          {document.county} · {document.fiscalYear} · {document.type.replace(/-/g, " ")} · {document.pages} pages
        </p>
        <div className="flex flex-wrap gap-2">
          {document.sourceUrl ? (
            <a href={document.sourceUrl} className="text-xs font-semibold text-primary hover:underline">
              View PDF
            </a>
          ) : null}
          <Link href="/ask-ai" className="text-xs font-semibold text-primary hover:underline">
            Ask AI about this document
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-muted-foreground">{message}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
