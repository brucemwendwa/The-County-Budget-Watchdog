import { Storage } from "@google-cloud/storage";

export async function storePdf(file: File, documentId: string) {
  if (!process.env.GCS_BUCKET) {
    return null;
  }

  const storage = new Storage();
  const bucket = storage.bucket(process.env.GCS_BUCKET);
  const objectName = `budget-pdfs/${documentId}/${file.name}`;
  const object = bucket.file(objectName);

  await object.save(Buffer.from(await file.arrayBuffer()), {
    contentType: file.type || "application/pdf",
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=0"
    }
  });

  return `gs://${process.env.GCS_BUCKET}/${objectName}`;
}
