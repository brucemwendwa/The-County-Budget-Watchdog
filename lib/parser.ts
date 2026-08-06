import "server-only";

import { buildAnalysis } from "@/lib/analysis";
import {
  extractTextWithDocumentAiOcr,
  getDocumentAiOcrConfig,
  getRecommendedOcrEngine,
  isDocumentAiOcrConfigured,
  isDocumentAiOcrPartiallyConfigured
} from "@/lib/document-ai-ocr";
import { detectDocumentMetadata } from "@/lib/document-detection";
import { extractLineItems } from "@/lib/extraction";
import { getCounty } from "@/lib/kenya-server";
import { extractPdfTextLayer, readFileBuffer, splitOcrTextIntoPages } from "@/lib/pdf-text-layer";
import type {
  BudgetDocument,
  DocumentDetection,
  DocumentStatus,
  DocumentType,
  ExtractionResult,
  ExtractionStrategy,
  OcrProcessingStatus,
  PdfClassification
} from "@/lib/types";

type ParseInput = {
  file: File;
  /** What the uploader selected. Detection can disagree; both are reported. */
  countyCode?: string;
  fiscalYear?: string;
  documentType?: DocumentType;
  /** Document AI is a paid API, so public callers get the text-layer path only. */
  allowOcr?: boolean;
};

const SCANNED_MESSAGE =
  "Scanned PDF detected. This document is image-based, so its budget tables cannot be read until OCR runs.";

const OCR_NOT_CONFIGURED_MESSAGE = "Scanned PDF detected. OCR configuration is required.";

const OCR_REQUIRES_ADMIN_MESSAGE =
  "Scanned PDF detected. OCR runs on administrator uploads only, so this document was not sent to Document AI.";

export async function parseBudgetDocument({
  file,
  countyCode,
  fiscalYear,
  documentType,
  allowOcr = false
}: ParseInput): Promise<ExtractionResult> {
  const textLayer = await extractPdfTextLayer(file);

  if (textLayer.usable) {
    return buildResult({
      file,
      pages: textLayer.pages,
      pageCount: textLayer.pageCount,
      metadataTitle: textLayer.metadataTitle,
      requestedCounty: countyCode,
      requestedFiscalYear: fiscalYear,
      requestedType: documentType,
      isScanned: false,
      strategy: {
        pdfType: "TEXT_PDF",
        textLayerExtraction: "succeeded",
        textLayerCharCount: textLayer.charCount,
        ocrRequired: false,
        ocrStatus: "not_required"
      }
    });
  }

  return handleScannedPdf({
    file,
    textLayerCharCount: textLayer.charCount,
    pageCount: textLayer.pageCount,
    requestedCounty: countyCode,
    requestedFiscalYear: fiscalYear,
    requestedType: documentType,
    allowOcr
  });
}

