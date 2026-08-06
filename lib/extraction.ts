import "server-only";

import { getCounty } from "@/lib/kenya-server";
import type { BudgetLineItem, BudgetType } from "@/lib/types";

/**
 * Turns budget-table text into structured rows.
 *
 * Two things make this trustworthy rather than a guess. Rows are read page by page, so the page
 * reference on every figure is the page it was actually printed on. And ward names are matched
 * against the county's real ward list rather than inferred from the shape of the line, so a row is
 * only attributed to a ward that exists in that county.
 */

/** Below this a number is a quantity, a page reference, or a line index — not a budget figure. */
const MIN_ALLOCATION_KES = 50_000;
const MAX_LINE_ITEMS = 400;

/** Ward names that are ordinary words; these need the word "ward" nearby before they count. */
const AMBIGUOUS_WARD_NAMES = new Set([
  "central",
  "township",
  "north",
  "south",
  "east",
  "west",
  "market",
  "town",
  "county",
  "hospital",
  "industrial area",
  "airport",
  "kati"
]);

const DEPARTMENT_RULES: Array<{ pattern: RegExp; department: string }> = [
  { pattern: /health|clinic|hospital|dispensary|maternity|medical|nursing/i, department: "Health Services" },
  { pattern: /road|drainage|bridge|transport|footpath|culvert|tarmac|murram/i, department: "Roads and Transport" },
  { pattern: /water|sewer|sanitation|borehole|dam|irrigation scheme/i, department: "Water and Sanitation" },
  { pattern: /ecde|school|classroom|education|bursary|polytechnic|vocational/i, department: "Education" },
  { pattern: /agricultur|livestock|farmer|crop|veterinary|fisheries/i, department: "Agriculture and Livestock" },
  { pattern: /trade|market|enterprise|cooperative|industrialis|tourism/i, department: "Trade and Enterprise" },
  { pattern: /youth|sports|gender|social|culture|talent/i, department: "Youth, Sports and Social Services" },
  { pattern: /environment|forest|climate|waste|sanitation park|green/i, department: "Environment and Natural Resources" },
  { pattern: /lands|housing|urban|physical planning|survey/i, department: "Lands, Housing and Urban Planning" },
  { pattern: /finance|treasury|revenue|economic planning|budget office/i, department: "Finance and Economic Planning" },
  { pattern: /public service|administration|governor|assembly|human resource/i, department: "Public Service and Administration" },
  { pattern: /energy|electricity|solar|power/i, department: "Energy" }
];

const PROGRAMME_RULES: Array<{ pattern: RegExp; programme: string }> = [
  { pattern: /primary health|clinic|dispensary|hospital|maternity/i, programme: "Primary Health Care" },
  { pattern: /road|drainage|bridge|footpath|culvert/i, programme: "Access Roads and Drainage" },
  { pattern: /water|borehole|sewer|sanitation|dam/i, programme: "Water and Sanitation" },
  { pattern: /ecde|classroom|school|bursary/i, programme: "Education Infrastructure" },
  { pattern: /irrigation|farmer|livestock|crop|agricultur/i, programme: "Food Security" },
  { pattern: /market|stall|trade|enterprise/i, programme: "Markets and Trade" },
  { pattern: /youth|sports|talent|social/i, programme: "Youth and Social Development" },
  { pattern: /street ?light|solar|electric|power/i, programme: "Energy and Street Lighting" }
];

export const SECTOR_BY_DEPARTMENT: Record<string, string> = {
  "Health Services": "Health",
  "Roads and Transport": "Roads and Infrastructure",
  "Water and Sanitation": "Water",
  Education: "Education",
  "Agriculture and Livestock": "Agriculture",
  "Trade and Enterprise": "Trade and Markets",
  "Youth, Sports and Social Services": "Youth and Social",
  "Environment and Natural Resources": "Environment",
  "Lands, Housing and Urban Planning": "Lands and Housing",
  "Finance and Economic Planning": "Governance and Administration",
  "Public Service and Administration": "Governance and Administration",
  Energy: "Energy"
};

