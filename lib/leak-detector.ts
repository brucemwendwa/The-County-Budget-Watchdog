import { budgetDocuments, suspiciousChanges, wardAllocations } from "@/data/sample-budget";
import type { BudgetDocument, BudgetLeakReport, BudgetLeakSignal, County, LeakRisk } from "@/lib/types";
import { percentage } from "@/lib/utils";

type BudgetLeakDetectorInput = {
  approvedBudget?: string;
  supplementaryBudget?: string;
  expenditureReport?: string;
  implementationReport?: string;
};

type HistoricalProject = {
  project: string;
  county: County;
  ward: string;
  department: string;
  fiscalYear: string;
  completed: boolean;
  allocationKes: number;
};

const historicalProjects: HistoricalProject[] = [
  {
    project: "Two ECDE classrooms and sanitation block",
    county: "Kisumu",
    ward: "Nyalenda A",
    department: "Education",
    fiscalYear: "2023/2024",
    completed: false,
    allocationKes: 18000000
  },
  {
    project: "Two ECDE classrooms and sanitation block",
    county: "Kisumu",
    ward: "Nyalenda A",
    department: "Education",
    fiscalYear: "2024/2025",
    completed: false,
    allocationKes: 24000000
  },
  {
    project: "Two ECDE classrooms and sanitation block",
    county: "Kisumu",
    ward: "Nyalenda A",
    department: "Education",
    fiscalYear: "2025/2026",
    completed: false,
    allocationKes: 22000000
  }
];

export function detectBudgetLeaks(input: BudgetLeakDetectorInput = {}): BudgetLeakReport {
  const textSignals = detectFromRawText(input);
  const signals = [
    ...detectHealthyMatches(),
    ...detectAllocatedNotSpent(),
    ...detectSpentWithoutClearAllocation(),
    ...detectRepeatedProjectNames(),
    ...detectWardInequality(),
    ...detectNeverCompletedProjects(),
    ...detectPostParticipationCuts(),
    ...detectDevelopmentToRecurrentShift(),
    ...textSignals
  ];

  return {
    generatedAt: new Date().toISOString(),
    comparedDocuments: getComparedDocuments(input),
    counts: countRisks(signals),
    signals
  };
}

function detectHealthyMatches(): BudgetLeakSignal[] {
  return wardAllocations
    .filter((allocation) => allocation.status === "on-track")
    .slice(0, 2)
    .map((allocation) => ({
      id: `leak-healthy-${allocation.id}`,
      type: "allocated-not-spent",
      risk: "green",
      title: "Allocation and spending broadly match",
      county: allocation.county,
      wardOrSector: allocation.ward,
      department: allocation.department,
      amountKes: allocation.expenditureKes,
      summary: `${allocation.project} has spending close to the approved allocation.`,
      evidence: [
        `Approved allocation: KES ${allocation.allocationKes.toLocaleString("en-KE")}, page ${allocation.page}.`,
        `Recorded expenditure: KES ${allocation.expenditureKes.toLocaleString("en-KE")}.`
      ],
      residentMeaning: "This line looks closer to normal implementation, though residents can still ask for proof of work.",
      questionResidentsShouldAsk:
        "Can the county show completion status, contractor details, and photos or inspection reports?"
    } satisfies BudgetLeakSignal));
}

function getComparedDocuments(input: BudgetLeakDetectorInput): BudgetLeakReport["comparedDocuments"] {
  const sampleDocuments = budgetDocuments.filter((document) =>
    ["approved-budget", "supplementary-budget", "expenditure-report", "implementation-report"].includes(document.type)
  );

  if (!Object.values(input).some(Boolean)) {
    return sampleDocuments.map(toComparedDocument);
  }

  return [
    documentFromText("Approved budget upload", "approved-budget", input.approvedBudget),
    documentFromText("Supplementary budget upload", "supplementary-budget", input.supplementaryBudget),
    documentFromText("Expenditure report upload", "expenditure-report", input.expenditureReport),
    documentFromText("Implementation report upload", "implementation-report", input.implementationReport)
  ].filter((document): document is BudgetLeakReport["comparedDocuments"][number] => Boolean(document));
}

