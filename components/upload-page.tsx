import { FileUp } from "lucide-react";

import { ResponsibleAiNote } from "@/components/responsible-ai-note";
import { UploadPanel } from "@/components/upload-panel";
import { Badge } from "@/components/ui/badge";

export function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Badge variant="secondary">Document upload</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Upload missing budget document</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          If a county document is missing or outdated, upload a PDF for text extraction and AI indexing. PDF only.
          Processing may use Document AI or local pdf-parse depending on configuration.
        </p>
      </div>
      <UploadPanel />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileUp className="h-4 w-4" />
        Supported types: County Budget Estimates, Finance Bill, Supplementary Budget, ADP, CFSP, Implementation Report.
      </p>
      <ResponsibleAiNote />
    </main>
  );
}