const DEFAULT_DEPARTMENT = "Not stated in document";
const DEFAULT_PROGRAMME = "Not stated in document";

type WardMatcher = {
  pattern: RegExp | null;
  byName: Map<string, { wardCode: string; wardName: string; subCountyCode: string; subCountyName: string }>;
};

export function extractLineItems({
  pages,
  countyCode,
  fiscalYear,
  documentId
}: {
  pages: string[];
  countyCode: string;
  fiscalYear: string;
  documentId: string;
}): BudgetLineItem[] {
  const wards = buildWardMatcher(countyCode);
  const items: BudgetLineItem[] = [];

  let currentDepartment = DEFAULT_DEPARTMENT;
  let currentProgramme = DEFAULT_PROGRAMME;

  for (const [pageIndex, pageText] of pages.entries()) {
    const pageNumber = pageIndex + 1;
    const lines = pageText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    for (const line of lines) {
      if (looksLikeDepartmentHeading(line)) {
        currentDepartment = inferDepartment(line, currentDepartment);
        currentProgramme = inferProgramme(line, DEFAULT_PROGRAMME);
        continue;
      }

      if (isLikelyHeaderOrTotal(line)) {
        continue;
      }

      const amounts = extractMoneyValues(line);
      if (amounts.length === 0) continue;

      const allocationKes = amounts[0];
      if (allocationKes < MIN_ALLOCATION_KES) continue;

      const project = cleanProjectName(line);
      if (project.length < 8) continue;

      const ward = matchWard(line, wards);
      const department = inferDepartment(line, currentDepartment);

      items.push({
        id: `item-${crypto.randomUUID()}`,
        documentId,
        countyCode,
        wardName: ward?.wardName ?? null,
        wardCode: ward?.wardCode ?? null,
        subCountyName: ward?.subCountyName ?? null,
        subCountyCode: ward?.subCountyCode ?? null,
        department,
        programme: inferProgramme(line, currentProgramme),
        project,
        fiscalYear,
        allocationKes,
        // A second figure on a budget-estimates row is usually the comparison or actual column.
        expenditureKes: amounts.length > 1 ? amounts[amounts.length - 1] : null,
        budgetType: inferBudgetType(line, department),
        page: pageNumber,
        confidence: scoreConfidence(line, Boolean(ward), amounts.length),
        excerpt: line.slice(0, 240)
      });

      if (items.length >= MAX_LINE_ITEMS) return items;
    }
  }

  return items;
}

function buildWardMatcher(countyCode: string): WardMatcher {
  const county = getCounty(countyCode);
  const byName = new Map<string, { wardCode: string; wardName: string; subCountyCode: string; subCountyName: string }>();
  if (!county) return { pattern: null, byName };

  const names: string[] = [];
  for (const subCounty of county.subCounties) {
    for (const ward of subCounty.wards) {
      // Compound names like "Parklands/Highridge" appear in documents under either half.
      for (const part of [ward.name, ...ward.name.split("/")]) {
        const key = part.trim().toLowerCase();
        if (key.length < 4 || byName.has(key)) continue;
        byName.set(key, {
          wardCode: ward.code,
          wardName: ward.name,
          subCountyCode: subCounty.code,
          subCountyName: subCounty.name
        });
        names.push(part.trim());
      }
    }
  }

  if (names.length === 0) return { pattern: null, byName };

  // Longest first so "Nyalenda A" wins over a shorter ward whose name is a prefix of it.
  const alternation = names
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  return { pattern: new RegExp(`\\b(${alternation})\\b`, "gi"), byName };
}