async function handleScannedPdf({
  file,
  textLayerCharCount,
  pageCount,
  requestedCounty,
  requestedFiscalYear,
  requestedType,
  allowOcr
}: {
  file: File;
  textLayerCharCount: number;
  pageCount: number;
  requestedCounty?: string;
  requestedFiscalYear?: string;
  requestedType?: DocumentType;
  allowOcr: boolean;
}): Promise<ExtractionResult> {
  const ocrConfigured = isDocumentAiOcrConfigured();
  const ocrPartiallyConfigured = isDocumentAiOcrPartiallyConfigured();

  const unreadable = (input: {
    pdfType: PdfClassification;
    ocrStatus: OcrProcessingStatus;
    processingStatus: string;
    message: string;
    warnings: string[];
    status: DocumentStatus;
  }) =>
    buildUnreadableResult({
      file,
      pageCount,
      textLayerCharCount,
      requestedCounty,
      requestedFiscalYear,
      requestedType,
      ...input
    });

  if (!ocrConfigured) {
    return unreadable({
      pdfType: "SCANNED_PDF_REQUIRES_OCR",
      ocrStatus: "waiting_for_configuration",
      processingStatus: "Waiting for OCR configuration",
      message: OCR_NOT_CONFIGURED_MESSAGE,
      status: "needs-ocr",
      warnings: [
        SCANNED_MESSAGE,
        ocrPartiallyConfigured
          ? "A Document AI processor is set but its credentials are missing. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON."
          : "Add Google Document AI credentials to process scanned PDFs."
      ]
    });
  }

  if (!allowOcr) {
    return unreadable({
      pdfType: "SCANNED_PDF_REQUIRES_OCR",
      ocrStatus: "requires_admin_key",
      processingStatus: "OCR skipped — administrator upload required",
      message: OCR_REQUIRES_ADMIN_MESSAGE,
      status: "needs-ocr",
      warnings: [
        SCANNED_MESSAGE,
        "Document AI OCR is configured but runs for administrator uploads only, because each page is billed."
      ]
    });
  }

  let ocrText = "";
  let ocrPageCount = pageCount;

  try {
    const result = await extractTextWithDocumentAiOcr(await readFileBuffer(file));
    ocrText = result.text;
    ocrPageCount = result.pageCount;
  } catch {
    return unreadable({
      pdfType: "SCANNED_PDF_OCR_FAILED",
      ocrStatus: "failed",
      processingStatus: "OCR failed",
      message: "Scanned PDF detected, but OCR processing failed. Check the Document AI processor and credentials.",
      status: "ocr-failed",
      warnings: [SCANNED_MESSAGE, "Document AI did not return usable text. Verify the processor type and quota."]
    });
  }

  if (ocrText.replace(/\s+/g, "").length < 80) {
    return unreadable({
      pdfType: "SCANNED_PDF_OCR_FAILED",
      ocrStatus: "failed",
      processingStatus: "OCR returned too little text",
      message: "OCR ran but returned too little text to read this document's tables.",
      status: "ocr-failed",
      warnings: [SCANNED_MESSAGE, "The processor may not match this PDF's layout."]
    });
  }

  return buildResult({
    file,
    pages: splitOcrTextIntoPages(ocrText, ocrPageCount),
    pageCount: ocrPageCount,
    requestedCounty,
    requestedFiscalYear,
    requestedType,
    isScanned: true,
    strategy: {
      pdfType: "SCANNED_PDF_OCR_COMPLETE",
      textLayerExtraction: "unavailable",
      textLayerCharCount,
      ocrRequired: true,
      ocrStatus: "completed"
    }
  });
}

function buildResult({
  file,
  pages,
  pageCount,
  metadataTitle,
  requestedCounty,
  requestedFiscalYear,
  requestedType,
  isScanned,
  strategy
}: {
  file: File;
  pages: string[];
  pageCount: number;
  metadataTitle?: string;
  requestedCounty?: string;
  requestedFiscalYear?: string;
  requestedType?: DocumentType;
  isScanned: boolean;
  strategy: {
    pdfType: PdfClassification;
    textLayerExtraction: ExtractionStrategy["textLayerExtraction"];
    textLayerCharCount: number;
    ocrRequired: boolean;
    ocrStatus: OcrProcessingStatus;
  };
}): ExtractionResult {
  const detection = applyUserOverrides(
    detectDocumentMetadata({
      pages,
      fileName: file.name,
      metadataTitle,
      isTextBased: !isScanned,
      isScanned,
      pageCount
    }),
    { requestedCounty, requestedFiscalYear, requestedType }
  );

  const documentId = `doc-${crypto.randomUUID()}`;
  const county = getCounty(detection.county.value ?? undefined);
  const fiscalYear = detection.fiscalYear.value ?? "Not stated in document";

  const lineItems = county
    ? extractLineItems({ pages, countyCode: county.code, fiscalYear, documentId })
    : [];

  const analysis = buildAnalysis({
    pages,
    lineItems,
    documentType: detection.documentType.value,
    countyName: county?.name ?? "Unassigned",
    fiscalYear
  });

  const warnings = buildWarnings({ detection, hasCounty: Boolean(county), rowCount: lineItems.length });

  const document: BudgetDocument = {
    id: documentId,
    countyCode: county?.code ?? "",
    countyName: county?.name ?? "Not detected",
    title: detection.title.value,
    fileName: file.name,
    fiscalYear,
    type: detection.documentType.value,
    status: lineItems.length > 0 ? "processed" : "no-rows-extracted",
    uploadedAt: new Date().toISOString(),
    pages: pageCount,
    detection
  };

  const message =
    lineItems.length > 0
      ? `${lineItems.length} budget rows were extracted from ${pageCount} pages.`
      : "The document's text was read, but no budget rows matched. Its tables may use a layout the extractor does not recognise yet.";

  return {
    document,
    lineItems,
    analysis,
    warnings,
    extractedTextPreview: (pages[0] ?? "").slice(0, 600),
    extractionStrategy: {
      pdfType: strategy.pdfType,
      textLayerExtraction: strategy.textLayerExtraction,
      textLayerCharCount: strategy.textLayerCharCount,
      ocrRequired: strategy.ocrRequired,
      recommendedEngine: getRecommendedOcrEngine(),
      ocrConfigured: isDocumentAiOcrConfigured() && getDocumentAiOcrConfig().configured,
      ocrProcessingStatus: strategy.ocrStatus,
      processingStatus: lineItems.length > 0 ? "Ready for questions" : "Read, but no rows extracted",
      message
    }
  };
}

