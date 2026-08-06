/**
 * Domain types for The County Budget Tracker.
 *
 * Everything the UI shows is derived from a document that was actually uploaded and processed.
 * There are no sample records: when a figure is absent from the source it is represented as `null`
 * and rendered as "not stated", never as a substitute number.
 */

export type DocumentType =
  | "county-budget"
  | "finance-bill"
  | "supplementary-budget"
  | "programme-based-budget"
  | "annual-development-plan"
  | "county-fiscal-strategy-paper"
  | "implementation-report"
  | "controller-of-budget-report"
  | "other";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  "county-budget": "County Budget",
  "finance-bill": "Finance Bill",
  "supplementary-budget": "Supplementary Budget",
  "programme-based-budget": "Programme Based Budget",
  "annual-development-plan": "Annual Development Plan",
  "county-fiscal-strategy-paper": "County Fiscal Strategy Paper",
  "implementation-report": "Implementation Report",
  "controller-of-budget-report": "Controller of Budget Report",
  other: "Other budget document"
};

export type DocumentStatus =
  /** Text was read and structured rows were extracted. */
  | "processed"
  /** Text was read but no budget rows matched, so figures cannot be shown. */
  | "no-rows-extracted"
  /** Image-based PDF that needs OCR before anything can be read. */
  | "needs-ocr"
  /** OCR ran or was attempted and did not produce usable text. */
  | "ocr-failed";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  processed: "Processed",
  "no-rows-extracted": "No budget rows found",
  "needs-ocr": "Needs OCR",
  "ocr-failed": "OCR failed"
};

/** Where a detected value came from, so the UI can show what was read versus what was assumed. */
export type DetectionSource = "document" | "filename" | "user" | "not-found";

export type DetectedField<T> = {
  value: T;
  confidence: number;
  source: DetectionSource;
  /** Page the value was read from, when it came from the document body. */
  page?: number;
  /** The line of text the value was read from. */
  evidence?: string;
};

export type DocumentDetection = {
  county: DetectedField<string | null>;
  fiscalYear: DetectedField<string | null>;
  documentType: DetectedField<DocumentType>;
  title: DetectedField<string>;
  pages: number;
  isScanned: boolean;
  isTextBased: boolean;
  /** Mean of the individual field confidences, 0–1. */
  overallConfidence: number;
};

export type BudgetDocument = {
  id: string;
  countyCode: string;
  countyName: string;
  title: string;
  fileName: string;
  fiscalYear: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: string;
  pages: number;
  /** Set only when the PDF was archived to object storage. */
  sourceUrl?: string;
  detection: DocumentDetection;
};

export type BudgetType = "development" | "recurrent";

/** One budget row read from a document, always carrying the page it was read from. */
export type BudgetLineItem = {
  id: string;
  documentId: string;
  countyCode: string;
  /** Ward named in the row; null when the row is county-wide or the ward is not stated. */
  wardName: string | null;
  wardCode: string | null;
  subCountyName: string | null;
  subCountyCode: string | null;
  department: string;
  programme: string;
  project: string;
  fiscalYear: string;
  allocationKes: number;
  /** Null when the row states an allocation only, which is normal for budget estimates. */
  expenditureKes: number | null;
  budgetType: BudgetType;
  page: number;
  confidence: number;
  /** The raw line the row was parsed from, shown as evidence. */
  excerpt: string;
};

export type KeyNumber = {
  label: string;
  amountKes: number;
  page: number;
  excerpt: string;
  confidence: number;
};

export type DepartmentAllocation = {
  department: string;
  allocationKes: number;
  expenditureKes: number | null;
  developmentKes: number;
  recurrentKes: number;
  itemCount: number;
  pages: number[];
};

export type SectorAllocation = {
  sector: string;
  allocationKes: number;
  share: number;
  itemCount: number;
};

export type ExtractedTable = {
  page: number;
  caption: string;
  rowCount: number;
  totalKes: number;
};

/** Language in the document that signals a change from a previous budget. */
export type DocumentChange = {
  id: string;
  page: number;
  description: string;
  amountKes: number | null;
  excerpt: string;
};

/**
 * A row that needs a human to look at it — an unusually vague description, a missing figure, or a
 * low-confidence parse. These are prompts for questions, not accusations.
 */
export type ClarificationItem = {
  id: string;
  reason: string;
  detail: string;
  page: number;
  department: string;
  project: string;
  amountKes: number | null;
};

export type BudgetAnalysis = {
  summary: string;
  keyNumbers: KeyNumber[];
  revenueKes: number | null;
  expenditureKes: number | null;
  developmentKes: number | null;
  recurrentKes: number | null;
  departments: DepartmentAllocation[];
  sectors: SectorAllocation[];
  tables: ExtractedTable[];
  changes: DocumentChange[];
  clarifications: ClarificationItem[];
};

export type PdfClassification =
  | "TEXT_PDF"
  | "SCANNED_PDF_REQUIRES_OCR"
  | "SCANNED_PDF_OCR_COMPLETE"
  | "SCANNED_PDF_OCR_FAILED";

export type TextLayerExtractionStatus = "succeeded" | "failed" | "unavailable";

export type OcrProcessingStatus =
  | "not_required"
  | "waiting_for_configuration"
  | "requires_admin_key"
  | "completed"
  | "failed";

export type ExtractionStrategy = {
  pdfType: PdfClassification;
  textLayerExtraction: TextLayerExtractionStatus;
  textLayerCharCount: number;
  ocrRequired: boolean;
  recommendedEngine: string;
  ocrConfigured: boolean;
  ocrProcessingStatus: OcrProcessingStatus;
  processingStatus: string;
  message: string;
};

/** Where an upload actually came to rest, so the UI never implies durability it does not have. */
export type StorageStatus = {
  pdfArchived: boolean;
  databasePersisted: boolean;
  message: string;
};

export type ExtractionResult = {
  document: BudgetDocument;
  lineItems: BudgetLineItem[];
  analysis: BudgetAnalysis;
  warnings: string[];
  extractedTextPreview: string;
  extractionStrategy: ExtractionStrategy;
  /** Set by the upload route after storage is attempted. */
  storage?: StorageStatus;
};

export type RagSource = {
  documentId: string;
  title: string;
  page: number;
  excerpt: string;
  section?: string;
  programme?: string;
};

export type BudgetAnswer = {
  directAnswer: string;
  simpleExplanation: string;
  amountsInvolved: string[];
  sourceDocument: string;
  sourcePages: RagSource[];
  confidence: number;
  meaningForCitizens: string;
  suggestedQuestion: string;
  /** True when the documents do not contain the answer; the UI must not dress this up. */
  unanswered: boolean;
};

export type IdeaCategory =
  | "roads"
  | "health"
  | "education"
  | "water"
  | "agriculture"
  | "youth"
  | "markets"
  | "security"
  | "other";

export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  roads: "Roads",
  health: "Health",
  education: "Education",
  water: "Water",
  agriculture: "Agriculture",
  youth: "Youth",
  markets: "Markets",
  security: "Security",
  other: "Other"
};

export type CitizenIdea = {
  id: string;
  /** Optional — citizens may submit anonymously. */
  name: string | null;
  countyCode: string;
  countyName: string;
  subCountyCode: string;
  subCountyName: string;
  wardCode: string;
  wardName: string;
  category: IdeaCategory;
  idea: string;
  submittedAt: string;
};
