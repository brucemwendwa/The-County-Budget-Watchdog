import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ResponsibleAiNote } from "@/components/responsible-ai-note";
import { UploadPanel } from "@/components/upload-panel";

export const metadata: Metadata = {
  title: "Upload a document",
  description: "Add a county budget PDF for processing."
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Add a budget document"
        description="Upload a county budget, finance bill, supplementary budget, development plan, fiscal strategy paper, or implementation report. The county, financial year, and document type are read from the document itself."
      />
      <UploadPanel />
      <ResponsibleAiNote />
    </div>
  );
}
