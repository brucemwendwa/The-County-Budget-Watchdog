import {
  extractTextWithDocumentAiOcr,
  getDocumentAiOcrConfig,
  getRecommendedOcrEngine,
  isDocumentAiOcrConfigured,
  isDocumentAiOcrPartiallyConfigured
} from "@/lib/document-ai-ocr";
import { extractPdfTextLayer, readFileBuffer } from "@/lib/pdf-text-layer";
import type {
  County,
  ExtractionResult,
  ExtractionStrategy,
  OcrProcessingStatus,
  PdfClassification,
  WardAllocation
} from "@/lib/types";

type ParseBudgetInput = {
  file: File;
  county: County;
  fiscalYear: string;
  /** Document AI is a paid API, so public callers get the text-layer path only. */
  allowOcr?: boolean;
};

const SCANNED_USER_MESSAGE =
  "Scanned PDF detected. This document appears to be image-based and requires OCR processing before budget tables can be extracted.";

const SCANNED_EMPTY_ROWS_MESSAGE =
  "No structured budget rows were extracted because this is a scanned PDF. OCR must be enabled to read image-based tables.";

const OCR_NOT_CONFIGURED_MESSAGE =
  "OCR is not configured. Add Google Document AI credentials to process scanned PDFs.";

const OCR_REQUIRES_ADMIN_MESSAGE =
  "Scanned PDF detected. OCR runs on admin uploads only, so this document was not sent to Document AI.";

export async function parseBudgetDocument({
  file,
  county,
  fiscalYear,
  allowOcr = false
}: ParseBudgetInput): Promise<ExtractionResult> {
  const documentBase = {
    id: `doc-${crypto.randomUUID()}`,
    county,
    title: file.name.replace(/\.pdf$/i, ""),
    fiscalYear,
    type: "approved-budget" as const,
    uploadedAt: new Date().toISOString()
  };

  const textLayer = await extractPdfTextLayer(file);

  if (textLayer.usable) {
    return buildTextPdfResult({
      documentBase,
      text: textLayer.text,
      pageCount: textLayer.pageCount,
      charCount: textLayer.charCount,
      county,
      fiscalYear
    });
  }

  return buildScannedPdfResult({
    documentBase,
    file,
    textLayerCharCount: textLayer.charCount,
    pageCount: textLayer.pageCount,
    county,
    fiscalYear,
    allowOcr
  });
}

