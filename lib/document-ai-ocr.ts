/**
 * Google Document AI OCR for scanned (image-based) county budget PDFs.
 *
 * Required for OCR:
 * - GOOGLE_PROJECT_ID or GOOGLE_CLOUD_PROJECT
 * - GOOGLE_LOCATION or DOCUMENT_AI_LOCATION (default: us)
 * - GOOGLE_DOCUMENT_AI_PROCESSOR_ID or DOCUMENT_AI_PROCESSOR_ID
 * - GOOGLE_APPLICATION_CREDENTIALS (path) and/or GOOGLE_SERVICE_ACCOUNT_JSON (inline JSON)
 */

export type DocumentAiOcrConfig = {
  projectId: string;
  location: string;
  processorId: string;
  configured: boolean;
  credentialsAvailable: boolean;
};

export type DocumentAiOcrResult = {
  text: string;
  pageCount: number;
};

const RECOMMENDED_ENGINE = "Google Document AI OCR";

export function getRecommendedOcrEngine() {
  return RECOMMENDED_ENGINE;
}

export function getDocumentAiOcrConfig(): DocumentAiOcrConfig {
  const projectId = process.env.GOOGLE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
  const location = process.env.GOOGLE_LOCATION ?? process.env.DOCUMENT_AI_LOCATION ?? "us";
  const processorId =
    process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID ?? process.env.DOCUMENT_AI_PROCESSOR_ID ?? "";
  const credentialsAvailable = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  );

  return {
    projectId,
    location,
    processorId,
    configured: Boolean(projectId && processorId),
    credentialsAvailable
  };
}

export function isDocumentAiOcrConfigured(): boolean {
  const config = getDocumentAiOcrConfig();
  return config.configured && config.credentialsAvailable;
}

export function isDocumentAiOcrPartiallyConfigured(): boolean {
  const config = getDocumentAiOcrConfig();
  return config.configured && !config.credentialsAvailable;
}

function getClientOptions(): { credentials?: object } | undefined {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    try {
      return { credentials: JSON.parse(inlineJson) as object };
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Run Document AI OCR on a PDF buffer. Throws if not configured or the API call fails.
 */
export async function extractTextWithDocumentAiOcr(
  buffer: Buffer,
  mimeType = "application/pdf"
): Promise<DocumentAiOcrResult> {
  const config = getDocumentAiOcrConfig();

  if (!config.configured) {
    throw new Error("DOCUMENT_AI_NOT_CONFIGURED");
  }

  if (!config.credentialsAvailable) {
    throw new Error("DOCUMENT_AI_CREDENTIALS_MISSING");
  }

  const documentAi = await import("@google-cloud/documentai").catch(() => null);
  if (!documentAi?.DocumentProcessorServiceClient) {
    throw new Error("DOCUMENT_AI_CLIENT_UNAVAILABLE");
  }

  const clientOptions = getClientOptions();
  const client = clientOptions
    ? new documentAi.DocumentProcessorServiceClient(clientOptions)
    : new documentAi.DocumentProcessorServiceClient();
  const name = client.processorPath(config.projectId, config.location, config.processorId);

  const [result] = await client.processDocument({
    name,
    rawDocument: {
      content: buffer.toString("base64"),
      mimeType
    }
  });

  const text = result.document?.text ?? "";
  const pageCount = result.document?.pages?.length ?? estimatePagesFromText(text);

  return { text, pageCount: Math.max(1, pageCount) };
}

function estimatePagesFromText(text: string) {
  const formFeedPages = text.split("\f").filter((page) => page.trim()).length;
  if (formFeedPages > 0) {
    return formFeedPages;
  }
  return Math.max(1, Math.ceil(text.length / 2400));
}
