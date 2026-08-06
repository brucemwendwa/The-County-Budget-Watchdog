import { NextResponse } from "next/server";

import { parseBudgetDocument } from "@/lib/parser";
import { saveExtractionResult } from "@/lib/db";
import { resolveAccess } from "@/lib/auth";
import type { County, StorageStatus } from "@/lib/types";
import { storePdf } from "@/lib/storage";
import { readLocalExtractions, saveLocalExtraction } from "@/lib/local-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = resolveAccess(request);

  try {
    const form = await request.formData();
    const file = form.get("file");
    const county = (form.get("county") ?? "Nairobi") as County;
    const fiscalYear = String(form.get("fiscalYear") ?? "2025/2026");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF uploads are supported" }, { status: 400 });
    }

    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "PDF must be 25MB or smaller." }, { status: 400 });
    }

    const result = await parseBudgetDocument({
      file,
      county,
      fiscalYear,
      allowOcr: access.allowPaidServices
    });

    // Cloud Storage, Document AI, and the database all cost money, so public callers get the local
    // extraction path only. The result still returns, labelled with where it actually landed.
    let pdfArchived = false;
    let databasePersisted = false;

    if (access.allowPaidServices) {
      const storagePath = await storePdf(file, result.document.id);
      if (storagePath) {
        result.document.sourceUrl = storagePath;
        pdfArchived = true;
      }

      const persistence = await saveExtractionResult(result);
      databasePersisted = persistence.persisted;
    }

    await saveLocalExtraction(result);
    result.storage = describeStorage({ tier: access.tier, pdfArchived, databasePersisted });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Upload failed. Check storage, OCR, and database credentials, then try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(await readLocalExtractions());
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
      message: "PDF archived to Cloud Storage and extraction saved to the database."
    };
  }

  const ephemeralNote =
    process.env.VERCEL === "1"
      ? "This extraction is kept in a temporary cache that clears when the deployment restarts."
      : "This extraction is kept in a local .runtime cache, not a database.";

  if (tier === "public") {
    return {
      pdfArchived,
      databasePersisted,
      message: `${ephemeralNote} PDF archiving and database storage run for admin uploads only.`
    };
  }

  return {
    pdfArchived,
    databasePersisted,
    message: `${ephemeralNote} Set DATABASE_URL and GCS_BUCKET to store uploads permanently.`
  };
}