async function buildScannedPdfResult({
  documentBase,
  file,
  textLayerCharCount,
  pageCount,
  county,
  fiscalYear,
  allowOcr
}: {
  documentBase: Omit<ExtractionResult["document"], "status" | "pages">;
  file: File;
  textLayerCharCount: number;
  pageCount: number;
  county: County;
  fiscalYear: string;
  allowOcr: boolean;
}): Promise<ExtractionResult> {
  const ocrConfigured = isDocumentAiOcrConfigured();
  const ocrPartial = isDocumentAiOcrPartiallyConfigured();

  if (ocrConfigured && !allowOcr) {
    return scannedResult({
      documentBase,
      pageCount,
      textLayerCharCount,
      county,
      fiscalYear,
      pdfType: "SCANNED_PDF_REQUIRES_OCR",
      ocrStatus: "requires_admin_key",
      processingStatus: "OCR skipped (admin key required)",
      message: OCR_REQUIRES_ADMIN_MESSAGE,
      warnings: [
        SCANNED_EMPTY_ROWS_MESSAGE,
        "Document AI OCR is configured but runs for admin uploads only. Send the x-admin-api-key header to process scanned PDFs."
      ],
      allocations: [],
      extractedTextPreview: OCR_REQUIRES_ADMIN_MESSAGE
    });
  }

  if (!ocrConfigured) {
    return scannedResult({
      documentBase,
      pageCount,
      textLayerCharCount,
      county,
      fiscalYear,
      pdfType: "SCANNED_PDF_REQUIRES_OCR",
      ocrStatus: "waiting_for_configuration",
      processingStatus: ocrPartial
        ? "Waiting for OCR configuration (credentials missing)"
        : "Waiting for OCR configuration",
      message: SCANNED_USER_MESSAGE,
      warnings: [
        SCANNED_EMPTY_ROWS_MESSAGE,
        ocrPartial
          ? "Document AI processor is set but credentials are missing. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON."
          : OCR_NOT_CONFIGURED_MESSAGE
      ],
      allocations: [],
      extractedTextPreview: SCANNED_USER_MESSAGE
    });
  }

  let ocrText = "";
  let ocrPageCount = pageCount;

  try {
    const buffer = await readFileBuffer(file);
    const ocrResult = await extractTextWithDocumentAiOcr(buffer);
    ocrText = ocrResult.text;
    ocrPageCount = ocrResult.pageCount;
  } catch {
    return scannedResult({
      documentBase,
      pageCount,
      textLayerCharCount,
      county,
      fiscalYear,
      pdfType: "SCANNED_PDF_OCR_FAILED",
      ocrStatus: "failed",
      processingStatus: "OCR failed",
      message:
        "Scanned PDF detected, but OCR processing failed. Verify Document AI processor settings and credentials, then try again.",
      warnings: [
        SCANNED_EMPTY_ROWS_MESSAGE,
        "Document AI OCR did not return usable text. Check processor type (OCR/document) and quota."
      ],
      allocations: [],
      extractedTextPreview: "OCR was attempted but did not return usable text."
    });
  }

  const ocrCharCount = ocrText.replace(/\s+/g, "").length;
  if (ocrCharCount < 80) {
    return scannedResult({
      documentBase,
      pageCount: ocrPageCount,
      textLayerCharCount,
      county,
      fiscalYear,
      pdfType: "SCANNED_PDF_OCR_FAILED",
      ocrStatus: "failed",
      processingStatus: "OCR completed with insufficient text",
      message: SCANNED_USER_MESSAGE,
      warnings: [
        SCANNED_EMPTY_ROWS_MESSAGE,
        "OCR ran but returned too little text to extract budget tables. The processor may not match this PDF layout."
      ],
      allocations: [],
      extractedTextPreview: ocrText.slice(0, 500) || "OCR returned no usable text."
    });
  }

  const allocations = extractAllocationsFromText(ocrText, county, fiscalYear);

  if (allocations.length === 0) {
    return scannedResult({
      documentBase,
      pageCount: ocrPageCount,
      textLayerCharCount,
      county,
      fiscalYear,
      pdfType: "SCANNED_PDF_OCR_COMPLETE",
      ocrStatus: "completed",
      processingStatus: "OCR complete — no budget rows matched",
      message:
        "OCR extracted text from this scanned PDF, but no structured budget rows could be parsed. Review table layout or extraction rules.",
      warnings: [
        "OCR text was returned, but no ward or project rows matched the budget parser heuristics.",
        "Do not treat this document as fully processed until rows are verified."
      ],
      allocations: [],
      extractedTextPreview: ocrText.slice(0, 500)
    });
  }

  return {
    document: {
      ...documentBase,
      pages: ocrPageCount,
      status: "review-ready"
    },
    allocations,
    warnings: [
      "Extracted via Google Document AI OCR from a scanned PDF. Review rows before publishing."
    ],
    extractedTextPreview: ocrText.slice(0, 500),
    extractionStrategy: buildStrategy({
      pdfType: "SCANNED_PDF_OCR_COMPLETE",
      textLayerExtraction: "unavailable",
      textLayerCharCount,
      ocrRequired: true,
      ocrConfigured: true,
      ocrStatus: "completed",
      processingStatus: "Ready for AI questions",
      message: `OCR succeeded. ${allocations.length} structured budget rows extracted from scanned PDF.`
    })
  };
}

function buildTextPdfResult({
  documentBase,
  text,
  pageCount,
  charCount,
  county,
  fiscalYear
}: {
  documentBase: Omit<ExtractionResult["document"], "status" | "pages">;
  text: string;
  pageCount: number;
  charCount: number;
  county: County;
  fiscalYear: string;
}): ExtractionResult {
  const allocations = extractAllocationsFromText(text, county, fiscalYear);

  const strategy = buildStrategy({
    pdfType: "TEXT_PDF",
    textLayerExtraction: "succeeded",
    textLayerCharCount: charCount,
    ocrRequired: false,
    ocrConfigured: isDocumentAiOcrConfigured(),
    ocrStatus: "not_required",
    processingStatus: allocations.length > 0 ? "Ready for AI questions" : "Text layer OK — no rows matched",
    message:
      allocations.length > 0
        ? `Text-based PDF processed. ${allocations.length} structured budget rows extracted.`
        : "Text layer found, but no structured budget rows matched the parser. Try a programme-based budget export with ward tables."
  });

  const warnings =
    allocations.length > 0
      ? []
      : [
          "No structured budget rows were extracted from the text layer.",
          "The PDF has selectable text, but tables may use a layout the parser does not recognize yet."
        ];

  return {
    document: {
      ...documentBase,
      pages: pageCount,
      status: allocations.length > 0 ? "review-ready" : "needs-attention"
    },
    allocations,
    warnings,
    extractedTextPreview: text.slice(0, 500),
    extractionStrategy: strategy
  };
}

