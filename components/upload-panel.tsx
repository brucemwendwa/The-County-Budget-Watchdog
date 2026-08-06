"use client";

import { ChangeEvent, useState } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";

import { ExtractionResultPanel } from "@/components/extraction-result-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { ExtractionResult } from "@/lib/types";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

const STAGE_MESSAGES = [
  "Uploading document...",
  "Checking PDF text layer...",
  "Scanned PDF detected...",
  "OCR required...",
  "Running OCR...",
  "Extracting budget tables...",
  "Creating searchable chunks...",
  "Ready for AI questions."
] as const;

export function UploadPanel({ onUploaded }: { onUploaded?: (result: ExtractionResult) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [error, setError] = useState("");
  const [county, setCounty] = useState("Nairobi");
  const [fiscalYear, setFiscalYear] = useState("2025/2026");

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setError("");
    setProcessingStage("");
  }

  function advanceStage(index: number) {
    const message = STAGE_MESSAGES[index];
    if (message) {
      setProcessingStage(message);
    }
  }

  async function upload() {
    if (!file) {
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setError("PDF must be 25MB or smaller.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    advanceStage(0);

    const form = new FormData();
    form.append("file", file);
    form.append("county", county);
    form.append("fiscalYear", fiscalYear);

    const stageTimer = window.setInterval(() => {
      setProcessingStage((current) => {
        const index = STAGE_MESSAGES.indexOf(current as (typeof STAGE_MESSAGES)[number]);
        const next = STAGE_MESSAGES[Math.min(index + 1, 3)] ?? current;
        return next;
      });
    }, 2200);

    try {
      advanceStage(1);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form
      });

      window.clearInterval(stageTimer);

      const payload = (await response.json()) as ExtractionResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }

      const extraction = payload as ExtractionResult;
      const strategy = extraction.extractionStrategy;

      if (strategy.ocrProcessingStatus === "requires_admin_key") {
        setProcessingStage("Scanned PDF — OCR runs on admin uploads only.");
      } else if (strategy.pdfType === "SCANNED_PDF_REQUIRES_OCR") {
        setProcessingStage(
          strategy.ocrConfigured ? "Running OCR..." : "Waiting for Document AI configuration..."
        );
      } else if (strategy.ocrProcessingStatus === "running" || strategy.pdfType === "SCANNED_PDF_OCR_FAILED") {
        setProcessingStage(strategy.processingStatus);
      } else if (strategy.ocrProcessingStatus === "completed") {
        advanceStage(5);
        advanceStage(6);
        setProcessingStage(
          extraction.allocations.length > 0 ? "Ready for AI questions." : strategy.processingStatus
        );
      } else {
        advanceStage(5);
        setProcessingStage(
          extraction.allocations.length > 0 ? "Ready for AI questions." : strategy.processingStatus
        );
      }

      setResult(extraction);
      onUploaded?.(extraction);
    } catch (caught) {
      window.clearInterval(stageTimer);
      setError(caught instanceof Error ? caught.message : "Upload failed");
      setProcessingStage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-civic">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          Upload budget PDF
        </CardTitle>
        <CardDescription>
          Text-based PDFs are parsed directly. Scanned image PDFs require Google Document AI OCR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={county}
            onChange={(event) => setCounty(event.target.value)}
            options={[
              { label: "Nairobi", value: "Nairobi" },
              { label: "Makueni", value: "Makueni" },
              { label: "Kisumu", value: "Kisumu" },
              { label: "Kiambu", value: "Kiambu" },
              { label: "Machakos", value: "Machakos" }
            ]}
          />
          <Select
            value={fiscalYear}
            onChange={(event) => setFiscalYear(event.target.value)}
            options={[
              { label: "2025/2026", value: "2025/2026" },
              { label: "2024/2025", value: "2024/2025" },
              { label: "2023/2024", value: "2023/2024" }
            ]}
          />
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 px-4 py-8 text-center">
          <FileUp className="h-8 w-8 text-primary" />
          <span className="mt-3 font-semibold">{file ? file.name : "Choose a county budget PDF"}</span>
          <span className="mt-1 text-sm text-muted-foreground">
            Programme-based budgets, Finance Bills, or reports (PDF, max 25MB)
          </span>
          <input className="sr-only" type="file" accept="application/pdf" onChange={onFileChange} />
        </label>
        <Button onClick={upload} disabled={!file || loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {loading ? "Processing..." : "Upload and analyze"}
        </Button>
        {processingStage ? (
          <p className="text-sm font-medium text-primary" role="status">
            {processingStage}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {result ? <ExtractionResultPanel result={result} /> : null}
      </CardContent>
    </Card>
  );
}
