"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { ArrowRight, BookOpen, Bot, FileUp, Landmark, MapPinned, ShieldCheck } from "lucide-react";

import { CountyGrid } from "@/components/county-grid";
import { MaasaiDivider } from "@/components/maasai-divider";
import { ResponsibleAiNote } from "@/components/responsible-ai-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CITIZEN_QUESTIONS } from "@/lib/counties";

export function LandingPage() {
  return (
    <main>
      <section className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Badge variant="secondary" className="mb-4 w-fit">
            Kenyan civic-tech · public finance intelligence
          </Badge>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Understand county budgets from county to ward level.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Explore official county budget documents, track allocations, ask AI questions, and verify answers from
                source pages.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="h-12">
                  <Link href="/insights">
                    Explore Counties
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12">
                  <Link href="/upload">
                    Upload Budget PDF
                    <FileUp className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Built to support public participation using official county finance documents.
              </p>
            </div>
            <Card className="border-primary/15 shadow-civic">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-primary" />
                  How it works
                </CardTitle>
                <CardDescription>County → Sub-county → Ward → Budget insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
                <Step n={1} text="Select a county with analyzed or demo budget data." />
                <Step n={2} text="Drill down to sub-county and ward for local allocations." />
                <Step n={3} text="Review source documents, sector charts, and items needing clarification." />
                <Step n={4} text="Ask AI and verify every answer against cited pages." />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Select a county</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Not all 47 counties are fully analyzed yet. Demo counties are clearly labeled.
            </p>
          </div>
          <Badge variant="outline">47 counties · honest status badges</Badge>
        </div>
        <CountyGrid />
      </section>

      <MaasaiDivider className="mx-auto max-w-3xl px-4" />

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <FeatureCard
          icon={Landmark}
          title="Official documents"
          body="County Budget Estimates, Finance Bills, supplementary budgets, and implementation reports with source links."
        />
        <FeatureCard
          icon={Bot}
          title="Grounded AI answers"
          body="Direct answers with source citations, page references, confidence levels, and resident-friendly explanations."
        />
        <FeatureCard
          icon={BookOpen}
          title="Public participation"
          body="Suggested questions citizens can ask MCAs, county treasury, and public participation forums."
        />
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Questions citizens can ask</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Strengthen civic engagement with practical questions grounded in budget documents.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CITIZEN_QUESTIONS.map((question) => (
              <div key={question} className="rounded-lg border bg-card p-4 text-sm font-medium shadow-sm">
                {question}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ResponsibleAiNote />
      </section>
    </main>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <p>{text}</p>
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
