import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { BudgetDocument, BudgetLineItem, CitizenIdea, ExtractionResult } from "@/lib/types";

/**
 * Durable-enough storage for processed documents and citizen ideas.
 *
 * On a server with a writable disk this is a JSON file under .runtime. On Vercel it falls back to
 * /tmp, which is per-instance and cleared on redeploy — the upload response says so plainly rather
 * than implying the record is permanent. Set DATABASE_URL to persist extractions properly; see
 * lib/db.ts.
 */
const runtimeDir =
  process.env.VERCEL === "1" ? path.join("/tmp", "county-budget-tracker") : path.join(process.cwd(), ".runtime");
const extractionFile = path.join(runtimeDir, "extractions.json");
const ideasFile = path.join(runtimeDir, "ideas.json");

/** Keeps the JSON file bounded on hosts where it is the only storage. */
const MAX_EXTRACTIONS = 50;
const MAX_IDEAS = 1000;

export type LineItemQuery = {
  countyCode?: string;
  subCountyCode?: string;
  wardCode?: string;
  fiscalYear?: string;
};

export async function saveExtraction(result: ExtractionResult): Promise<ExtractionResult> {
  const existing = await listExtractions();
  const next = [result, ...existing.filter((item) => item.document.id !== result.document.id)].slice(
    0,
    MAX_EXTRACTIONS
  );
  await writeJson(extractionFile, { results: next });
  return result;
}

export async function listExtractions(): Promise<ExtractionResult[]> {
  const parsed = await readJson<{ results: ExtractionResult[] }>(extractionFile);
  return Array.isArray(parsed?.results) ? parsed.results : [];
}

export async function getExtraction(documentId: string): Promise<ExtractionResult | undefined> {
  const results = await listExtractions();
  return results.find((result) => result.document.id === documentId);
}

export async function listDocuments(countyCode?: string): Promise<BudgetDocument[]> {
  const results = await listExtractions();
  return results
    .map((result) => result.document)
    .filter((document) => !countyCode || document.countyCode === countyCode)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function listLineItems(query: LineItemQuery = {}): Promise<BudgetLineItem[]> {
  const results = await listExtractions();
  return results
    .flatMap((result) => result.lineItems)
    .filter((item) => matchesQuery(item, query));
}

/**
 * Rows scoped to a place. A ward query also returns rows that the document marked county-wide,
 * because those budgets do cover the ward — they are labelled county-wide in the UI so the
 * distinction stays visible.
 */
export async function listExtractionsForLocation(query: LineItemQuery): Promise<ExtractionResult[]> {
  const results = await listExtractions();
  return results.filter((result) => !query.countyCode || result.document.countyCode === query.countyCode);
}

function matchesQuery(item: BudgetLineItem, query: LineItemQuery) {
  if (query.countyCode && item.countyCode !== query.countyCode) return false;
  if (query.fiscalYear && item.fiscalYear !== query.fiscalYear) return false;
  if (query.wardCode) {
    return item.wardCode === query.wardCode || item.wardCode === null;
  }
  if (query.subCountyCode) {
    return item.subCountyCode === query.subCountyCode || item.subCountyCode === null;
  }
  return true;
}

export async function saveIdea(idea: CitizenIdea): Promise<CitizenIdea> {
  const existing = await listIdeas();
  await writeJson(ideasFile, { ideas: [idea, ...existing].slice(0, MAX_IDEAS) });
  return idea;
}

export async function listIdeas(filter: { wardCode?: string; countyCode?: string } = {}): Promise<CitizenIdea[]> {
  const parsed = await readJson<{ ideas: CitizenIdea[] }>(ideasFile);
  const ideas = Array.isArray(parsed?.ideas) ? parsed.ideas : [];
  return ideas.filter((idea) => {
    if (filter.wardCode && idea.wardCode !== filter.wardCode) return false;
    if (filter.countyCode && idea.countyCode !== filter.countyCode) return false;
    return true;
  });
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, value: unknown) {
  await mkdir(runtimeDir, { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

/** True when uploads survive a restart, so the UI can tell the user what they are getting. */
export function isDurableStorageConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
