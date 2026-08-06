"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, ScanLine, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS, type BudgetDocument } from "@/lib/types";

const STATUS_ICON = {
  processed: CheckCircle2,
  "no-rows-extracted": AlertTriangle,
  "needs-ocr": ScanLine,
  "ocr-failed": AlertTriangle
} as const;

const STATUS_VARIANT = {
  processed: "success",
  "no-rows-extracted": "warning",
  "needs-ocr": "warning",
  "ocr-failed": "danger"
} as const;

/** The document library for a place. Each card states how far processing actually got. */
export function DocumentList({ documents, place }: { documents: BudgetDocument[]; place: string }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={`No budget documents for ${place} yet`}
        description="Nothing has been processed for this area. Upload a county budget, finance bill, or implementation report to build its library."
        action={
          <Button asChild size="sm">
            <Link href="/upload">
              <Upload className="h-4 w-4" />
              Upload a PDF
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {documents.map((document) => {
        const Icon = STATUS_ICON[document.status];
        return (
          <li key={document.id}>
            <Card className="h-full">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{document.title}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{DOCUMENT_TYPE_LABELS[document.type]}</Badge>
                  <Badge variant="secondary">{document.fiscalYear}</Badge>
                  <Badge variant={STATUS_VARIANT[document.status]} className="flex items-center gap-1">
                    <Icon className="h-3 w-3" aria-hidden />
                    {DOCUMENT_STATUS_LABELS[document.status]}
                  </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <Detail label="Pages" value={String(document.pages)} />
                  <Detail label="PDF type" value={document.detection.isScanned ? "Scanned" : "Text based"} />
                  <Detail
                    label="Detection confidence"
                    value={`${Math.round(document.detection.overallConfidence * 100)}%`}
                  />
                  <Detail label="Added" value={new Date(document.uploadedAt).toLocaleDateString()} />
                </dl>

                {document.sourceUrl ? (
                  <p className="truncate text-xs text-muted-foreground">Archived: {document.sourceUrl}</p>
                ) : null}
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}