/**
 * A document that cannot be read still produces a record, so the library shows it with an honest
 * status instead of dropping it and leaving the uploader wondering where it went.
 */
function buildUnreadableResult({
  file,
  pageCount,
  textLayerCharCount,
  requestedCounty,
  requestedFiscalYear,
  requestedType,
  pdfType,
  ocrStatus,
  processingStatus,
  message,
  warnings,
  status
}: {
  file: File;
  pageCount: number;
  textLayerCharCount: number;
  requestedCounty?: string;
  requestedFiscalYear?: string;
  requestedType?: DocumentType;
  pdfType: PdfClassification;
  ocrStatus: OcrProcessingStatus;
  processingStatus: string;
  message: string;
  warnings: string[];
  status: DocumentStatus;
}): ExtractionResult {
  const detection = applyUserOverrides(
    detectDocumentMetadata({
      pages: [],
      fileName: file.name,
      isTextBased: false,
      isScanned: true,
      pageCount
    }),
    { requestedCounty, requestedFiscalYear, requestedType }
  );

  const county = getCounty(detection.county.value ?? undefined);
  const fiscalYear = detection.fiscalYear.value ?? "Not stated in document";

  return {
    document: {
      id: `doc-${crypto.randomUUID()}`,
      countyCode: county?.code ?? "",
      countyName: county?.name ?? "Not detected",
      title: detection.title.value,
      fileName: file.name,
      fiscalYear,
      type: detection.documentType.value,
      status,
      uploadedAt: new Date().toISOString(),
      pages: pageCount,
      detection
    },
    lineItems: [],
    analysis: {
      summary: message,
      keyNumbers: [],
      revenueKes: null,
      expenditureKes: null,
      developmentKes: null,
      recurrentKes: null,
      departments: [],
      sectors: [],
      tables: [],
      changes: [],
      clarifications: []
    },
    warnings,
    extractedTextPreview: "",
    extractionStrategy: {
      pdfType,
      textLayerExtraction: textLayerCharCount > 0 ? "failed" : "unavailable",
      textLayerCharCount,
      ocrRequired: true,
      recommendedEngine: getRecommendedOcrEngine(),
      ocrConfigured: isDocumentAiOcrConfigured(),
      ocrProcessingStatus: ocrStatus,
      processingStatus,
      message
    }
  };
}

/** What the uploader chose wins over what was detected, and the field records that it was theirs. */
function applyUserOverrides(
  detection: DocumentDetection,
  overrides: { requestedCounty?: string; requestedFiscalYear?: string; requestedType?: DocumentType }
): DocumentDetection {
  const next = { ...detection };

  if (overrides.requestedCounty && getCounty(overrides.requestedCounty)) {
    next.county = { value: overrides.requestedCounty, confidence: 1, source: "user" };
  }
  if (overrides.requestedFiscalYear) {
    next.fiscalYear = { value: overrides.requestedFiscalYear, confidence: 1, source: "user" };
  }
  if (overrides.requestedType) {
    next.documentType = { value: overrides.requestedType, confidence: 1, source: "user" };
  }

  const confidences = [
    next.county.confidence,
    next.fiscalYear.confidence,
    next.documentType.confidence,
    next.title.confidence
  ];
  next.overallConfidence = Number(
    (confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(2)
  );

  return next;
}

function buildWarnings({
  detection,
  hasCounty,
  rowCount
}: {
  detection: DocumentDetection;
  hasCounty: boolean;
  rowCount: number;
}) {
  const warnings: string[] = [];

  if (!hasCounty) {
    warnings.push("The county could not be detected from this document, so its rows were not indexed to a county.");
  }
  if (detection.fiscalYear.source === "not-found") {
    warnings.push("No financial year was stated in the pages that were read.");
  }
  if (detection.documentType.source === "not-found") {
    warnings.push("The document type could not be identified from its text.");
  }
  if (rowCount === 0 && hasCounty) {
    warnings.push("No budget rows matched. Figures cannot be shown for this document.");
  }

  return warnings;
}
