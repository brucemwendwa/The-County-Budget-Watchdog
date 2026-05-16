import { CheckCircle2, CircleAlert, CircleHelp, FileText, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetLeakReport, BudgetLeakSignal, LeakRisk } from "@/lib/types";
import { formatKes } from "@/lib/utils";

export function BudgetLeakDetector({ report }: { report: BudgetLeakReport }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline">Budget Leak Detector</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-normal">Compare budget promises with spending reality.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Compares approved budget, supplementary budget, expenditure report, and implementation report for leak
            signals residents can question.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <RiskCount risk="red" count={report.counts.red} />
          <RiskCount risk="yellow" count={report.counts.yellow} />
          <RiskCount risk="green" count={report.counts.green} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {report.comparedDocuments.map((document) => (
          <div key={`${document.title}-${document.type}`} className="rounded-lg border bg-card p-3 shadow-sm">
            <FileText className="h-4 w-4 text-primary" />
            <p className="mt-2 text-sm font-semibold">{document.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {document.type.replace("-", " ")} / {document.fiscalYear} / {document.pages} pages
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {report.signals.map((signal) => (
          <LeakRiskCard key={signal.id} signal={signal} />
        ))}
      </div>
    </section>
  );
}

function LeakRiskCard({ signal }: { signal: BudgetLeakSignal }) {
  const tone = getRiskTone(signal.risk);
  const Icon = signal.risk === "red" ? ShieldAlert : signal.risk === "yellow" ? CircleAlert : CheckCircle2;

  return (
    <Card className={`border-l-4 ${tone.border} shadow-sm`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base leading-6">
              <Icon className={`h-5 w-5 ${tone.icon}`} />
              {signal.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {signal.county} / {signal.wardOrSector} / {signal.department}
            </CardDescription>
          </div>
          <Badge variant={tone.badge}>{signal.risk}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="leading-6 text-muted-foreground">{signal.summary}</p>
        <div className={`${tone.bg} rounded-md p-3`}>
          <p className="text-xs font-bold uppercase text-muted-foreground">Amount at issue</p>
          <p className="mt-1 text-lg font-black">{signal.amountKes === null ? "Missing" : formatKes(signal.amountKes)}</p>
        </div>
        <div>
          <p className="font-semibold">Evidence</p>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {signal.evidence.slice(0, 2).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md bg-muted p-3">
          <p className="flex items-center gap-2 font-semibold">
            <CircleHelp className="h-4 w-4 text-primary" />
            Resident question
          </p>
          <p className="mt-1 leading-6 text-muted-foreground">{signal.questionResidentsShouldAsk}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskCount({ risk, count }: { risk: LeakRisk; count: number }) {
  const tone = getRiskTone(risk);
  return (
    <div className={`${tone.bg} min-w-20 rounded-md px-3 py-2`}>
      <p className="text-lg font-black">{count}</p>
      <p className="text-xs font-bold uppercase text-muted-foreground">{risk}</p>
    </div>
  );
}

function getRiskTone(risk: LeakRisk) {
  if (risk === "red") {
    return { border: "border-l-rose-600", bg: "bg-rose-50", icon: "text-rose-700", badge: "danger" as const };
  }
  if (risk === "yellow") {
    return { border: "border-l-amber-500", bg: "bg-amber-50", icon: "text-amber-700", badge: "warning" as const };
  }
  return { border: "border-l-emerald-600", bg: "bg-emerald-50", icon: "text-emerald-700", badge: "success" as const };
}