function documentFromText(title: string, type: BudgetDocument["type"], text?: string) {
  if (!text?.trim()) {
    return null;
  }

  return {
    title,
    type,
    fiscalYear: inferFiscalYear(text),
    pages: Math.max(1, Math.ceil(text.length / 2400))
  };
}

function toComparedDocument(document: BudgetDocument) {
  return {
    title: document.title,
    type: document.type,
    fiscalYear: document.fiscalYear,
    pages: document.pages
  };
}

function detectAllocatedNotSpent(): BudgetLeakSignal[] {
  return wardAllocations
    .filter((allocation) => allocation.allocationKes - allocation.expenditureKes > 10_000_000)
    .map((allocation) => {
      const unspent = allocation.allocationKes - allocation.expenditureKes;
      const absorption = percentage(allocation.expenditureKes, allocation.allocationKes);
      return {
        id: `leak-unspent-${allocation.id}`,
        type: "allocated-not-spent",
        risk: absorption < 35 ? "red" : "yellow",
        title: "Allocated but not spent",
        county: allocation.county,
        wardOrSector: allocation.ward,
        department: allocation.department,
        amountKes: unspent,
        summary: `${allocation.project} has ${absorption}% recorded absorption with KES ${unspent.toLocaleString(
          "en-KE"
        )} still unspent.`,
        evidence: [
          `Approved budget: ${allocation.project}, ${allocation.department}, page ${allocation.page}.`,
          `Expenditure report comparison: KES ${allocation.expenditureKes.toLocaleString("en-KE")} spent out of KES ${allocation.allocationKes.toLocaleString("en-KE")}.`
        ],
        residentMeaning: "A promised service may be delayed even though money was set aside for it.",
        questionResidentsShouldAsk:
          "What is delaying spending on this project, and when will residents see implementation?"
      } satisfies BudgetLeakSignal;
    });
}

function detectSpentWithoutClearAllocation(): BudgetLeakSignal[] {
  return wardAllocations
    .filter((allocation) => allocation.expenditureKes > allocation.allocationKes)
    .map((allocation) => ({
      id: `leak-overspent-${allocation.id}`,
      type: "spent-not-allocated",
      risk: "red",
      title: "Spent but not clearly allocated",
      county: allocation.county,
      wardOrSector: allocation.ward,
      department: allocation.department,
      amountKes: allocation.expenditureKes - allocation.allocationKes,
      summary: `${allocation.project} shows spending above the listed allocation.`,
      evidence: [
        `Allocation: KES ${allocation.allocationKes.toLocaleString("en-KE")}, page ${allocation.page}.`,
        `Recorded expenditure: KES ${allocation.expenditureKes.toLocaleString("en-KE")}.`
      ],
      residentMeaning: "Spending above the listed budget line needs a clear explanation or matching amended allocation.",
      questionResidentsShouldAsk:
        "Which approved amendment or vote head allowed this extra spending?"
    } satisfies BudgetLeakSignal));
}

function detectRepeatedProjectNames(): BudgetLeakSignal[] {
  const grouped = new Map<
    string,
    Array<{
      project: string;
      county: County;
      ward: string;
      department: string;
      fiscalYear: string;
      page: number;
      allocationKes: number;
    }>
  >();

  for (const allocation of wardAllocations) {
    const key = normalizeProject(allocation.project);
    grouped.set(key, [...(grouped.get(key) ?? []), allocation]);
  }
  for (const project of historicalProjects) {
    const key = normalizeProject(project.project);
    grouped.set(key, [
      ...(grouped.get(key) ?? []),
      {
        project: project.project,
        county: project.county,
        ward: project.ward,
        department: project.department,
        fiscalYear: project.fiscalYear,
        page: 0,
        allocationKes: project.allocationKes
      }
    ]);
  }

  return Array.from(grouped.values())
    .filter((items) => items.length > 1)
    .map((items, index) => ({
      id: `leak-repeat-${index}`,
      type: "repeated-project-name",
      risk: "yellow",
      title: "Repeated project name",
      county: items[0].county,
      wardOrSector: items.map((item) => item.ward).join(", "),
      department: items[0].department,
      amountKes: items.reduce((sum, item) => sum + item.allocationKes, 0),
      summary: `${items[0].project} appears ${items.length} times across budget and implementation evidence.`,
      evidence: items.map((item) =>
        item.page > 0 ? `${item.fiscalYear}, ${item.ward}, page ${item.page}.` : `${item.fiscalYear}, ${item.ward}, page not supplied.`
      ),
      residentMeaning: "Repeated names can be normal phasing, but they can also hide duplicate budgeting.",
      questionResidentsShouldAsk:
        "Are these separate phases, or is the same project being budgeted more than once?"
    } satisfies BudgetLeakSignal));
}

