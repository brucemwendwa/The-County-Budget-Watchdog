"use client";

import { AlertTriangle, CheckCircle2, Database, FileScan, ScanLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOCUMENT_TYPE_LABELS, type DetectedField, type ExtractionResult } from "@/lib/types";
import { formatKesExact } from "@/lib/utils";

const DETECTION_SOURCE_LABELS = {
  document: "Read from the document",
  filename: "Taken from the file name",
  user: "Set by you",
  "not-found": "Not found"
} as const;

/** What the pipeline read, what it could not read, and where the upload came to rest. */
export function ExtractionResultPanel({ result }: { result: ExtractionResult }) {
  const { document, analysis, extractionStrategy: strategy, lineItems } = result;
  const scanned = strategy.pdfType.startsWith("SCANNED");
  const hasRows = lineItems.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {hasRows ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            ) : scanned ? (
              <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            )}
            <div>
              <CardTitle className="text-base leading-snug">{document.title}</CardTitle>
              <CardDescription className="mt-1">{strategy.message}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{DOCUMENT_TYPE_LABELS[document.type]}</Badge>
            <Badge variant="secondary">{document.countyName}</Badge>
            <Badge variant="secondary">{document.fiscalYear}</Badge>
            <Badge variant="outline">{document.pages} pages</Badge>
            <Badge variant={document.detection.isScanned ? "warning" : "success"}>
              {document.detection.isScanned ? "Scanned PDF" : "Text based"}
            </Badge>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">What was detected</p>
            <dl className="grid gap-2 sm:grid-cols-2">
              <DetectionRow label="County" field={document.detection.county} display={document.countyName} />
              <DetectionRow label="Financial year" field={document.detection.fiscalYear} display={document.fiscalYear} />
              <DetectionRow
                label="Document type"
                field={document.detection.documentType}
                display={DOCUMENT_TYPE_LABELS[document.detection.documentType.value]}
              />
              <DetectionRow label="Title" field={document.detection.title} display={document.detection.title.value} />
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Overall detection confidence {Math.round(document.detection.overallConfidence * 100)}%.
            </p>
          </div>

          {result.storage ? (
            <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">
              <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {result.storage.message}
            </p>
          ) : null}

          {result.warnings.length > 0 ? (
            <ul className="space-y-1.5 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileScan className="h-4 w-4 text-primary" aria-hidden />
            Extraction strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <Row label="PDF classification" value={strategy.pdfType.replace(/_/g, " ")} />
            <Row
              label="Text layer"
              value={
                strategy.textLayerExtraction === "succeeded"
                  ? `Read (${strategy.textLayerCharCount.toLocaleString()} characters)`
                  : strategy.textLayerExtraction === "failed"
                    ? "Too little text to use"
                    : "Not available"
              }
            />
            <Row label="OCR required" value={strategy.ocrRequired ? "Yes" : "No"} />
            <Row label="OCR engine" value={strategy.recommendedEngine} />
            <Row label="OCR configured" value={strategy.ocrConfigured ? "Yes" : "No — credentials required"} />
            <Row label="Pipeline status" value={strategy.ocrProcessingStatus.replace(/_/g, " ")} />
          </dl>

          {strategy.ocrRequired && !strategy.ocrConfigured ? (
            <Badge variant="warning" className="mt-3">
              Scanned PDF detected. OCR configuration is required.
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      {hasRows ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Extracted budget rows</CardTitle>
            <CardDescription>{analysis.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Ward
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Department
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Row
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Allocation
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Page
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.slice(0, 25).map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{item.wardName ?? "County-wide"}</td>
                      <td className="px-3 py-2">{item.department}</td>
                      <td className="max-w-80 px-3 py-2">{item.project}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatKesExact(item.allocationKes)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.page}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lineItems.length > 25 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing the first 25 of {lineItems.length} rows.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function DetectionRow({
  label,
  field,
  display
}: {
  label: string;
  field: DetectedField<unknown>;
  display: string;
}) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{display}</dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">
        {DETECTION_SOURCE_LABELS[field.source]}
        {field.page ? ` · page ${field.page}` : ""} · {Math.round(field.confidence * 100)}% confidence
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2.5 py-2">
      <dt className="font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize">{value}</dd>
    </div>
  );
}