function matchWard(line: string, wards: WardMatcher) {
  if (!wards.pattern) return null;
  wards.pattern.lastIndex = 0;

  for (const match of line.matchAll(wards.pattern)) {
    const key = match[1].toLowerCase();
    const ward = wards.byName.get(key);
    if (!ward) continue;
    // Everyday words are only a ward reference when the line says so.
    if (AMBIGUOUS_WARD_NAMES.has(key) && !/\bward\b/i.test(line)) continue;
    return ward;
  }

  return null;
}

function extractMoneyValues(line: string): number[] {
  const explicit = Array.from(line.matchAll(/(?:KES|KSH|Kshs?\.?)\s?([\d,]+(?:\.\d+)?)/gi)).map((match) =>
    toAmount(match[1])
  );
  if (explicit.length > 0) {
    return explicit.filter((amount) => amount >= MIN_ALLOCATION_KES);
  }

  return Array.from(line.matchAll(/\b([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{5,})(?:\.\d{2})?\b/g))
    .map((match) => toAmount(match[1]))
    .filter((amount) => amount >= MIN_ALLOCATION_KES);
}

function toAmount(value: string) {
  return Math.round(Number(value.replaceAll(",", "")));
}

function cleanProjectName(line: string) {
  return line
    .replace(/(?:KES|KSH|Kshs?\.?)\s?[\d,]+(?:\.\d+)?/gi, "")
    .replace(/\b[1-9]\d{0,2}(?:,\d{3})+(?:\.\d{2})?\b/g, "")
    .replace(/\b\d{6,}\b/g, "")
    .replace(/\bpage\s+\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\d.)\-\s|]+/, "")
    .replace(/[\s|.\-]+$/, "")
    .trim()
    .slice(0, 180);
}

function looksLikeDepartmentHeading(line: string) {
  if (line.length > 120) return false;
  if (extractMoneyValues(line).length > 0) return false;
  return /\b(department|vote|sector|directorate|ministry|programme)\b/i.test(line);
}

function isLikelyHeaderOrTotal(line: string) {
  return /item description|project name|approved estimates|printed estimates|grand total|sub[- ]?total|^total\b|financial year|page \d+ of \d+/i.test(
    line
  );
}

function inferDepartment(line: string, fallback: string) {
  const hit = DEPARTMENT_RULES.find((rule) => rule.pattern.test(line));
  return hit?.department ?? fallback;
}

function inferProgramme(line: string, fallback: string) {
  const hit = PROGRAMME_RULES.find((rule) => rule.pattern.test(line));
  return hit?.programme ?? fallback;
}

function inferBudgetType(line: string, department: string): BudgetType {
  if (/\brecurrent\b|salar|wage|personnel|allowance|operation and maintenance|utilit|fuel|training/i.test(line)) {
    return "recurrent";
  }
  if (/\bdevelopment\b|construct|rehabilitat|upgrad|purchase of|installation|equipping|expansion|tarmac/i.test(line)) {
    return "development";
  }
  return department === "Public Service and Administration" || department === "Finance and Economic Planning"
    ? "recurrent"
    : "development";
}

/**
 * How much to trust one parsed row. A row that names a real ward, describes a recognisable project,
 * and carries a clean figure is worth more than a bare number beside a fragment of text.
 */
function scoreConfidence(line: string, hasWard: boolean, amountCount: number) {
  let confidence = 0.45;
  if (hasWard) confidence += 0.2;
  if (amountCount > 1) confidence += 0.05;
  if (/project|construction|upgrade|rehabilitation|supply|purchase|installation|equipping/i.test(line)) {
    confidence += 0.15;
  }
  if (line.length > 40) confidence += 0.05;
  if (/\b(miscellaneous|other|sundry|various|general)\b/i.test(line)) confidence -= 0.15;
  return Math.min(0.95, Math.max(0.2, Number(confidence.toFixed(2))));
}

export function sectorForDepartment(department: string) {
  return SECTOR_BY_DEPARTMENT[department] ?? "Other";
}