function scannedResult({
  documentBase,
  pageCount,
  textLayerCharCount,
  county,
  fiscalYear,
  pdfType,
  ocrStatus,
  processingStatus,
  message,
  warnings,
  allocations,
  extractedTextPreview
}: {
  documentBase: Omit<ExtractionResult["document"], "status" | "pages">;
  pageCount: number;
  textLayerCharCount: number;
  county: County;
  fiscalYear: string;
  pdfType: PdfClassification;
  ocrStatus: OcrProcessingStatus;
  processingStatus: string;
  message: string;
  warnings: string[];
  allocations: WardAllocation[];
  extractedTextPreview: string;
}): ExtractionResult {
  void county;
  void fiscalYear;

  return {
    document: {
      ...documentBase,
      pages: pageCount,
      status: "needs-attention"
    },
    allocations,
    warnings,
    extractedTextPreview,
    extractionStrategy: buildStrategy({
      pdfType,
      textLayerExtraction: textLayerCharCount > 0 ? "failed" : "unavailable",
      textLayerCharCount,
      ocrRequired: true,
      ocrConfigured: isDocumentAiOcrConfigured(),
      ocrStatus,
      processingStatus,
      message
    })
  };
}

function buildStrategy(input: {
  pdfType: PdfClassification;
  textLayerExtraction: ExtractionStrategy["textLayerExtraction"];
  textLayerCharCount: number;
  ocrRequired: boolean;
  ocrConfigured: boolean;
  ocrStatus: OcrProcessingStatus;
  processingStatus: string;
  message: string;
}): ExtractionStrategy {
  const config = getDocumentAiOcrConfig();

  return {
    pdfType: input.pdfType,
    textLayerExtraction: input.textLayerExtraction,
    textLayerCharCount: input.textLayerCharCount,
    ocrRequired: input.ocrRequired,
    recommendedEngine: getRecommendedOcrEngine(),
    ocrConfigured: input.ocrConfigured && config.configured,
    ocrProcessingStatus: input.ocrStatus,
    processingStatus: input.processingStatus,
    message: input.message
  };
}

function extractAllocationsFromText(text: string, county: County, fiscalYear: string): WardAllocation[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let currentDepartment = "County Administration";
  let currentProgramme = "Extracted programme";

  const rows: WardAllocation[] = [];

  for (const [index, line] of lines.entries()) {
    if (looksLikeDepartmentHeading(line)) {
      currentDepartment = inferDepartment(line);
      currentProgramme = inferProgramme(line, currentDepartment);
      continue;
    }

    const amounts = extractMoneyValues(line);
    if (amounts.length === 0 || isLikelyHeader(line)) {
      continue;
    }

    const allocation = amounts[0];
    const expenditure = amounts.length > 1 ? amounts[amounts.length - 1] : 0;
    if (allocation < 50_000) {
      continue;
    }

    const ward = inferWard(line);
    const project = cleanProjectName(line);
    if (project.length < 8) {
      continue;
    }

    rows.push({
      id: `alloc-${crypto.randomUUID()}`,
      county,
      ward,
      constituency: "Not stated in extracted row",
      department: inferDepartment(line, currentDepartment),
      programme: inferProgramme(line, currentProgramme),
      project,
      fiscalYear,
      allocationKes: allocation,
      expenditureKes: expenditure,
      budgetType: /recurrent|salary|operation|maintenance|personnel|administration/i.test(line)
        ? "recurrent"
        : "development",
      page: Math.max(1, Math.ceil((index + 1) / 45)),
      confidence: calculateConfidence(line, amounts, ward),
      status: statusFromAmounts(allocation, expenditure)
    });

    if (rows.length >= 120) {
      break;
    }
  }

  return rows;
}

