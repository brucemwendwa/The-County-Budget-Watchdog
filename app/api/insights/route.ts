import { NextResponse } from "next/server";

import { getLocationInsights } from "@/lib/location-insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const insights = await getLocationInsights(
    {
      countyCode: params.get("countyCode") ?? undefined,
      subCountyCode: params.get("subCountyCode") ?? undefined,
      wardCode: params.get("wardCode") ?? undefined
    },
    { fiscalYear: params.get("fiscalYear") ?? undefined }
  );

  return NextResponse.json(insights);
}
