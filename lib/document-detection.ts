import "server-only";

import { kenyaHierarchy } from "@/lib/kenya-server";
import type { DetectedField, DocumentDetection, DocumentType } from "@/lib/types";

/**
 * Reads a document's own identity out of its text: which county it belongs to, which financial
 * year it covers, what kind of budget document it is, and what it calls itself.
 *
 * Every field records where the value came from and how sure the match is. Nothing is guessed —
 * when a value cannot be read the field is returned as `not-found` with zero confidence so the
 * uploader is asked to confirm it rather than shown an invented answer.
 */

const TYPE_PATTERNS: Array<{ type: DocumentType; pattern: RegExp; weight: number }> = [
  { type: "finance-bill", pattern: /\bfinance\s+bill\b/i, weight: 0.95 },
  { type: "supplementary-budget", pattern: /\bsupplementary\s+(?:budget|appropriation|estimates)\b/i, weight: 0.95 },
  { type: "programme-based-budget", pattern: /\bprogramme[- ]based\s+budget\b/i, weight: 0.95 },
  { type: "annual-development-plan", pattern: /\bannual\s+development\s+plan\b/i, weight: 0.95 },
  { type: "county-fiscal-strategy-paper", pattern: /\bfiscal\s+strategy\s+paper\b/i, weight: 0.95 },
  { type: "controller-of-budget-report", pattern: /\bcontroller\s+of\s+budget\b/i, weight: 0.92 },
  { type: "implementation-report", pattern: /\bbudget\s+implementation\s+review\b/i, weight: 0.9 },
  { type: "implementation-report", pattern: /\bimplementation\s+report\b/i, weight: 0.85 },
  { type: "county-budget", pattern: /\bapproved\s+budget\s+estimates\b/i, weight: 0.9 },
  { type: "county-budget", pattern: /\bbudget\s+estimates\b/i, weight: 0.8 },
  { type: "county-budget", pattern: /\bappropriation\s+(?:bill|act)\b/i, weight: 0.75 }
];

export function detectDocumentMetadata({
  pages,
  fileName,
  metadataTitle,
  isTextBased,
  isScanned,
  pageCount
}: {
  pages: string[];
  fileName: string;
  metadataTitle?: string;
  isTextBased: boolean;
  isScanned: boolean;
  pageCount: number;
}): DocumentDetection {
  // Cover pages carry the identity of the document; the body is mostly tables.
  const front = pages.slice(0, 5);
  const cleanFileName = fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();

  const county = detectCounty(front, cleanFileName);
  const fiscalYear = detectFiscalYear(front, cleanFileName);
  const documentType = detectDocumentType(front, cleanFileName);
  const title = detectTitle(front, metadataTitle, cleanFileName);

  const confidences = [county.confidence, fiscalYear.confidence, documentType.confidence, title.confidence];
  const overallConfidence = Number(
    (confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(2)
  );

  return {
    county,
    fiscalYear,
    documentType,
    title,
    pages: pageCount,
    isScanned,
    isTextBased,
    overallConfidence
  };
}

function detectCounty(pages: string[], fileName: string): DetectedField<string | null> {
  // "Nairobi City County" beats a bare mention of a town, so the explicit phrasing is tried first.
  for (const [index, page] of pages.entries()) {
    for (const match of page.matchAll(/\b([A-Z][A-Za-z'’\- ]{2,24}?)\s+(?:City\s+)?County\b/g)) {
      const county = matchCounty(match[1]);
      if (county) {
        return {
          value: county.code,
          confidence: index === 0 ? 0.95 : 0.85,
          source: "document",
          page: index + 1,
          evidence: match[0].trim()
        };
      }
    }
  }

  for (const [index, page] of pages.entries()) {
    const county = firstCountyMentioned(page);
    if (county) {
      return {
        value: county.code,
        confidence: 0.6,
        source: "document",
        page: index + 1,
        evidence: county.name
      };
    }
  }

  const fromFileName = firstCountyMentioned(fileName);
  if (fromFileName) {
    return { value: fromFileName.code, confidence: 0.5, source: "filename", evidence: fileName };
  }

  return { value: null, confidence: 0, source: "not-found" };
}

function matchCounty(candidate: string) {
  const normalized = candidate.trim().replace(/\s+/g, " ").toLowerCase();
  return kenyaHierarchy.counties.find((county) => county.name.toLowerCase() === normalized);
}

function firstCountyMentioned(text: string) {
  const haystack = text.toLowerCase();
  let best: { code: string; name: string; index: number } | null = null;
  for (const county of kenyaHierarchy.counties) {
    const index = haystack.indexOf(county.name.toLowerCase());
    if (index === -1) continue;
    if (!best || index < best.index) best = { code: county.code, name: county.name, index };
  }
  return best;
}

function detectFiscalYear(pages: string[], fileName: string): DetectedField<string | null> {
  for (const [index, page] of pages.entries()) {
    const match = page.match(/\b(20\d{2})\s*[/\-–—]\s*(20\d{2}|\d{2})\b/);
    if (match) {
      return {
        value: normalizeFiscalYear(match[1], match[2]),
        confidence: index === 0 ? 0.95 : 0.85,
        source: "document",
        page: index + 1,
        evidence: match[0]
      };
    }
  }

  const fromFileName = fileName.match(/\b(20\d{2})\s*[/\-–—]?\s*(20\d{2}|\d{2})\b/);
  if (fromFileName) {
    return {
      value: normalizeFiscalYear(fromFileName[1], fromFileName[2]),
      confidence: 0.5,
      source: "filename",
      evidence: fileName
    };
  }

  return { value: null, confidence: 0, source: "not-found" };
}

function normalizeFiscalYear(start: string, end: string) {
  const endYear = end.length === 2 ? `20${end}` : end;
  return `${start}/${endYear}`;
}

function detectDocumentType(pages: string[], fileName: string): DetectedField<DocumentType> {
  const haystacks = [...pages, fileName];

  for (const [index, haystack] of haystacks.entries()) {
    const isFileName = index === haystacks.length - 1;
    const hit = TYPE_PATTERNS.find((candidate) => candidate.pattern.test(haystack));
    if (hit) {
      const match = haystack.match(hit.pattern);
      return {
        value: hit.type,
        confidence: isFileName ? Math.min(0.6, hit.weight) : hit.weight,
        source: isFileName ? "filename" : "document",
        page: isFileName ? undefined : index + 1,
        evidence: match?.[0]
      };
    }
  }

  return { value: "other", confidence: 0, source: "not-found" };
}

function detectTitle(pages: string[], metadataTitle: string | undefined, fileName: string): DetectedField<string> {
  const coverLines = (pages[0] ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 12 && line.length <= 120);

  // A cover page's headline is the line that actually names the document.
  const headline = coverLines.find((line) =>
    /budget|finance bill|estimates|development plan|fiscal strategy|implementation/i.test(line)
  );
  if (headline) {
    return { value: toTitleCase(headline), confidence: 0.85, source: "document", page: 1, evidence: headline };
  }

  if (metadataTitle) {
    return { value: metadataTitle, confidence: 0.6, source: "document", evidence: "PDF metadata title" };
  }

  return { value: toTitleCase(fileName) || "Untitled budget document", confidence: 0.4, source: "filename" };
}

/** Cover pages are often fully capitalised; sentence-cased titles read better in the UI. */
function toTitleCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ")
    .replace(/^./, (character) => character.toUpperCase());
}
