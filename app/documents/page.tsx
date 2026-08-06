import type { Metadata } from "next";

import { DocumentsBrowser } from "@/components/documents-browser";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Documents",
  description: "Official county budget documents processed on this platform."
};

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Budget documents"
        description="County budgets, finance bills, supplementary budgets, development plans, and implementation reports. Each one shows how far processing got, so you can tell what its figures are based on."
      />
      <DocumentsBrowser />
    </div>
  );
}
