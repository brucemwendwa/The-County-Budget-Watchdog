"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileSearch,
  Filter,
  MapPin,
  Search,
  WalletCards
} from "lucide-react";

import { BudgetChat } from "@/components/budget-chat";
import { DepartmentBarChart, DevelopmentPieChart, WardAbsorptionChart } from "@/components/budget-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import type { BudgetDocument, DepartmentSummary, SuspiciousChange, WardAllocation } from "@/lib/types";
import { formatKes, percentage } from "@/lib/utils";

type ResidentData = {
  documents: BudgetDocument[];
  allocations: WardAllocation[];
  departments: DepartmentSummary[];
  changes: SuspiciousChange[];
};

export function ResidentDashboard({ data }: { data: ResidentData }) {
  const [wardQuery, setWardQuery] = useState("Kileleshwa");
  const [county, setCounty] = useState("all");
  const [department, setDepartment] = useState("all");

  const filteredAllocations = useMemo(() => {
    const normalizedWard = wardQuery.toLowerCase();
    return data.allocations.filter((allocation) => {
      const wardMatch =
        !normalizedWard ||
        allocation.ward.toLowerCase().includes(normalizedWard) ||
        allocation.county.toLowerCase().includes(normalizedWard) ||
        allocation.constituency.toLowerCase().includes(normalizedWard);
      const countyMatch = county === "all" || allocation.county === county;
      const departmentMatch = department === "all" || allocation.department === department;
      return countyMatch && wardMatch && departmentMatch;
    });
  }, [county, data.allocations, department, wardQuery]);

  const totalAllocated = filteredAllocations.reduce((sum, item) => sum + item.allocationKes, 0);
  const totalSpent = filteredAllocations.reduce((sum, item) => sum + item.expenditureKes, 0);
  const developmentTotal = filteredAllocations
    .filter((item) => item.budgetType === "development")
    .reduce((sum, item) => sum + item.allocationKes, 0);
  const riskCount = filteredAllocations.filter((item) => item.status !== "on-track").length;

  const departmentOptions = [
    { label: "All departments", value: "all" },
    ...Array.from(new Set(data.allocations.map((item) => item.department))).map((item) => ({
      label: item,
      value: item
    }))
  ];
  const countyOptions = [
    { label: "All counties", value: "all" },
    ...Array.from(new Set(data.allocations.map((item) => item.county))).map((item) => ({ label: item, value: item }))
  ];
  const wardOptions = [
    { label: "All wards", value: "" },
    ...Array.from(new Set(data.allocations.map((item) => item.ward))).map((item) => ({ label: item, value: item }))
  ];

  return (
    <main>
      <section className="border-b bg-white/62">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <Badge variant="secondary" className="w-fit">
              Kenya county budget intelligence
            </Badge>
            <div className="max-w-2xl space-y-3">
              <h1 className="text-3xl font-black leading-tight tracking-normal text-foreground sm:text-5xl">
                Know where your county money is going.
              </h1>
              <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                Select your county and ward, compare allocations with spending, and ask budget PDFs plain-language questions with
                page citations.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric icon={WalletCards} label="Tracked allocation" value={formatKes(totalAllocated)} />
              <Metric icon={CheckCircle2} label="Recorded spending" value={formatKes(totalSpent)} />
              <Metric icon={AlertTriangle} label="Items to question" value={`${riskCount}`} />
            </div>
          </motion.div>
          <BudgetChat />
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-[220px_1fr_260px]">
          <Select value={county} onChange={(event) => setCounty(event.target.value)} options={countyOptions} />
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Select className="pl-9" value={wardQuery} onChange={(event) => setWardQuery(event.target.value)} options={wardOptions} />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Select className="pl-9" value={department} onChange={(event) => setDepartment(event.target.value)} options={departmentOptions} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="shadow-civic">
            <CardHeader>
              <CardTitle>Allocations vs actual spending</CardTitle>
              <CardDescription>Department-level view across the demo county documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <DepartmentBarChart departments={data.departments} />
            </CardContent>
          </Card>
          <Card className="shadow-civic">
            <CardHeader>
              <CardTitle>Development vs recurrent</CardTitle>
              <CardDescription>Is money building visible services or running operations?</CardDescription>
            </CardHeader>
            <CardContent>
              <DevelopmentPieChart departments={data.departments} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-muted p-3">
                  <p className="font-semibold">{formatKes(developmentTotal)}</p>
                  <p className="text-muted-foreground">Development in current search</p>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="font-semibold">{percentage(totalSpent, totalAllocated)}%</p>
                  <p className="text-muted-foreground">Absorption rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="space-y-6">
            <Card className="shadow-civic">
              <CardHeader>
                <CardTitle>Ward absorption</CardTitle>
                <CardDescription>Low absorption means residents should ask for implementation timelines.</CardDescription>
              </CardHeader>
              <CardContent>
                <WardAbsorptionChart allocations={data.allocations} />
              </CardContent>
            </Card>
            <Card className="shadow-civic">
              <CardHeader>
                <CardTitle>County service map</CardTitle>
                <CardDescription>Demo map of wards with budget attention signals.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {data.allocations.slice(0, 6).map((allocation) => (
                    <div
                      key={allocation.id}
                      className="min-h-20 rounded-md border bg-muted p-3"
                    >
                      <p className="text-xs font-bold">{allocation.ward}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{allocation.department}</p>
                      <div
                        className={`mt-3 h-2 rounded-full ${
                          allocation.status === "on-track" ? "bg-primary" : "bg-destructive"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top funded projects</CardTitle>
                  <CardDescription>Largest allocations in the current filter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...filteredAllocations]
                    .sort((a, b) => b.allocationKes - a.allocationKes)
                    .slice(0, 3)
                    .map((allocation) => (
                      <SmallFact key={allocation.id} label={allocation.ward} value={formatKes(allocation.allocationKes)} />
                    ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Underfunded sectors</CardTitle>
                  <CardDescription>Low spending signals to follow up.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredAllocations
                    .filter((allocation) => allocation.status !== "on-track")
                    .slice(0, 3)
                    .map((allocation) => (
                      <SmallFact
                        key={allocation.id}
                        label={allocation.department}
                        value={`${percentage(allocation.expenditureKes, allocation.allocationKes)}% spent`}
                      />
                    ))}
                </CardContent>
              </Card>
            </div>
            {filteredAllocations.map((allocation) => (
              <Card key={allocation.id} className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="leading-6">{allocation.project}</CardTitle>
                      <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {allocation.ward}, {allocation.county} / Page {allocation.page}
                      </CardDescription>
                    </div>
                    <StatusBadge status={allocation.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SmallFact label="Allocated" value={formatKes(allocation.allocationKes)} />
                    <SmallFact label="Spent" value={formatKes(allocation.expenditureKes)} />
                    <SmallFact label="Confidence" value={`${Math.round(allocation.confidence * 100)}%`} />
                  </div>
                  <Progress value={percentage(allocation.expenditureKes, allocation.allocationKes)} />
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-1">{allocation.department}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{allocation.programme}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{allocation.budgetType}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-primary" />
                Recent documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.documents.map((document) => (
                <div key={document.id} className="flex items-start gap-3 rounded-md border p-3">
                  <Building2 className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">{document.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {document.county} / {document.fiscalYear} / {document.pages} pages
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Watchdog alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.changes.map((change) => (
                <div key={change.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{change.ward}</p>
                    <Badge variant={change.risk === "high" ? "danger" : "warning"}>{change.risk} risk</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{change.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-2xl font-black tracking-normal">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function SmallFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: WardAllocation["status"] }) {
  const variant = status === "on-track" ? "success" : status === "underspent" ? "warning" : "danger";
  return <Badge variant={variant}>{status.replace("-", " ")}</Badge>;
}