function detectWardInequality(): BudgetLeakSignal[] {
  const totals = new Map<string, number>();

  for (const allocation of wardAllocations) {
    totals.set(allocation.ward, (totals.get(allocation.ward) ?? 0) + allocation.allocationKes);
  }

  const amounts = Array.from(totals.values()).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)] ?? 0;

  return Array.from(totals.entries())
    .filter(([, total]) => median > 0 && (total > median * 1.8 || total < median * 0.45))
    .map(([ward, total]) => ({
      id: `leak-inequality-${normalizeProject(ward)}`,
      type: "ward-inequality",
      risk: total > median * 1.8 ? "yellow" : "red",
      title: "Ward inequality signal",
      county: wardAllocations.find((allocation) => allocation.ward === ward)?.county ?? "Multiple",
      wardOrSector: ward,
      department: "Cross-sector",
      amountKes: total,
      summary: `${ward} has KES ${total.toLocaleString("en-KE")} in tracked allocations versus a median ward amount of KES ${median.toLocaleString("en-KE")}.`,
      evidence: [`Ward allocation comparison across approved budget and reports.`],
      residentMeaning: "Some wards may be receiving much more or much less visible project funding than others.",
      questionResidentsShouldAsk:
        "What formula or public participation priority explains this ward-level difference?"
    } satisfies BudgetLeakSignal));
}

function detectNeverCompletedProjects(): BudgetLeakSignal[] {
  const grouped = new Map<string, HistoricalProject[]>();

  for (const project of historicalProjects) {
    const key = normalizeProject(`${project.county}-${project.ward}-${project.project}`);
    grouped.set(key, [...(grouped.get(key) ?? []), project]);
  }

  return Array.from(grouped.values())
    .filter((items) => items.length >= 3 && items.every((item) => !item.completed))
    .map((items) => ({
      id: `leak-never-completed-${normalizeProject(items[0].project)}`,
      type: "never-completed",
      risk: "red",
      title: "Appears every year, never completed",
      county: items[0].county,
      wardOrSector: items[0].ward,
      department: items[0].department,
      amountKes: items.reduce((sum, item) => sum + item.allocationKes, 0),
      summary: `${items[0].project} appears across ${items.length} financial years without completion in the demo implementation records.`,
      evidence: items.map((item) => `${item.fiscalYear}: KES ${item.allocationKes.toLocaleString("en-KE")}.`),
      residentMeaning: "A project that keeps reappearing may be stalled, repackaged, or repeatedly under-implemented.",
      questionResidentsShouldAsk:
        "Why has this project not been completed, and what work has actually been delivered each year?"
    } satisfies BudgetLeakSignal));
}

function detectPostParticipationCuts(): BudgetLeakSignal[] {
  return suspiciousChanges
    .filter((change) => change.deltaKes < -10_000_000)
    .map((change) => ({
      id: `leak-cut-${change.id}`,
      type: "post-participation-cut",
      risk: "red",
      title: "Sudden cut after public participation",
      county: change.county,
      wardOrSector: change.ward,
      department: change.department,
      amountKes: Math.abs(change.deltaKes),
      summary: `${change.department} in ${change.ward} reduced by KES ${Math.abs(change.deltaKes).toLocaleString(
        "en-KE"
      )}.`,
      evidence: [
        `Original allocation: KES ${change.beforeKes.toLocaleString("en-KE")}.`,
        `Amended allocation: KES ${change.afterKes.toLocaleString("en-KE")}, source page ${change.sourcePage}.`
      ],
      residentMeaning: "A project residents supported may have lost funding after the public participation stage.",
      questionResidentsShouldAsk:
        "Who approved this reduction after public participation, and what reason was recorded?"
    } satisfies BudgetLeakSignal));
}

