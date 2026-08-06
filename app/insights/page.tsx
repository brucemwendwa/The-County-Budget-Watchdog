import type { Metadata } from "next";

import { InsightsView } from "@/components/insights-view";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Insights",
  description: "Sector allocations, departments, key projects, and items needing clarification."
};

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Budget insights"
        description="Sector shares, department allocations, and the largest projects for the place you have selected — all calculated from rows read out of processed documents."
      />
      <InsightsView />
    </div>
  );
}
