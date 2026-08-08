/**
 * Upload size ceiling, shared by the browser check and the API route so the two never disagree.
 *
 * Override with NEXT_PUBLIC_MAX_PDF_MB. It has to be NEXT_PUBLIC_ because the upload panel reads it
 * in the browser; Next.js inlines the value at build time, so changing it means a rebuild.
 *
 * Two ceilings sit above this one and cannot be raised from here:
 *  - Vercel caps a function request body at 4.5MB, so anything larger needs a direct-to-storage
 *    upload rather than a POST through /api/upload. Self-hosted (Dockerfile) has no such cap.
 *  - Document AI synchronous processing rejects payloads over 20MB, so OCR fallback stops working
 *    on scans bigger than that even when the text-layer path is happy.
 */
const DEFAULT_MAX_PDF_MB = 100;

function resolveMaxPdfMb() {
  const configured = Number(process.env.NEXT_PUBLIC_MAX_PDF_MB);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_PDF_MB;
}

export const MAX_PDF_MB = resolveMaxPdfMb();
export const MAX_PDF_BYTES = Math.floor(MAX_PDF_MB * 1024 * 1024);
export const MAX_PDF_LABEL = `${MAX_PDF_MB}MB`;
export const MAX_PDF_ERROR = `PDF must be ${MAX_PDF_LABEL} or smaller.`;
