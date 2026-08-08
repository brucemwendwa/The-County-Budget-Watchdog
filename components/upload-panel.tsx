"use client";

import { useState, type ChangeEvent } from "react";
import { upload } from "@vercel/blob/client";
import { FileUp, Loader2, UploadCloud } from "lucide-react";

import { ExtractionResultPanel } from "@/components/extraction-result-panel";
import { useLocationState } from "@/components/location-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { FINANCIAL_YEARS } from "@/lib/kenya";
import { DOCUMENT_TYPE_LABELS, type ExtractionResult } from "@/lib/types";

/**
 * Below this, a plain multipart POST is simpler and works on every host. Above it, Vercel's 4.5MB
 * function body cap kicks in, so the file goes to Blob storage first. Set well under the cap to
 * leave room for the form envelope.
 */
const DIRECT_POST_LIMIT = 4 * 1024 * 1024;

/**
 * Reads the API response as JSON, falling back to a readable message.
 *
 * A platform-level rejection never reaches the route, so it comes back as plain text such as
 * "Request Entity Too Large" — parsing that as JSON is what produced the old "Unexpected token 'R'".
 */
async function readPayload(response: Response): Promise<{ error?: string } | null> {
  const body = await response.text();

  try {
    return body ? JSON.parse(body) : null;
  } catch {
    return {
      error:
        response.status === 413
          ? "The server refused the upload as too large. Blob storage needs to be attached for files this size."
          : `The server returned an unexpected response (${response.status}).`
    };
  }
}

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

  async function submit() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = (await stageInBlob(file)) ?? (await postDirectly(file));
      const payload = await readPayload(response);
      if (!response.ok) throw new Error(payload?.error ?? "The document could not be processed.");
      setResult(payload as ExtractionResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The document could not be processed.");
    } finally {
      setLoading(false);
    }
  }

  const overrides = () => ({
    ...(countyCode ? { countyCode } : {}),
    ...(fiscalYear ? { fiscalYear } : {}),
    ...(documentType ? { documentType } : {})
  });

  /**
   * Sends the file to Vercel Blob first, then asks the API to read it from there.
   *
   * Vercel rejects a function request body over 4.5MB before the route ever runs, so anything
   * larger has to reach storage without passing through one. Returns null when there is no Blob
   * store — self-hosted has no such cap and posts the file directly instead.
   */
  async function stageInBlob(pdf: File) {
    if (pdf.size <= DIRECT_POST_LIMIT) return null;

    let blobUrl: string;
    try {
      const blob = await upload(pdf.name, pdf, {
        access: "public",
        contentType: "application/pdf",
        handleUploadUrl: "/api/upload/blob-token"
      });
      blobUrl = blob.url;
    } catch {
      // No Blob store configured, so fall through to the direct post.
      return null;
    }

    return fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blobUrl, fileName: pdf.name, ...overrides() })
    });
  }

  function postDirectly(pdf: File) {
    const form = new FormData();
    form.append("file", pdf);
    for (const [key, value] of Object.entries(overrides())) form.append(key, value);

    return fetch("/api/upload", { method: "POST", body: form });
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

          <Button onClick={submit} disabled={!file || loading} className="w-full">
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
