import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const points = [
  "AI summarizes official public documents only.",
  "Users should verify important findings from source documents.",
  "Items needing clarification are informational, not accusations.",
  "The platform supports transparency, public participation, and civic understanding.",
  "The system does not replace official audit, legal, or oversight institutions."
];

export function ResponsibleAiNote({ className = "" }: { className?: string }) {
  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardContent className="flex gap-4 p-5">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
        <div>
          <p className="font-bold">Responsible AI</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
