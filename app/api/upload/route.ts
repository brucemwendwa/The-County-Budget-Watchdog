import { NextResponse } from "next/server";

import { parseBudgetDocument } from "@/lib/parser";
import { saveExtractionResult } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { County } from "@/lib/types";
import { storePdf } from "@/lib/storage";
import { readLocalExtractions, saveLocalExtraction } from "@/lib/local-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const county = (form.get("county") ?? "Nairobi") as County;
  const fiscalYear = String(form.get("fiscalYear") ?? "2025/2026");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
  }

  const result = await parseBudgetDocument({ file, county, fiscalYear });
  const storagePath = await storePdf(file, result.document.id);
  if (storagePath) {
    result.document.sourceUrl = storagePath;
  }
  await saveExtractionResult(result);
  await saveLocalExtraction(result);

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json(await readLocalExtractions());
}
