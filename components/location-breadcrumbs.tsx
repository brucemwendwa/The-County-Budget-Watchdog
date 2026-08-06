"use client";

import { ChevronRight, MapPin } from "lucide-react";

import { useLocationState } from "@/components/location-provider";
import { locationTrail } from "@/lib/kenya";
import { cn } from "@/lib/utils";

/**
 * The trail from Kenya down to the selected ward. Each step is clickable, which is how the user
 * zooms back out — the map follows the same selection, so the two can never disagree.
 */
export function LocationBreadcrumbs({ className }: { className?: string }) {
  const { location, select } = useLocationState();
  const trail = locationTrail(location);

  return (
    <nav aria-label="Selected location" className={cn("flex items-center gap-1 overflow-x-auto", className)}>
      <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      {trail.map((step, index) => {
        const isLast = index === trail.length - 1;
        return (
          <span key={`${step.level}-${step.code ?? "kenya"}`} className="flex shrink-0 items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
            {isLast ? (
              <span aria-current="location" className="text-sm font-semibold">
                {step.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => select(step.level, step.code)}
                className="rounded px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {step.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
