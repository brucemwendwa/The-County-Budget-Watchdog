import "server-only";

import { sectorForDepartment } from "@/lib/extraction";
import type {
  BudgetAnalysis,
  BudgetLineItem,
  ClarificationItem,
  DepartmentAllocation,
  DocumentChange,
  DocumentType,
  ExtractedTable,
  KeyNumber,
  SectorAllocation
} from "@/lib/types";
import { DOCUMENT_TYPE_LABELS } from "@/lib/types";
import { formatKes } from "@/lib/utils";

/**
 * Derives the dashboard view of a document from what was actually extracted.
 *
 * Every number here is either read from a labelled total in the document (with the page it appears
 * on) or summed from the extracted rows. Nothing is estimated to fill a gap: a total the document
 * does not state comes back as null and the UI says it is not stated.
 */

type KeyNumberRule = {
  label: string;
  pattern: RegExp;
};

const KEY_NUMBER_RULES: KeyNumberRule[] = [
  { label: "Total revenue", pattern: /total\s+(?:county\s+)?revenue|revenue\s+estimates?\s+total/i },
  { label: "Total expenditure", pattern: /total\s+(?:gross\s+)?expenditure|gross\s+expenditure/i },
  { label: "Development budget", pattern: /development\s+(?:budget|expenditure|estimates?|vote)/i },
  { label: "Recurrent budget", pattern: /recurrent\s+(?:budget|expenditure|estimates?|vote)/i },
  { label: "Equitable share", pattern: /equitable\s+share/i },
  { label: "Own source revenue", pattern: /own\s+source\s+revenue|local\s+revenue/i }
];

const CHANGE_PATTERN =
  /\b(supplementary|revised|amended|reallocat\w+|increased by|reduced by|decreased by|additional provision|budget cut)\b/i;

const VAGUE_PROJECT_PATTERN = /\b(miscellaneous|other expenses|sundry|various|general expenses|consultancy|unallocated)\b/i;

export function buildAnalysis({
  pages,
  lineItems,
  documentType,
  countyName,
  fiscalYear
}: {
  pages: string[];
  lineItems: BudgetLineItem[];
  documentType: DocumentType;
  countyName: string;
  fiscalYear: string;
}): BudgetAnalysis {
  const keyNumbers = extractKeyNumbers(pages);
  const departments = aggregateDepartments(lineItems);
  const sectors = aggregateSectors(departments);
  const tables = detectTables(pages);
  const changes = detectChanges(pages);
  const clarifications = buildClarifications(lineItems);

  const statedTotal = (label: string) => keyNumbers.find((item) => item.label === label)?.amountKes ?? null;
  const summedDevelopment = sumBy(lineItems.filter((item) => item.budgetType === "development"));
  const summedRecurrent = sumBy(lineItems.filter((item) => item.budgetType === "recurrent"));

  return {
    summary: buildSummary({
      lineItems,
      departments,
      pages: pages.length,
      documentType,
      countyName,
      fiscalYear
    }),
    keyNumbers,
    revenueKes: statedTotal("Total revenue"),
    expenditureKes: statedTotal("Total expenditure"),
    // Fall back to the sum of extracted rows only when rows exist; otherwise stay null.
    developmentKes: statedTotal("Development budget") ?? (lineItems.length > 0 ? summedDevelopment : null),
    recurrentKes: statedTotal("Recurrent budget") ?? (lineItems.length > 0 ? summedRecurrent : null),
    departments,
    sectors,
    tables,
    changes,
    clarifications
  };
}

function extractKeyNumbers(pages: string[]): KeyNumber[] {
  const found = new Map<string, KeyNumber>();

  for (const [pageIndex, pageText] of pages.entries()) {
    const lines = pageText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    for (const line of lines) {
      for (const rule of KEY_NUMBER_RULES) {
        if (found.has(rule.label) || !rule.pattern.test(line)) continue;
        const amount = largestAmountIn(line);
        if (amount === null) continue;

        found.set(rule.label, {
          label: rule.label,
          amountKes: amount,
          page: pageIndex + 1,
          excerpt: line.slice(0, 220),
          // A labelled total on its own line is a strong signal; buried in prose it is weaker.
          confidence: line.length < 120 ? 0.85 : 0.65
        });
      }
    }
  }

  return [...found.values()];
}

