import { NextResponse } from "next/server";

import { resolveAccess } from "@/lib/auth";
import { saveExtractionResult } from "@/lib/db";
import { parseBudgetDocument } from "@/lib/parser";
import { saveExtraction } from "@/lib/store";
import { storePdf } from "@/lib/storage";
import { DOCUMENT_TYPE_LABELS, type DocumentType, type StorageStatus } from "@/lib/types";

export const runtime = "nodejs";
/** Large PDFs take time to read page by page. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const access = resolveAccess(request);

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF uploads are supported." }, { status: 400 });
    }

    // No size ceiling: county budget documents run to hundreds of pages and the reader is expected
    // to chew through whatever it is given. The only limits left are the host's own body limit and
    // available memory, since formData() buffers the upload before parsing starts.
    const result = await parseBudgetDocument({
      file,
      countyCode: optionalString(form.get("countyCode")),
      fiscalYear: optionalString(form.get("fiscalYear")),
      documentType: optionalDocumentType(form.get("documentType")),
      allowOcr: access.allowPaidServices
    });

    // Object storage, Document AI, and the database all cost money, so public callers get the free
    // extraction path only. The result still returns, labelled with where it actually landed.
    let pdfArchived = false;
    let databasePersisted = false;

    if (access.allowPaidServices) {
      const storagePath = await storePdf(file, result.document.id);
      if (storagePath) {
        result.document.sourceUrl = storagePath;
        pdfArchived = true;
      }
      databasePersisted = (await saveExtractionResult(result)).persisted;
    }

    await saveExtraction(result);
    result.storage = describeStorage({ tier: access.tier, pdfArchived, databasePersisted });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json(
      { error: "The document could not be processed. Check the file and try again." },
      { status: 500 }
    );
  }
}

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

function optionalDocumentType(value: FormDataEntryValue | null): DocumentType | undefined {
  const text = optionalString(value);
  return text && text in DOCUMENT_TYPE_LABELS ? (text as DocumentType) : undefined;
}

function describeStorage({
  tier,
  pdfArchived,
  databasePersisted
}: {
  tier: ReturnType<typeof resolveAccess>["tier"];
  pdfArchived: boolean;
  databasePersisted: boolean;
}): StorageStatus {
  if (databasePersisted && pdfArchived) {
    return {
      pdfArchived,
      databasePersisted,
      message: "The PDF was archived to object storage and the extraction was saved to the database."
    };
  }

  const ephemeral =
    process.env.VERCEL === "1"
      ? "This extraction is held in a temporary cache that clears when the deployment restarts."
      : "This extraction is held in a local .runtime cache, not a database.";

  if (tier === "public") {
    return {
      pdfArchived,
      databasePersisted,
      message: `${ephemeral} Archiving the PDF and writing to the database run for administrator uploads only.`
    };
  }

  return {
    pdfArchived,
    databasePersisted,
    message: `${ephemeral} Set DATABASE_URL and GCS_BUCKET to store uploads permanently.`
  };
}
