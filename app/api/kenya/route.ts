import { NextResponse } from "next/server";

import { kenyaHierarchy } from "@/lib/kenya-server";

export const dynamic = "force-static";

/**
 * The administrative hierarchy is a fixed dataset, so it is served once and cached hard. The client
 * needs the whole tree to keep the map, the breadcrumbs, and the location pickers in sync.
 */
export function GET() {
  return NextResponse.json(kenyaHierarchy, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400"
    }
  });
}
