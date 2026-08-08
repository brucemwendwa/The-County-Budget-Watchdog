"use client";

import { useState, type ChangeEvent } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";

import { ExtractionResultPanel } from "@/components/extraction-result-panel";
import { useLocationState } from "@/components/location-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { FINANCIAL_YEARS } from "@/lib/kenya";
import { DOCUMENT_TYPE_LABELS, type ExtractionResult } from "@/lib/types";

/**
 * Uploads a budget PDF and shows what the pipeline actually managed to read.
 *
 * County, financial year, and document type are detected from the document itself; the pickers
 * below only override that detection when the reader knows better.
 */
export function UploadPanel() {
  const { hierarchy } = useLocationState();

  const [file, setFile] = useState<File | null>(null);
  const [countyCode, setCountyCode] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setError("");
  }

  async function upload() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    if (countyCode) form.append("countyCode", countyCode);
    if (fiscalYear) form.append("fiscalYear", fiscalYear);
    if (documentType) form.append("documentType", documentType);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "The document could not be processed.");
      setResult(payload as ExtractionResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The document could not be processed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UploadCloud className="h-5 w-5 text-primary" aria-hidden />
            Upload a budget PDF
          </CardTitle>
          <CardDescription>
            Text-based PDFs are read directly. Image-based scans need OCR, and the result will say so rather than
            returning empty figures.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 px-4 py-10 text-center transition-colors hover:border-primary/40 hover:bg-accent/40">
            <FileUp className="h-8 w-8 text-primary" aria-hidden />
            <span className="mt-3 font-semibold">{file ? file.name : "Choose a county budget PDF"}</span>
            <span className="mt-1 text-sm text-muted-foreground">PDF only, any size</span>
            <input className="sr-only" type="file" accept="application/pdf" onChange={onFileChange} />
          </label>

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Override what gets detected (optional)
            </summary>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Leave these blank and the county, financial year, and document type are read from the document&apos;s
              own pages, with a confidence score for each.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="County">
                <Select
                  value={countyCode}
                  onChange={(event) => setCountyCode(event.target.value)}
                  options={[
                    { label: "Detect from document", value: "" },
                    ...(hierarchy?.counties.map((county) => ({ label: county.name, value: county.code })) ?? [])
                  ]}
                />
              </Field>
              <Field label="Financial year">
                <Select
                  value={fiscalYear}
                  onChange={(event) => setFiscalYear(event.target.value)}
                  options={[
                    { label: "Detect from document", value: "" },
                    ...FINANCIAL_YEARS.map((year) => ({ label: year, value: year }))
                  ]}
                />
              </Field>
              <Field label="Document type">
                <Select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  options={[
                    { label: "Detect from document", value: "" },
                    ...Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
                  ]}
                />
              </Field>
            </div>
          </details>

          <Button onClick={upload} disabled={!file || loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {loading ? "Reading the document…" : "Upload and analyse"}
          </Button>

          {loading ? (
            <p role="status" className="text-center text-sm text-muted-foreground">
              Reading page by page so every figure can cite its source page. Large budgets take a while.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {result ? <ExtractionResultPanel result={result} /> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
