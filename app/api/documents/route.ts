import { NextResponse } from "next/server";

import { isDurableStorageConfigured, listDocuments } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const countyCode = new URL(request.url).searchParams.get("countyCode") ?? undefined;
  const documents = await listDocuments(countyCode);

  return NextResponse.json({
    documents,
    durableStorage: isDurableStorageConfigured()
  });
}
