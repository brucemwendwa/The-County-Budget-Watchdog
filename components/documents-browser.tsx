"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { DocumentList } from "@/components/dashboard/document-list";
import { LocationPickers } from "@/components/location-pickers";
import { useLocationState } from "@/components/location-provider";
import { useInsights } from "@/components/use-insights";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/types";

/** The document library, filtered by the shared location selection. */
export function DocumentsBrowser() {
  const { selection } = useLocationState();
  const { data, loading, error } = useInsights(selection);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "">("");

  const documents = useMemo(() => {
    if (!data) return [];
    return typeFilter ? data.documents.filter((document) => document.type === typeFilter) : data.documents;
  }, [data, typeFilter]);

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <LocationPickers fieldsClassName="sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document type</span>
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as DocumentType | "")}
              options={[
                { label: "All document types", value: "" },
                ...Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
              ]}
            />
          </label>
        </LocationPickers>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading documents…
        </p>
      ) : error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length === 1 ? "" : "s"} for {data?.place ?? "Kenya"}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/upload">
                <Upload className="h-4 w-4" />
                Add a document
              </Link>
            </Button>
          </div>
          <DocumentList documents={documents} place={data?.place ?? "Kenya"} />
        </>
      )}
    </div>
  );
}
