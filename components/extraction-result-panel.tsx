"use client";

import { AlertTriangle, CheckCircle2, Database, FileScan, ScanLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ExtractionResult } from "@/lib/types";
import { formatKes } from "@/lib/utils";

function legacyStrategy(result: ExtractionResult): ExtractionResult["extractionStrategy"] {
  const scanned = result.warnings.some((warning) => /scanned|ocr|text layer/i.test(warning));
  return {
    pdfType: scanned ? "SCANNED_PDF_REQUIRES_OCR" : "TEXT_PDF",
    textLayerExtraction: scanned ? "unavailable" : "succeeded",
    textLayerCharCount: 0,
    ocrRequired: scanned,
    recommendedEngine: "Google Document AI OCR",
    ocrConfigured: false,
    ocrProcessingStatus: scanned ? "waiting_for_configuration" : "not_required",
    processingStatus: "Unknown (legacy upload)",
    message: result.extractedTextPreview || "Upload processed before extraction strategy metadata was available."
  };
}

export function ExtractionResultPanel({ result }: { result: ExtractionResult }) {
  const strategy = result.extractionStrategy ?? legacyStrategy(result);
  const isScanned = strategy.pdfType.startsWith("SCANNED");
  const hasRows = result.allocations.length > 0;
  const ocrComplete = strategy.pdfType === "SCANNED_PDF_OCR_COMPLETE" && hasRows;

  return (
    <div className="space-y-4 rounded-md border bg-muted/50 p-4 text-sm">
      <div className="flex items-start gap-3">
        {hasRows ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        ) : isScanned ? (
          <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="space-y-2">
          <p className="font-semibold leading-6">{strategy.message}</p>
          {isScanned && !hasRows ? (
            <p className="text-muted-foreground">{strategy.pdfType.replace(/_/g, " ")}</p>
          ) : null}
          {hasRows ? (
            <p className="font-medium text-primary">
              {result.allocations.length} structured budget rows extracted from {result.document.title}
            </p>
          ) : isScanned ? (
            <p className="font-medium text-amber-800 dark:text-amber-200">
              No structured budget rows were extracted because this is a scanned PDF. OCR must be enabled to read
              image-based tables.
            </p>
          ) : (
            <p className="text-muted-foreground">
              No structured budget rows were extracted from the text layer.
            </p>
          )}
        </div>
      </div>

      <ExtractionStrategyCard strategy={strategy} />

      {result.storage ? (
        <p className="flex items-start gap-2 rounded-md border border-dashed bg-background p-3 text-xs leading-5 text-muted-foreground">
          <Database className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.storage.message}</span>
        </p>
      ) : null}

      {result.extractedTextPreview && (hasRows || ocrComplete || strategy.textLayerCharCount > 0) ? (
        <p className="rounded-md bg-background p-3 text-xs leading-5 text-muted-foreground">
          {result.extractedTextPreview}
        </p>
      ) : null}

      {result.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {hasRows ? (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2">Ward</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Project / row</th>
                <th className="px-3 py-2">Allocation</th>
                <th className="px-3 py-2">Page</th>
              </tr>
            </thead>
            <tbody>
              {result.allocations.slice(0, 20).map((allocation) => (
                <tr key={allocation.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{allocation.ward}</td>
                  <td className="px-3 py-2">{allocation.department}</td>
                  <td className="max-w-80 px-3 py-2">{allocation.project}</td>
                  <td className="px-3 py-2 font-semibold">{formatKes(allocation.allocationKes)}</td>
                  <td className="px-3 py-2">{allocation.page}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ExtractionStrategyCard({ strategy }: { strategy: ExtractionResult["extractionStrategy"] }) {
  const textLayerLabel =
    strategy.textLayerExtraction === "succeeded"
      ? "Succeeded"
      : strategy.textLayerExtraction === "failed"
        ? "Failed (insufficient text)"
        : "Unavailable";

  return (
    <div className="rounded-md border bg-background p-4">
      <p className="mb-3 flex items-center gap-2 font-semibold">
        <FileScan className="h-4 w-4 text-primary" />
        Extraction strategy
      </p>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <StrategyRow label="PDF classification" value={strategy.pdfType.replace(/_/g, " ")} />
        <StrategyRow label="Text layer extraction" value={textLayerLabel} />
        <StrategyRow label="Text layer characters" value={String(strategy.textLayerCharCount)} />
        <StrategyRow label="OCR required" value={strategy.ocrRequired ? "Yes" : "No"} />
        <StrategyRow label="Recommended engine" value={strategy.recommendedEngine} />
        <StrategyRow
          label="OCR configured"
          value={strategy.ocrConfigured ? "Yes" : "No — credentials required"}
        />
        <StrategyRow label="Processing status" value={strategy.processingStatus} />
        <StrategyRow label="OCR pipeline status" value={strategy.ocrProcessingStatus.replace(/_/g, " ")} />
      </dl>
      {strategy.ocrProcessingStatus === "requires_admin_key" ? (
        <Badge variant="warning" className="mt-3">
          OCR runs on admin uploads only
        </Badge>
      ) : strategy.ocrRequired && !strategy.ocrConfigured ? (
        <Badge variant="warning" className="mt-3">
          Waiting for Document AI configuration
        </Badge>
      ) : null}
    </div>
  );
}

function StrategyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-1.5">
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
