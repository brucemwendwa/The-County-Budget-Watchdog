/** Minimum non-whitespace characters to treat a PDF as having a usable text layer. */
export const MIN_TEXT_LAYER_CHARS = 80;

export type PdfTextLayerResult = {
  text: string;
  pageCount: number;
  charCount: number;
  usable: boolean;
};

export async function extractPdfTextLayer(file: File): Promise<PdfTextLayerResult> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text ?? "";
    const charCount = text.replace(/\s+/g, "").length;

    return {
      text,
      pageCount: parsed.numpages ?? 1,
      charCount,
      usable: charCount >= MIN_TEXT_LAYER_CHARS
    };
  } catch {
    return {
      text: "",
      pageCount: 1,
      charCount: 0,
      usable: false
    };
  }
}

export async function readFileBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}
