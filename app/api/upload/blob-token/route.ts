import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Issues short-lived tokens so the browser can upload a PDF straight to Vercel Blob.
 *
 * Vercel caps a function request body at 4.5MB, which a county budget PDF clears easily, so large
 * files cannot be POSTed through /api/upload at all. The browser uploads to Blob instead and then
 * hands /api/upload just the resulting URL. The bytes never pass through a function.
 *
 * Returns 501 when no Blob store is attached — self-hosted deployments have no body cap and use the
 * direct multipart POST instead, so the client treats that as "fall back", not "fail".
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage is not configured." }, { status: 501 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["application/pdf"],
        // Staging only: /api/upload deletes the blob once the document has been read.
        validUntil: Date.now() + 60 * 60 * 1000,
        addRandomSuffix: true
      }),
      // Blob calls this from its own servers, so it never fires on localhost. Nothing depends on it
      // — the client drives the parse step itself once the upload resolves.
      onUploadCompleted: async () => {}
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Blob token request failed", error);
    return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  }
}
