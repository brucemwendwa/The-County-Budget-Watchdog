import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { ExtractionResult, WardAllocation } from "@/lib/types";

const runtimeDir = path.join(process.cwd(), ".runtime");
const extractionFile = path.join(runtimeDir, "extractions.json");

type StoredExtractions = {
  results: ExtractionResult[];
};

export async function saveLocalExtraction(result: ExtractionResult) {
  const store = await readLocalExtractions();
  const nextResults = [result, ...store.results.filter((item) => item.document.id !== result.document.id)].slice(0, 25);

  await mkdir(runtimeDir, { recursive: true });
  await writeFile(extractionFile, JSON.stringify({ results: nextResults }, null, 2), "utf8");

  return result;
}

export async function readLocalExtractions(): Promise<StoredExtractions> {
  try {
    const raw = await readFile(extractionFile, "utf8");
    const parsed = JSON.parse(raw) as StoredExtractions;
    return {
      results: Array.isArray(parsed.results) ? parsed.results : []
    };
  } catch {
    return { results: [] };
  }
}

export async function readUploadedAllocations(): Promise<WardAllocation[]> {
  const store = await readLocalExtractions();
  return store.results.flatMap((result) => result.allocations);
}
