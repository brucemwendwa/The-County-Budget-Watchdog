"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, MousePointerClick, Upload } from "lucide-react";

import { LocationDashboard } from "@/components/dashboard/location-dashboard";
import { LocationPickers } from "@/components/location-pickers";
import { useLocationState } from "@/components/location-provider";
import { Button } from "@/components/ui/button";
import { KENYA_DATA_SOURCE } from "@/lib/kenya";

/**
 * The map is heavy and browser-only — it measures its container and animates a viewport — so it is
 * loaded on the client after the shell has painted rather than blocking it.
 */
const KenyaMap = dynamic(() => import("@/components/map/kenya-map").then((module) => module.KenyaMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
      Loading the map of Kenya…
    </div>
  )
});

/**
 * The whole journey in one view: Kenya, county, sub-county, ward, then the budget.
 *
 * Drilling in never navigates. The map zooms, the panel beside it changes, and the URL is updated
 * in place so the view can still be shared.
 */
export function HomeWorkspace({ documentedCounties }: { documentedCounties: string[] }) {
  const { selection, select, location } = useLocationState();
  const hasCounty = Boolean(location.county);

  return (
    <div className="flex flex-col gap-4 p-4 lg:h-[calc(100vh-3.5rem)] lg:flex-row lg:gap-5 lg:p-5">
      <section
        aria-label="Map of Kenya"
        className="relative h-[55vh] min-h-[320px] shrink-0 overflow-hidden rounded-xl border lg:h-full lg:min-h-0 lg:flex-1"
      >
        <KenyaMap selection={selection} onSelect={select} documentedCounties={documentedCounties} />

        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-xs">
          <p className="pointer-events-auto inline-flex items-center gap-2 rounded-md border bg-card/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
            <MousePointerClick className="h-3.5 w-3.5 text-primary" aria-hidden />
            {!hasCounty
              ? "Click a county to zoom in"
              : !location.subCounty
                ? "Click a sub-county"
                : !location.ward
                  ? "Click a ward"
                  : `${location.ward.name} Ward`}
          </p>
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-4 lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto xl:w-[30rem]">
        {!hasCounty ? <Welcome /> : null}

        <div className="rounded-xl border bg-card p-4">
          <LocationPickers />
        </div>

        {hasCounty ? <LocationDashboard /> : null}

        <p className="px-1 pb-2 text-xs leading-5 text-muted-foreground">
          Boundaries and the county, sub-county, and ward hierarchy come from {KENYA_DATA_SOURCE}. Budget figures come
          only from documents processed on this platform.
        </p>
      </aside>
    </div>
  );
}

function Welcome() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h1 className="text-xl font-bold tracking-tight">Track. Understand. Participate.</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Find your ward on the map, read what the county budget records for it, ask questions answered from the source
        pages, and add your own idea for what should be funded.
      </p>

      <ol className="mt-4 space-y-2.5">
        {[
          "Choose your county on the map",
          "Zoom into your sub-county",
          "Select your ward",
          "Read the budget, ask questions, share an idea"
        ].map((step, index) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {index + 1}
            </span>
            <span className="leading-6">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/documents">
            Browse documents
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            Upload a budget PDF
          </Link>
        </Button>
      </div>
    </div>
  );
}
