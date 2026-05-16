export type County = "Nairobi" | "Makueni" | "Kisumu" | "Kiambu";

export type BudgetDocument = {
  id: string;
  county: County;
  title: string;
  fiscalYear: string;
  type: "approved-budget" | "supplementary-budget" | "gazette-notice" | "expenditure-report" | "implementation-report";
  status: "processing" | "review-ready" | "published" | "needs-attention";
  uploadedAt: string;
  pages: number;
  sourceUrl?: string;
};

export type WardAllocation = {
  id: string;
  county: County;
  ward: string;
  constituency: string;
  department: string;
  programme: string;
  project: string;
  fiscalYear: string;
  allocationKes: number;
  expenditureKes: number;
  budgetType: "development" | "recurrent";
  page: number;
  confidence: number;
  status: "on-track" | "underspent" | "overspent" | "changed";
};

export type DepartmentSummary = {
  department: string;
  allocationKes: number;
  expenditureKes: number;
  developmentKes: number;
  recurrentKes: number;
};

export type SuspiciousChange = {
  id: string;
  county: County;
  ward: string;
  department: string;
  description: string;
  beforeKes: number;
  afterKes: number;
  deltaKes: number;
  risk: "low" | "medium" | "high";
  sourcePage: number;
  detectedAt: string;
};

export type AmendmentSourcePage = {
  document: "Original budget" | "Amended budget";
  page: number;
  section: string;
};

export type AmendmentAlert = {
  riskLevel: "Low" | "Medium" | "High";
  changeType:
    | "increased"
    | "reduced"
    | "removed"
    | "added"
    | "shifted-to-recurrent"
    | "vague-name"
    | "large-unexplained-change";
  project: string;
  wardOrSector: string;
  department: string;
  programme: string;
  summaryOfChange: string;
  beforeKes: number | null;
  afterKes: number | null;
  amountChangedKes: number | null;
  sourcePages: AmendmentSourcePage[];
  whyItMatters: string;
  questionResidentsShouldAsk: string;
};

export type AmendmentAnalysis = {
  overallRisk: "Low" | "Medium" | "High";
  summary: string;
  alerts: AmendmentAlert[];
};

export type LeakRisk = "green" | "yellow" | "red";

export type LeakSignalType =
  | "allocated-not-spent"
  | "spent-not-allocated"
  | "repeated-project-name"
  | "ward-inequality"
  | "never-completed"
  | "post-participation-cut"
  | "development-to-recurrent";

export type BudgetLeakSignal = {
  id: string;
  type: LeakSignalType;
  risk: LeakRisk;
  title: string;
  county: County | "Multiple";
  wardOrSector: string;
  department: string;
  amountKes: number | null;
  summary: string;
  evidence: string[];
  residentMeaning: string;
  questionResidentsShouldAsk: string;
};

export type BudgetLeakReport = {
  generatedAt: string;
  comparedDocuments: Array<{
    title: string;
    type: BudgetDocument["type"];
    fiscalYear: string;
    pages: number;
  }>;
  counts: Record<LeakRisk, number>;
  signals: BudgetLeakSignal[];
};

export type SmsDigest = {
  id: string;
  county: County;
  ward: string;
  language: "english" | "swahili" | "sheng";
  body: string;
  status: "draft" | "approved" | "sent";
  createdAt: string;
};

export type SmsVersions = {
  formalEnglish: string;
  simpleEnglish: string;
  swahiliFriendly: string;
};

export type RagSource = {
  documentId: string;
  title: string;
  page: number;
  excerpt: string;
  section?: string;
  table?: string;
  programme?: string;
};

export type BudgetAnswer = {
  directAnswer: string;
  amountsInvolved: string[];
  sourceCitation: string;
  simpleExplanation: string;
  facts: string[];
  interpretation: string;
  swahiliFriendlyExplanation?: string;
  sourcePages: RagSource[];
  confidence: number;
  whyThisMatters: string;
  suggestedCivicAction: string;
  suggestedQuestion: string;
};

export type ExtractionResult = {
  document: BudgetDocument;
  allocations: WardAllocation[];
  warnings: string[];
  extractedTextPreview: string;
};