/**
 * Budget totals are printed alongside comparison columns, and the figure being labelled is the
 * largest one on the line often enough that picking it beats picking the first.
 */
function largestAmountIn(line: string): number | null {
  const amounts = Array.from(line.matchAll(/\b([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{5,})(?:\.\d{2})?\b/g)).map((match) =>
    Math.round(Number(match[1].replaceAll(",", "")))
  );
  const usable = amounts.filter((amount) => amount >= 100_000);
  return usable.length > 0 ? Math.max(...usable) : null;
}

function aggregateDepartments(lineItems: BudgetLineItem[]): DepartmentAllocation[] {
  const map = new Map<string, DepartmentAllocation>();

  for (const item of lineItems) {
    const entry = map.get(item.department) ?? {
      department: item.department,
      allocationKes: 0,
      expenditureKes: null,
      developmentKes: 0,
      recurrentKes: 0,
      itemCount: 0,
      pages: []
    };

    entry.allocationKes += item.allocationKes;
    if (item.expenditureKes !== null) {
      entry.expenditureKes = (entry.expenditureKes ?? 0) + item.expenditureKes;
    }
    if (item.budgetType === "development") {
      entry.developmentKes += item.allocationKes;
    } else {
      entry.recurrentKes += item.allocationKes;
    }
    entry.itemCount += 1;
    if (!entry.pages.includes(item.page)) entry.pages.push(item.page);

    map.set(item.department, entry);
  }

  return [...map.values()]
    .map((entry) => ({ ...entry, pages: entry.pages.sort((a, b) => a - b) }))
    .sort((a, b) => b.allocationKes - a.allocationKes);
}

function aggregateSectors(departments: DepartmentAllocation[]): SectorAllocation[] {
  const total = departments.reduce((sum, entry) => sum + entry.allocationKes, 0);
  if (total === 0) return [];

  const map = new Map<string, SectorAllocation>();
  for (const entry of departments) {
    const sector = sectorForDepartment(entry.department);
    const current = map.get(sector) ?? { sector, allocationKes: 0, share: 0, itemCount: 0 };
    current.allocationKes += entry.allocationKes;
    current.itemCount += entry.itemCount;
    map.set(sector, current);
  }

  return [...map.values()]
    .map((entry) => ({ ...entry, share: Number(((entry.allocationKes / total) * 100).toFixed(1)) }))
    .sort((a, b) => b.allocationKes - a.allocationKes);
}

/** A table is a run of consecutive lines on one page that all carry figures. */
function detectTables(pages: string[]): ExtractedTable[] {
  const tables: ExtractedTable[] = [];

  for (const [pageIndex, pageText] of pages.entries()) {
    const lines = pageText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    let runStart = -1;
    let runTotal = 0;
    let runRows = 0;
    let caption = "";
    let lastHeading = "";

    const flush = () => {
      if (runRows >= 3) {
        tables.push({
          page: pageIndex + 1,
          caption: caption || `Budget table on page ${pageIndex + 1}`,
          rowCount: runRows,
          totalKes: runTotal
        });
      }
      runStart = -1;
      runRows = 0;
      runTotal = 0;
    };

    for (const line of lines) {
      const amount = firstAmountIn(line);
      if (amount === null) {
        if (line.length > 8 && line.length < 110) lastHeading = line;
        flush();
        continue;
      }
      if (runStart === -1) {
        runStart = 0;
        caption = lastHeading;
      }
      runRows += 1;
      runTotal += amount;
    }
    flush();
  }

  return tables.slice(0, 40);
}

function firstAmountIn(line: string): number | null {
  const match = line.match(/\b([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{5,})(?:\.\d{2})?\b/);
  if (!match) return null;
  const amount = Math.round(Number(match[1].replaceAll(",", "")));
  return amount >= 50_000 ? amount : null;
}

function detectChanges(pages: string[]): DocumentChange[] {
  const changes: DocumentChange[] = [];

  for (const [pageIndex, pageText] of pages.entries()) {
    const lines = pageText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 25 && line.length < 300);

    for (const line of lines) {
      if (!CHANGE_PATTERN.test(line)) continue;
      changes.push({
        id: `change-${pageIndex + 1}-${changes.length}`,
        page: pageIndex + 1,
        description: line.slice(0, 200),
        amountKes: firstAmountIn(line),
        excerpt: line.slice(0, 240)
      });
      if (changes.length >= 25) return changes;
    }
  }

  return changes;
}

/**
 * Rows a reader should look at before relying on them. These are reasons to ask a question — a
 * vague description, a figure the document did not pair with a ward, a low-confidence parse — and
 * are never presented as findings of wrongdoing.
 */
function buildClarifications(lineItems: BudgetLineItem[]): ClarificationItem[] {
  const clarifications: ClarificationItem[] = [];
  const seenProjects = new Map<string, number>();

  for (const item of lineItems) {
    const key = item.project.toLowerCase();
    seenProjects.set(key, (seenProjects.get(key) ?? 0) + 1);

    if (VAGUE_PROJECT_PATTERN.test(item.project)) {
      clarifications.push({
        id: `clarify-vague-${item.id}`,
        reason: "Non-specific description",
        detail:
          "The document describes this allocation in general terms, so residents cannot tell what will be delivered.",
        page: item.page,
        department: item.department,
        project: item.project,
        amountKes: item.allocationKes
      });
      continue;
    }

    if (item.confidence < 0.5) {
      clarifications.push({
        id: `clarify-confidence-${item.id}`,
        reason: "Low extraction confidence",
        detail: "This row was hard to read reliably. Check it against the source page before relying on the figure.",
        page: item.page,
        department: item.department,
        project: item.project,
        amountKes: item.allocationKes
      });
    }
  }

  for (const [project, count] of seenProjects) {
    if (count < 3) continue;
    const example = lineItems.find((item) => item.project.toLowerCase() === project);
    if (!example) continue;
    clarifications.push({
      id: `clarify-repeat-${example.id}`,
      reason: "Repeated description",
      detail: `The same description appears ${count} times. It may be a recurring line, or the same item counted more than once.`,
      page: example.page,
      department: example.department,
      project: example.project,
      amountKes: null
    });
  }

  return clarifications.slice(0, 30);
}

function buildSummary({
  lineItems,
  departments,
  pages,
  documentType,
  countyName,
  fiscalYear
}: {
  lineItems: BudgetLineItem[];
  departments: DepartmentAllocation[];
  pages: number;
  documentType: DocumentType;
  countyName: string;
  fiscalYear: string;
}) {
  const label = DOCUMENT_TYPE_LABELS[documentType];

  if (lineItems.length === 0) {
    return `This ${label.toLowerCase()} for ${countyName} County (${fiscalYear}) was read across ${pages} pages, but no budget rows could be extracted from its tables. The figures below cannot be shown until the tables are readable.`;
  }

  const total = sumBy(lineItems);
  const wardRows = lineItems.filter((item) => item.wardCode !== null).length;
  const top = departments[0];

  const wardSentence =
    wardRows > 0
      ? ` ${wardRows} of these rows name a specific ward.`
      : " None of the rows name a specific ward, so the figures are county-wide.";

  const topSentence = top
    ? ` The largest share of the extracted rows sits under ${top.department} at ${formatKes(top.allocationKes)}.`
    : "";

  return `This ${label.toLowerCase()} for ${countyName} County (${fiscalYear}) was read across ${pages} pages. ${lineItems.length} budget rows totalling ${formatKes(
    total
  )} were extracted across ${departments.length} departments.${wardSentence}${topSentence}`;
}

function sumBy(items: BudgetLineItem[]) {
  return items.reduce((sum, item) => sum + item.allocationKes, 0);
}
