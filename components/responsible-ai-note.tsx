import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const POINTS = [
  "Answers come only from budget documents processed on this platform, and each one names the page it was read from.",
  "When the documents do not contain an answer, the assistant says so instead of estimating.",
  "Items needing clarification are prompts for a question, not findings of wrongdoing.",
  "Extraction is automated and imperfect. Check anything important against the source page before relying on it.",
  "This platform supports public participation. It does not replace audit, legal, or oversight institutions."
];

export function ResponsibleAiNote({ className = "" }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="flex gap-4 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-sm font-bold">How to read these answers</p>
          <ul className="mt-2.5 space-y-2 text-sm leading-6 text-muted-foreground">
            {POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
