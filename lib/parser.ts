import type { County, ExtractionResult, WardAllocation } from "@/lib/types";
import { wardAllocations } from "@/data/sample-budget";

type ParseBudgetInput = {
  file: File;
  county: County;
  fiscalYear: string;
};

export async function parseBudgetDocument({ file, county, fiscalYear }: ParseBudgetInput): Promise<ExtractionResult> {
  const text = await extractText(file);
  const allocations = extractAllocationsFromText(text, county, fiscalYear);

  return {
    document: {
      id: `doc-${crypto.randomUUID()}`,
      county,
      title: file.name.replace(/\.pdf$/i, ""),
      fiscalYear,
      type: "approved-budget",
      status: allocations.length > 0 ? "review-ready" : "needs-attention",
      uploadedAt: new Date().toISOString(),
      pages: estimatePages(text)
    },
    allocations: allocations.length > 0 ? allocations : wardAllocations.filter((item) => item.county === county).slice(0, 3),
    warnings:
      allocations.length > 0
        ? []
        : ["Used demo extraction fallback. Connect Google Document AI for production table fidelity."],
    extractedTextPreview: text.slice(0, 260) || "No text layer found. OCR processor should be enabled for scanned PDFs."
  };
}

async function extractText(file: File) {
  if (process.env.DOCUMENT_AI_PROCESSOR_ID && process.env.GOOGLE_CLOUD_PROJECT) {
    return extractWithDocumentAi(file);
  }

  return extractLocalPdfText(file);
}

async function extractWithDocumentAi(file: File) {
  const documentAi = await import("@google-cloud/documentai").catch(() => null);

  if (!documentAi?.DocumentProcessorServiceClient) {
    return extractLocalPdfText(file);
  }

  const client = new documentAi.DocumentProcessorServiceClient();
  const name = client.processorPath(
    process.env.GOOGLE_CLOUD_PROJECT!,
    process.env.DOCUMENT_AI_LOCATION ?? "us",
    process.env.DOCUMENT_AI_PROCESSOR_ID!
  );
  const buffer = Buffer.from(await file.arrayBuffer());
  const [result] = await client.processDocument({
    name,
    rawDocument: {
      content: buffer.toString("base64"),
      mimeType: "application/pdf"
    }
  });

  return result.document?.text ?? "";
}

async function extractLocalPdfText(file: File) {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    return parsed.text;
  } catch {
    return "";
  }
}

function extractAllocationsFromText(text: string, county: County, fiscalYear: string): WardAllocation[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line, index) => {
      const amount = line.match(/(?:KES|KSH|Kshs?\.?)\s?([\d,]+)/i);
      const ward = line.match(/([A-Z][A-Za-z\s]+)\s+Ward/i);
      if (!amount || !ward) {
        return null;
      }

      const allocation = Number(amount[1].replaceAll(",", ""));
      return {
        id: `alloc-${crypto.randomUUID()}`,
        county,
        ward: ward[1].trim(),
        constituency: "Extracted constituency",
        department: inferDepartment(line),
        programme: "Extracted programme",
        project: line.slice(0, 140),
        fiscalYear,
        allocationKes: allocation,
        expenditureKes: 0,
        budgetType: /recurrent|salary|operation/i.test(line) ? "recurrent" : "development",
        page: Math.max(1, Math.ceil((index + 1) / 45)),
        confidence: 0.62,
        status: "underspent"
      } satisfies WardAllocation;
    })
    .filter((item): item is WardAllocation => Boolean(item))
    .slice(0, 40);
}

function inferDepartment(line: string) {
  if (/health|clinic|hospital|dispensary/i.test(line)) {
    return "Health Services";
  }
  if (/road|drainage|bridge|transport/i.test(line)) {
    return "Roads and Transport";
  }
  if (/water|sewer|sanitation/i.test(line)) {
    return "Water and Sanitation";
  }
  if (/ecde|school|classroom|education/i.test(line)) {
    return "Education";
  }
  return "County Administration";
}

function estimatePages(text: string) {
  return Math.max(1, Math.ceil(text.length / 2400));
}
