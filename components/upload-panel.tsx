"use client";

import { ChangeEvent, useState } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExtractionResult } from "@/lib/types";

export function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
  }

  async function upload() {
    if (!file) {
      return;
    }

    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("county", "Nairobi");
    form.append("fiscalYear", "2025/2026");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: form
    });
    const payload = (await response.json()) as ExtractionResult;
    setResult(payload);
    setLoading(false);
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
        {result ? (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-semibold">{result.allocations.length} structured records extracted</p>
            <p className="mt-1 text-muted-foreground">{result.extractedTextPreview}</p>
            {result.warnings.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
