import type { Metadata } from "next";

import { AskAiPanel } from "@/components/ask-ai-panel";
import { LocationPickers } from "@/components/location-pickers";
import { PageHeader } from "@/components/page-header";
import { ResponsibleAiNote } from "@/components/responsible-ai-note";

export const metadata: Metadata = {
  title: "Ask AI",
  description: "Ask questions about county budgets, answered from processed source documents."
};

export default function AskAiPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Ask about the budget"
        description="Every answer names the document and page it came from, and says so plainly when the documents do not contain the answer."
      />
      <div className="rounded-xl border bg-card p-4">
        <LocationPickers fieldsClassName="sm:grid-cols-3" />
      </div>
      <AskAiPanel />
      <ResponsibleAiNote />
    </div>
  );
}
