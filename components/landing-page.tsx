"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Bot, FileUp, Landmark, MessageSquareText, RadioTower, ShieldCheck } from "lucide-react";

import { DepartmentBarChart } from "@/components/budget-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartmentSummary, SmsDigest } from "@/lib/types";

type LandingPageProps = {
  departments: DepartmentSummary[];
  smsPreview: SmsDigest;
};

export function LandingPage({ departments, smsPreview }: LandingPageProps) {
  return (
    <main>
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col justify-center space-y-6"
          >
            <Badge variant="secondary" className="w-fit">
              Premium civic intelligence for Kenya
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-foreground sm:text-6xl">
                Understand your county budget in seconds.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Upload a county budget PDF, ask a plain-language question, and get source-backed answers residents can
                act on.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild className="h-12 justify-between">
                <Link href="/admin">
                  <span className="flex items-center gap-2">
                    <FileUp className="h-4 w-4" />
                    Upload PDF
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 justify-between">
                <Link href="/chat">
                  <span className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Ask budget question
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TrustIndicator icon={ShieldCheck} label="Page citations" />
              <TrustIndicator icon={Landmark} label="Public finance sources" />
              <TrustIndicator icon={BadgeCheck} label="Human SMS approval" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="space-y-4"
          >
            <Card className="overflow-hidden border-black/10 shadow-civic">
              <CardHeader className="bg-foreground text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-white">County signal room</CardTitle>
                    <CardDescription className="text-white/70">Nairobi demo intelligence</CardDescription>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">Live demo</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                <DepartmentBarChart departments={departments} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <SignalMetric label="Tracked" value="KES 206M" />
                  <SignalMetric label="Alerts" value="2" />
                  <SignalMetric label="SMS ready" value="2" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary text-primary-foreground shadow-civic">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <MessageSquareText className="mt-1 h-5 w-5" />
                  <div>
                    <p className="text-sm font-bold uppercase">SMS digest preview</p>
                    <p className="mt-2 text-sm leading-6 text-primary-foreground/90">{smsPreview.body}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
        <FeatureCard
          icon={FileUp}
          title="Document AI pipeline"
          body="Extract vote heads, ward projects, tables, fiscal years, recurrent spending, and development spending."
        />
        <FeatureCard
          icon={Bot}
          title="Grounded AI answers"
          body="Every answer includes simple explanation, page references, confidence, resident meaning, and next action."
        />
        <FeatureCard
          icon={RadioTower}
          title="Gazette monitoring"
          body="Watch amendments and gazette notices for unexplained reallocations, removed projects, and vague line items."
        />
      </section>
    </main>
  );
}

function TrustIndicator({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-3 text-sm font-semibold shadow-sm">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </div>
  );
}

function SignalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: ElementType; title: string; body: string }) {
  return (
    <Card className="shadow-sm">
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
