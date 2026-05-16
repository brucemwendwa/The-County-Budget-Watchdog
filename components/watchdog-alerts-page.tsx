"use client";

import type { ElementType } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, FileSearch, RadioTower, ShieldAlert } from "lucide-react";

import { BudgetLeakDetector } from "@/components/budget-leak-detector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetDocument, BudgetLeakReport, SuspiciousChange } from "@/lib/types";
import { formatKes } from "@/lib/utils";

export function WatchdogAlertsPage({
  changes,
  documents,
  leakReport
}: {
  changes: SuspiciousChange[];
  documents: BudgetDocument[];
  leakReport: BudgetLeakReport;
}) {
  const highRisk = changes.filter((change) => change.risk === "high").length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <Badge variant="secondary">Watchdog alerts</Badge>
          <h1 className="mt-3 text-3xl font-black tracking-normal sm:text-5xl">Spot budget changes before they disappear.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Monitor amendments, gazette notices, low absorption, removed projects, vague line items, and money shifted
            away from visible services.
          </p>
        </div>
        <Card className="bg-foreground text-white shadow-civic">
          <CardContent className="grid grid-cols-3 gap-3 p-5 text-center">
            <AlertMetric label="Alerts" value={`${changes.length}`} />
            <AlertMetric label="High risk" value={`${highRisk}`} />
            <AlertMetric label="Sources" value={`${documents.length}`} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MonitorCard icon={RadioTower} title="Gazette notice monitor" body="Checks new public notices for budget amendments and project movement." />
        <MonitorCard icon={FileSearch} title="Amendment comparison" body="Compares original and amended allocations by project, ward, department, and programme." />
        <MonitorCard icon={ShieldAlert} title="Risk triage" body="Flags unexplained changes above KES 10M, project removals, and vague spending names." />
      </section>

      <BudgetLeakDetector report={leakReport} />

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {changes.map((change) => (
            <Card key={change.id} className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {change.department}
                    </CardTitle>
                    <CardDescription>
                      {change.county} / {change.ward} / Page {change.sourcePage}
                    </CardDescription>
                  </div>
                  <RiskBadge risk={change.risk} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{change.description}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ChangeFact label="Before" value={formatKes(change.beforeKes)} />
                  <ChangeFact label="After" value={formatKes(change.afterKes)} />
                  <ChangeFact
                    label="Change"
                    value={formatKes(change.deltaKes)}
                    icon={change.deltaKes >= 0 ? ArrowUpRight : ArrowDownRight}
                  />
                </div>
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-semibold">Question residents should ask</p>
                  <p className="mt-1 text-muted-foreground">
                    Why did this allocation change, and what service delivery timeline should residents now expect?
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <aside className="space-y-4">
          <Card className="shadow-civic">
            <CardHeader>
              <CardTitle>Budget amendments</CardTitle>
              <CardDescription>Recent documents watched by the monitor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="rounded-md border p-3">
                  <p className="text-sm font-semibold">{document.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {document.type.replace("-", " ")} / {document.status.replace("-", " ")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary text-primary-foreground">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-bold uppercase">Public participation prompt</p>
              <p className="text-sm leading-6 text-primary-foreground/90">
                Ask officials to show the original line item, amended line item, reason for change, procurement status,
                and expected completion date.
              </p>
              <Button variant="secondary" className="w-full">
                Prepare question sheet
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function AlertMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-semibold uppercase text-white/65">{label}</p>
    </div>
  );
}

function MonitorCard({ icon: Icon, title, body }: { icon: ElementType; title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <Icon className="h-5 w-5 text-primary" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm leading-6 text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ risk }: { risk: SuspiciousChange["risk"] }) {
  const variant = risk === "high" ? "danger" : risk === "medium" ? "warning" : "success";
  return <Badge variant={variant}>{risk} risk</Badge>;
}

function ChangeFact({ label, value, icon: Icon }: { label: string; value: string; icon?: ElementType }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1 font-semibold">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {value}
      </p>
    </div>
  );
}
