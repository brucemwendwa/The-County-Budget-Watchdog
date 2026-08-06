"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { SectorAllocation } from "@/lib/types";
import { formatKes } from "@/lib/utils";

/**
 * Ranked sector allocations.
 *
 * One measure across categories, so the bars carry magnitude and nothing else — a single hue is
 * correct here, and a second colour would imply an identity distinction the data does not have.
 * Built as a description list rather than a canvas so it is readable by a screen reader, selectable,
 * and printable, and so the figures stay legible at any width.
 */
export function SectorAllocationChart({ sectors }: { sectors: SectorAllocation[] }) {
  const max = Math.max(...sectors.map((sector) => sector.allocationKes), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sector allocation</CardTitle>
        <CardDescription>Share of the allocation in extracted rows, largest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {sectors.length === 0 ? (
          <EmptyState
            title="No sector breakdown yet"
            description="Sector shares are worked out from budget rows. None have been extracted for this place."
          />
        ) : (
          <dl className="space-y-3">
            {sectors.map((sector) => (
              <div key={sector.sector} className="group">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="truncate text-sm font-medium">{sector.sector}</dt>
                  <dd className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatKes(sector.allocationKes)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{sector.share}%</span>
                  </dd>
                </div>
                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${sector.sector}: ${formatKes(sector.allocationKes)}, ${sector.share}% of the extracted allocation`}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${max > 0 ? Math.max(2, (sector.allocationKes / max) * 100) : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sector.itemCount} row{sector.itemCount === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