function detectDevelopmentToRecurrentShift(): BudgetLeakSignal[] {
  const recurrentOverspend = wardAllocations.filter(
    (allocation) => allocation.budgetType === "recurrent" && allocation.expenditureKes > allocation.allocationKes
  );

  return recurrentOverspend.map((allocation) => ({
    id: `leak-recurrent-shift-${allocation.id}`,
    type: "development-to-recurrent",
    risk: "yellow",
    title: "Possible development money shifted to recurrent",
    county: allocation.county,
    wardOrSector: allocation.ward,
    department: allocation.department,
    amountKes: allocation.expenditureKes - allocation.allocationKes,
    summary: `${allocation.department} recurrent spending is above the listed allocation for ${allocation.project}.`,
    evidence: [
      `Recurrent allocation: KES ${allocation.allocationKes.toLocaleString("en-KE")}, page ${allocation.page}.`,
      `Recorded recurrent expenditure: KES ${allocation.expenditureKes.toLocaleString("en-KE")}.`
    ],
    residentMeaning:
      "Money meant for visible projects can be squeezed if operational spending grows without a clear amended budget line.",
    questionResidentsShouldAsk:
      "Was any development money moved to recurrent spending, and which approval document shows it?"
  } satisfies BudgetLeakSignal));
}

function detectFromRawText(input: BudgetLeakDetectorInput): BudgetLeakSignal[] {
  const approved = extractAmounts(input.approvedBudget ?? "");
  const supplementary = extractAmounts(input.supplementaryBudget ?? "");
  const expenditure = extractAmounts(input.expenditureReport ?? "");
  const implementation = extractAmounts(input.implementationReport ?? "");
  const names = Array.from(new Set([...Object.keys(approved), ...Object.keys(supplementary), ...Object.keys(expenditure)]));

  return names
    .map((name) => {
      const approvedAmount = approved[name] ?? supplementary[name] ?? 0;
      const spent = expenditure[name] ?? 0;
      const implemented = implementation[name] ?? 0;
      const unspent = approvedAmount - Math.max(spent, implemented);

      if (approvedAmount > 0 && unspent > 10_000_000) {
        return buildTextSignal("allocated-not-spent", "red", name, unspent, "Allocated money appears unspent in the supplied reports.");
      }
      if (!approvedAmount && spent > 0) {
        return buildTextSignal("spent-not-allocated", "red", name, spent, "Spending appears without a matching approved allocation in the supplied text.");
      }
      return null;
    })
    .filter((signal): signal is BudgetLeakSignal => Boolean(signal));
}

function buildTextSignal(
  type: BudgetLeakSignal["type"],
  risk: LeakRisk,
  project: string,
  amountKes: number,
  summary: string
): BudgetLeakSignal {
  return {
    id: `leak-text-${type}-${normalizeProject(project)}`,
    type,
    risk,
    title: type === "spent-not-allocated" ? "Spent but not clearly allocated" : "Allocated but not spent",
    county: "Multiple",
    wardOrSector: "Detected from uploaded text",
    department: "Detected from uploaded text",
    amountKes,
    summary: `${project}: ${summary}`,
    evidence: ["Detected by comparing supplied approved, supplementary, expenditure, and implementation text."],
    residentMeaning: "This line needs a source-backed explanation before residents can trust the numbers.",
    questionResidentsShouldAsk:
      "Which approved document, page, and vote head explain this difference?"
  };
}

function extractAmounts(text: string) {
  const amounts: Record<string, number> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    const match = line.match(/(?:KES|KSH|Kshs?\.?)\s?([\d,]+)/i);
    if (!match) {
      continue;
    }
    const name = line.replace(match[0], "").replace(/page\s+\d+/i, "").trim();
    if (name.length > 2) {
      amounts[name.slice(0, 120)] = Number(match[1].replaceAll(",", ""));
    }
  }
  return amounts;
}

function countRisks(signals: BudgetLeakSignal[]) {
  return signals.reduce(
    (counts, signal) => {
      counts[signal.risk] += 1;
      return counts;
    },
    { green: 0, yellow: 0, red: 0 } satisfies Record<LeakRisk, number>
  );
}

function normalizeProject(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function inferFiscalYear(text: string) {
  return text.match(/20\d{2}\/20\d{2}/)?.[0] ?? "Unknown";
}
