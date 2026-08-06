import "server-only";

import { sectorForDepartment } from "@/lib/extraction";
import { locationLabel, type LocationLevel, type LocationSelection } from "@/lib/kenya";
import { resolve } from "@/lib/kenya-server";
import { listExtractions, listIdeas } from "@/lib/store";
import type {
  BudgetDocument,
  BudgetLineItem,
  CitizenIdea,
  ClarificationItem,
  DepartmentAllocation,
  DocumentChange,
  KeyNumber,
  SectorAllocation
} from "@/lib/types";

/**
 * Everything the dashboard shows for one place, assembled from processed documents.
 *
 * Rows that name the selected ward and rows the document recorded county-wide are kept apart on
 * purpose. Folding county-wide spending into a ward's total would overstate what that ward actually
 * received, so the totals below count only rows that name the place.
 */
export type LocationInsights = {
  place: string;
  level: LocationLevel;
  documents: BudgetDocument[];
  /** Rows that name the selected place. */
  lineItems: BudgetLineItem[];
  /** Rows the document did not tie to a ward or sub-county, shown separately and labelled. */
  countywideItems: BudgetLineItem[];
  totals: {
    allocationKes: number;
    developmentKes: number;
    recurrentKes: number;
  };
  /**
   * Totals the documents state for the county as a whole.
   *
   * These are kept apart from `totals` because they describe the county, not the selected ward or
   * sub-county. Showing a county's revenue under a ward heading would read as that ward's revenue.
   */
  countyTotals: {
    countyName: string | null;
    revenueKes: number | null;
    expenditureKes: number | null;
  };
  departments: DepartmentAllocation[];
  sectors: SectorAllocation[];
  keyNumbers: KeyNumber[];
  changes: DocumentChange[];
  clarifications: ClarificationItem[];
  topProjects: BudgetLineItem[];
  ideas: CitizenIdea[];
  /** Financial years present in the documents for this place. */
  fiscalYears: string[];
};

export async function getLocationInsights(
  selection: LocationSelection,
  options: { fiscalYear?: string } = {}
): Promise<LocationInsights> {
  const location = resolve(selection);
  const extractions = await listExtractions();

  const relevant = selection.countyCode
    ? extractions.filter((result) => result.document.countyCode === selection.countyCode)
    : extractions;

  const scoped = options.fiscalYear
    ? relevant.filter((result) => result.document.fiscalYear === options.fiscalYear)
    : relevant;

  const documents = scoped.map((result) => result.document);
  const allItems = scoped.flatMap((result) => result.lineItems);

  const { matched, countywide } = splitByPlace(allItems, selection);

  const departments = aggregateDepartments(matched);
  const keyNumbers = scoped.flatMap((result) => result.analysis.keyNumbers);

  const ideas = selection.wardCode
    ? await listIdeas({ wardCode: selection.wardCode })
    : selection.countyCode
      ? await listIdeas({ countyCode: selection.countyCode })
      : [];

  return {
    place: locationLabel(location),
    level: location.level,
    documents,
    lineItems: matched,
    countywideItems: countywide,
    totals: {
      allocationKes: sum(matched),
      developmentKes: sum(matched.filter((item) => item.budgetType === "development")),
      recurrentKes: sum(matched.filter((item) => item.budgetType === "recurrent"))
    },
    countyTotals: {
      countyName: location.county?.name ?? null,
      revenueKes: statedTotal(scoped, "Total revenue"),
      expenditureKes: statedTotal(scoped, "Total expenditure")
    },
    departments,
    sectors: aggregateSectors(departments),
    keyNumbers,
    changes: scoped.flatMap((result) => result.analysis.changes).slice(0, 20),
    clarifications: scoped.flatMap((result) => result.analysis.clarifications).slice(0, 20),
    topProjects: [...matched].sort((a, b) => b.allocationKes - a.allocationKes).slice(0, 12),
    ideas,
    fiscalYears: [...new Set(relevant.map((result) => result.document.fiscalYear))].sort().reverse()
  };
}

function splitByPlace(items: BudgetLineItem[], selection: LocationSelection) {
  if (selection.wardCode) {
    return {
      matched: items.filter((item) => item.wardCode === selection.wardCode),
      countywide: items.filter((item) => item.wardCode === null)
    };
  }

  if (selection.subCountyCode) {
    return {
      matched: items.filter((item) => item.subCountyCode === selection.subCountyCode),
      countywide: items.filter((item) => item.subCountyCode === null)
    };
  }

  return { matched: items, countywide: [] };
}

/** A total is only reported when a document actually printed it, with the page it appeared on. */
function statedTotal(
  extractions: Awaited<ReturnType<typeof listExtractions>>,
  label: string
): number | null {
  for (const result of extractions) {
    const match = result.analysis.keyNumbers.find((number) => number.label === label);
    if (match) return match.amountKes;
  }
  return null;
}

function aggregateDepartments(items: BudgetLineItem[]): DepartmentAllocation[] {
  const map = new Map<string, DepartmentAllocation>();

  for (const item of items) {
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
    if (item.budgetType === "development") entry.developmentKes += item.allocationKes;
    else entry.recurrentKes += item.allocationKes;
    entry.itemCount += 1;
    if (!entry.pages.includes(item.page)) entry.pages.push(item.page);

    map.set(item.department, entry);
  }

  return [...map.values()]
    .map((entry) => ({ ...entry, pages: entry.pages.sort((a, b) => a - b) }))
    .sort((a, b) => b.allocationKes - a.allocationKes);
}

function aggregateSectors(departments: DepartmentAllocation[]): SectorAllocation[] {
  const total = departments.reduce((accumulator, entry) => accumulator + entry.allocationKes, 0);
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

function sum(items: BudgetLineItem[]) {
  return items.reduce((total, item) => total + item.allocationKes, 0);
}

/** County codes that have at least one processed document, used to mark coverage on the map. */
export async function getDocumentedCounties(): Promise<string[]> {
  const extractions = await listExtractions();
  return [...new Set(extractions.map((result) => result.document.countyCode).filter(Boolean))];
}

export type ClarificationSummary = ClarificationItem;
