import type { County, ExtractionResult, WardAllocation } from "@/lib/types";

type ParseBudgetInput = {
  file: File;
  county: County;
  fiscalYear: string;
};

export async function parseBudgetDocument({ file, county, fiscalYear }: ParseBudgetInput): Promise<ExtractionResult> {
  const text = await extractText(file);
  const allocations = extractAllocationsFromText(text, county, fiscalYear);
  const scannedWarning =
    text.trim().length < 80
      ? ["No usable PDF text layer was found. For scanned image PDFs, configure Google Document AI OCR credentials."]
      : [];

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
    allocations,
    warnings:
      allocations.length > 0
        ? scannedWarning
        : [
            ...scannedWarning,
            "No budget rows were extracted. Try a text-based county budget PDF, or configure Document AI for scanned tables."
          ],
    extractedTextPreview:
      text.slice(0, 500) || "No text layer found. OCR processor should be enabled for scanned PDFs."
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
    /department|vote|programme|health|water|education|roads|transport|agriculture|finance|public works|sanitation/i.test(line) &&
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

function estimatePages(text: string) {
  const formFeedPages = text.split("\f").filter((page) => page.trim()).length;
  if (formFeedPages > 0) {
    return formFeedPages;
  }

  return Math.max(1, Math.ceil(text.length / 2400));
}
