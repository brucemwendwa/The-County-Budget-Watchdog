/** Minimum non-whitespace characters to treat a PDF as having a usable text layer. */
export const MIN_TEXT_LAYER_CHARS = 80;

export type PdfTextLayerResult = {
  /** Full document text, pages joined in order. */
  text: string;
  /** Text of each page, index 0 being page 1. Empty for scanned pages. */
  pages: string[];
  pageCount: number;
  charCount: number;
  usable: boolean;
  /** Title from the PDF metadata, when the producer set one. */
  metadataTitle?: string;
};

type PdfJsPage = {
  pageNumber?: number;
  pageIndex?: number;
  getTextContent: (options: Record<string, boolean>) => Promise<{
    items: Array<{ str: string; transform: number[] }>;
  }>;
};

/**
 * Reads the PDF text layer page by page.
 *
 * Page-accurate text is the point: every figure this app shows has to cite the page it came from,
 * and a document-wide blob can only ever support an estimate.
 */
export async function extractPdfTextLayer(file: File): Promise<PdfTextLayerResult> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const pages: string[] = [];

    const parsed = await pdfParse(buffer, {
      pagerender: (async (pageData: PdfJsPage) => {
        const text = await renderPage(pageData);
        const pageNumber = pageData.pageNumber ?? (pageData.pageIndex ?? pages.length) + 1;
        pages[pageNumber - 1] = text;
        return text;
      }) as unknown as (pageData: unknown) => string
    });

    const filledPages = Array.from({ length: parsed.numpages || pages.length }, (_, index) => pages[index] ?? "");
    const text = filledPages.join("\n\n");
    const charCount = text.replace(/\s+/g, "").length;

    return {
      text,
      pages: filledPages,
      pageCount: parsed.numpages || filledPages.length || 1,
      charCount,
      usable: charCount >= MIN_TEXT_LAYER_CHARS,
      metadataTitle: readMetadataTitle(parsed.info)
    };
  } catch {
    return { text: "", pages: [], pageCount: 0, charCount: 0, usable: false };
  }
}

/** Groups text items onto lines by their vertical position, the way budget tables are laid out. */
async function renderPage(pageData: PdfJsPage): Promise<string> {
  const content = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false
  });

  let lastY: number | undefined;
  let text = "";
  for (const item of content.items) {
    const y = item.transform[5];
    if (lastY === undefined || lastY === y) {
      text += item.str;
    } else {
      text += `\n${item.str}`;
    }
    lastY = y;
  }
  return text;
}

function readMetadataTitle(info: unknown): string | undefined {
  if (!info || typeof info !== "object") return undefined;
  const title = (info as { Title?: unknown }).Title;
  return typeof title === "string" && title.trim().length > 3 ? title.trim() : undefined;
}

export async function readFileBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

/** Splits OCR output into pages so OCR'd documents can cite pages the same way. */
export function splitOcrTextIntoPages(text: string, pageCount: number): string[] {
  const formFeed = text.split("\f");
  if (formFeed.length > 1) {
    return formFeed;
  }
  if (pageCount <= 1) {
    return [text];
  }
  // Document AI returns one text blob; divide it evenly so page references stay ordered and
  // approximate rather than invented per page.
  const size = Math.ceil(text.length / pageCount);
  return Array.from({ length: pageCount }, (_, index) => text.slice(index * size, (index + 1) * size));
}
