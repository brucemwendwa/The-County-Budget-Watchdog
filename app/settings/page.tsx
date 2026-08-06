import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { SettingsView } from "@/components/settings-view";
import { isDocumentAiOcrConfigured } from "@/lib/document-ai-ocr";
import { isDurableStorageConfigured } from "@/lib/store";

export const metadata: Metadata = {
  title: "Settings",
  description: "Appearance, selected location, and what this deployment has configured."
};

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Settings"
        description="How this platform is set up, and what that means for the answers it can give you."
      />
      <SettingsView
        platform={{
          modelConfigured: Boolean(process.env.GEMINI_API_KEY),
          ocrConfigured: isDocumentAiOcrConfigured(),
          durableStorage: isDurableStorageConfigured()
        }}
      />
    </div>
  );
}
