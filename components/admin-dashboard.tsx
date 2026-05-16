"use client";

import { AlertTriangle, BellRing, Check, Database, FileText, RadioTower, ShieldAlert } from "lucide-react";
import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";

import { UploadPanel } from "@/components/upload-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetDocument, ExtractionResult, SmsDigest, SuspiciousChange, WardAllocation } from "@/lib/types";
import { formatKes } from "@/lib/utils";

type AdminData = {
  documents: BudgetDocument[];
  allocations: WardAllocation[];
  changes: SuspiciousChange[];
  digests: SmsDigest[];
};

export function AdminDashboard({ data }: { data: AdminData }) {
  const [digests, setDigests] = useState(data.digests);
  const [monitorMessage, setMonitorMessage] = useState("Ready");
  const [uploadedResults, setUploadedResults] = useState<ExtractionResult[]>([]);

  useEffect(() => {
    fetch("/api/upload")
      .then((response) => response.json())
      .then((payload: { results?: ExtractionResult[] }) => setUploadedResults(payload.results ?? []))
      .catch(() => setUploadedResults([]));
  }, []);

  const documents = useMemo(
    () => [...uploadedResults.map((result) => result.document), ...data.documents],
    [data.documents, uploadedResults]
  );
  const allocations = useMemo(
    () => [...uploadedResults.flatMap((result) => result.allocations), ...data.allocations],
    [data.allocations, uploadedResults]
  );

  async function approveDigest(digestId: string) {
    await fetch("/api/sms/digests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digestId, recipients: ["+254700000000"] })
    });

    setDigests((items) => items.map((item) => (item.id === digestId ? { ...item, status: "approved" as const } : item)));
  }

  async function runMonitor() {
    const response = await fetch("/api/monitor");
    const payload = (await response.json()) as { alerts: SuspiciousChange[]; checkedAt: string };
    setMonitorMessage(`${payload.alerts.length} alerts checked at ${new Date(payload.checkedAt).toLocaleTimeString()}`);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline">County officer console</Badge>
          <h1 className="mt-3 text-3xl font-black tracking-normal">Admin dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Upload budgets, review extraction quality, approve resident digests, and monitor suspicious amendments.
          </p>
        </div>
        <Button variant="secondary" onClick={runMonitor}>
          <RadioTower className="h-4 w-4" />
          Run gazette monitor
        </Button>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{monitorMessage}</p>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric icon={FileText} label="Documents" value={`${documents.length}`} />
        <AdminMetric icon={Database} label="Extracted rows" value={`${allocations.length}`} />
        <AdminMetric icon={ShieldAlert} label="Budget alerts" value={`${data.changes.length}`} />
        <AdminMetric icon={BellRing} label="SMS drafts" value={`${data.digests.length}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <UploadPanel onUploaded={(result) => setUploadedResults((items) => [result, ...items])} />
        <Card className="shadow-civic">
          <CardHeader>
            <CardTitle>Extraction review queue</CardTitle>
            <CardDescription>Human approval before records become public and searchable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{document.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {document.county} / {document.fiscalYear} / {document.pages} pages
                  </p>
                </div>
                <Badge variant={document.status === "needs-attention" ? "danger" : "secondary"}>
                  {document.status.replace("-", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Extracted tables preview</CardTitle>
            <CardDescription>Sample normalized rows from PDF tables before approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allocations.slice(0, 8).map((allocation) => (
              <div key={allocation.id} className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{allocation.project}</p>
                  <p className="text-muted-foreground">
                    {allocation.department} / {allocation.programme} / Page {allocation.page}
                  </p>
                </div>
                <p className="font-black">{formatKes(allocation.allocationKes)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Fast indicators for county reviewers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <AdminFact
              icon={Database}
              label="Development rows"
              value={`${allocations.filter((item) => item.budgetType === "development").length}`}
            />
            <AdminFact
              icon={ShieldAlert}
              label="Needs follow-up"
              value={`${allocations.filter((item) => item.status !== "on-track").length}`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Suspicious budget changes
            </CardTitle>
            <CardDescription>Flagged by amendment comparison, low absorption, and unexplained reallocations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.changes.map((change) => (
              <div key={change.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{change.department} / {change.ward}</p>
                  <Badge variant={change.risk === "high" ? "danger" : "warning"}>{change.risk}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{change.description}</p>
                <p className="mt-2 text-sm font-semibold">
                  {formatKes(change.beforeKes)} to {formatKes(change.afterKes)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SMS digest approvals</CardTitle>
            <CardDescription>Keep language simple before sending through Africa&apos;s Talking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {digests.map((digest) => (
              <div key={digest.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">
                    {digest.ward} / {digest.language}
                  </p>
                  <Badge variant={digest.status === "approved" ? "success" : "warning"}>{digest.status}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{digest.body}</p>
                <Button className="mt-3" size="sm" variant="outline" onClick={() => approveDigest(digest.id)}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function AdminMetric({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className="h-5 w-5 text-primary" />
        <p className="mt-3 text-2xl font-black">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function AdminFact({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