function extractMoneyValues(line: string) {
  const explicit = Array.from(line.matchAll(/(?:KES|KSH|Kshs?\.?)\s?([\d,]+(?:\.\d+)?)/gi)).map((match) =>
    toAmount(match[1])
  );
  if (explicit.length > 0) {
    return explicit;
  }

  return Array.from(line.matchAll(/\b([1-9]\d{0,2}(?:,\d{3}){1,}|[1-9]\d{5,})(?:\.00)?\b/g))
    .map((match) => toAmount(match[1]))
    .filter((amount) => amount >= 50_000);
}

function toAmount(value: string) {
  return Math.round(Number(value.replaceAll(",", "")));
}

function inferWard(line: string) {
  const wardMatch = line.match(/\b([A-Z][A-Za-z' -]{2,40})\s+Ward\b/i);
  if (wardMatch) {
    return cleanWardName(wardMatch[1]);
  }

  const wardPrefix = line.match(/\bWard[:\s-]+([A-Z][A-Za-z' -]{2,40})\b/i);
  if (wardPrefix) {
    return cleanWardName(wardPrefix[1]);
  }

  return "Countywide / Not stated";
}

function cleanWardName(value: string) {
  const trimmed = value
    .replace(/^.*\bCounty\s+/i, "")
    .replace(/^.*\b(Health Services|Roads and Transport|Water and Sanitation|Education|Agriculture)\s+/i, "")
    .replace(/^.*\b(drainage|clinic|classroom|school|road|roads|water|sewer)\s+/i, "")
    .trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  return titleCase(words.slice(-3).join(" ") || trimmed);
}

function cleanProjectName(line: string) {
  return line
    .replace(/(?:KES|KSH|Kshs?\.?)\s?[\d,]+(?:\.\d+)?/gi, "")
    .replace(/\b[1-9]\d{0,2}(?:,\d{3}){1,}(?:\.00)?\b/g, "")
    .replace(/\bpage\s+\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\d.)\-\s]+/, "")
    .trim()
    .slice(0, 180);
}

function looksLikeDepartmentHeading(line: string) {
  return (
    /department|vote|programme|health|water|education|roads|transport|agriculture|finance|public works|sanitation/i.test(
      line
    ) &&
    extractMoneyValues(line).length === 0 &&
    line.length < 120
  );
}

function isLikelyHeader(line: string) {
  return /item description|project name|approved estimates|printed estimates|total\b|grand total|sub total/i.test(line);
}

function inferProgramme(line: string, fallback: string) {
  if (/primary health|clinic|dispensary|hospital|maternity/i.test(line)) {
    return "Primary Health Care";
  }
  if (/road|drainage|bridge|footpath/i.test(line)) {
    return "Access Roads";
  }
  if (/water|sewer|sanitation/i.test(line)) {
    return "Water and Sanitation";
  }
  if (/ecde|classroom|school|education/i.test(line)) {
    return "Education Infrastructure";
  }
  if (/irrigation|farmer|agriculture|livestock/i.test(line)) {
    return "Food Security";
  }
  return fallback;
}

function calculateConfidence(line: string, amounts: number[], ward: string) {
  let confidence = 0.48;
  if (amounts.length > 0) {
    confidence += 0.18;
  }
  if (ward !== "Countywide / Not stated") {
    confidence += 0.14;
  }
  if (/project|construction|upgrade|rehabilitation|supply|purchase|drainage|clinic|classroom/i.test(line)) {
    confidence += 0.12;
  }
  return Math.min(0.9, Number(confidence.toFixed(2)));
}

function statusFromAmounts(allocation: number, expenditure: number): WardAllocation["status"] {
  if (expenditure === 0) {
    return "underspent";
  }
  if (expenditure > allocation) {
    return "overspent";
  }
  const spentRatio = expenditure / allocation;
  if (spentRatio < 0.5) {
    return "underspent";
  }
  return "on-track";
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferDepartment(line: string, fallback = "County Administration") {
  if (/health|clinic|hospital|dispensary|maternity/i.test(line)) {
    return "Health Services";
  }
  if (/road|drainage|bridge|transport|footpath/i.test(line)) {
    return "Roads and Transport";
  }
  if (/water|sewer|sanitation/i.test(line)) {
    return "Water and Sanitation";
  }
  if (/ecde|school|classroom|education/i.test(line)) {
    return "Education";
  }
  if (/agriculture|irrigation|farmer|livestock/i.test(line)) {
    return "Agriculture";
  }
  if (/finance|treasury|revenue/i.test(line)) {
    return "Finance and Economic Planning";
  }
  return fallback;
}
