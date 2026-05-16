"use client";

import { ChangeEvent, useState } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { ExtractionResult } from "@/lib/types";
import { formatKes } from "@/lib/utils";

export function UploadPanel({ onUploaded }: { onUploaded?: (result: ExtractionResult) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [county, setCounty] = useState("Nairobi");
  const [fiscalYear, setFiscalYear] = useState("2025/2026");

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setError("");
  }

  async function upload() {
    if (!file) {
      return;
    }

    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("county", county);
    form.append("fiscalYear", fiscalYear);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }
      const extraction = payload as ExtractionResult;
      setResult(extraction);
      onUploaded?.(extraction);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
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
        <CardDescription>Document AI runs first; the local parser fallback keeps the demo moving.</CardDescription>
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
              { label: "Kiambu", value: "Kiambu" }
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
          <span className="mt-1 text-sm text-muted-foreground">Approved budget, supplementary budget, or report</span>
          <input className="sr-only" type="file" accept="application/pdf" onChange={onFileChange} />
        </label>
        <Button onClick={upload} disabled={!file || loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          Extract tables and vote heads
        </Button>
        {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p> : null}
        {result ? (
          <div className="space-y-4 rounded-md bg-muted p-3 text-sm">
            <div>
              <p className="font-semibold">{result.allocations.length} structured records extracted from {result.document.title}</p>
              <p className="mt-1 text-muted-foreground">{result.extractedTextPreview}</p>
            </div>
            {result.warnings.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {result.allocations.length > 0 ? (
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
        ) : null}
      </CardContent>
    </Card>
  );
}
