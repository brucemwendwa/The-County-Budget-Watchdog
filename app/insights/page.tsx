import { Suspense } from "react";

import { CountyInsightsPage } from "@/components/county-insights-page";
import { getResidentDashboardData } from "@/lib/data";

export default function InsightsPage() {
  const data = getResidentDashboardData();
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl p-6 text-muted-foreground">Loading county insights…</main>}>
      <CountyInsightsPage data={data} />
    </Suspense>
  );
}
