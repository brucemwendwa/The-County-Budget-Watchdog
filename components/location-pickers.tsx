"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { useLocationState } from "@/components/location-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { searchLocations } from "@/lib/kenya";
import { cn } from "@/lib/utils";

/**
 * The keyboard route through the same hierarchy the map draws.
 *
 * Both read and write the one shared selection, so choosing "Mavoko" here zooms the map, and
 * clicking Mavoko on the map moves these pickers. Neither is a copy of the other.
 */
export function LocationPickers({
  className,
  fieldsClassName,
  children
}: {
  className?: string;
  fieldsClassName?: string;
  /** Extra filters rendered alongside the location fields, e.g. a document-type picker. */
  children?: React.ReactNode;
}) {
  const { hierarchy, hierarchyLoading, selection, location, select } = useLocationState();

  const subCounties = location.county?.subCounties ?? [];
  const wards = location.subCounty?.wards ?? [];

  return (
    <div className={cn("space-y-3", className)}>
      <LocationSearch />

      <div className={cn("grid gap-3", fieldsClassName)}>
        <Field label="County">
        <Select
          value={selection.countyCode ?? ""}
          disabled={hierarchyLoading}
          onChange={(event) => select(event.target.value ? "county" : "kenya", event.target.value)}
          options={[
            { label: hierarchyLoading ? "Loading counties…" : "All of Kenya", value: "" },
            ...(hierarchy?.counties.map((county) => ({ label: county.name, value: county.code })) ?? [])
          ]}
        />
      </Field>

      <Field label="Sub-county">
        <Select
          value={selection.subCountyCode ?? ""}
          disabled={!location.county}
          onChange={(event) =>
            event.target.value ? select("sub-county", event.target.value) : select("county", selection.countyCode)
          }
          options={[
            { label: location.county ? "All sub-counties" : "Select a county first", value: "" },
            ...subCounties.map((item) => ({ label: item.name, value: item.code }))
          ]}
        />
      </Field>

      <Field label="Ward">
        <Select
          value={selection.wardCode ?? ""}
          disabled={!location.subCounty}
          onChange={(event) =>
            event.target.value ? select("ward", event.target.value) : select("sub-county", selection.subCountyCode)
          }
          options={[
            { label: location.subCounty ? "All wards" : "Select a sub-county first", value: "" },
            ...wards.map((item) => ({ label: item.name, value: item.code }))
          ]}
        />
        </Field>

        {children}
      </div>
    </div>
  );
}

/** Jumps straight to any county, sub-county, or ward by name. */
export function LocationSearch({ className }: { className?: string }) {
  const { hierarchy, select } = useLocationState();
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLocations(hierarchy, query), [hierarchy, query]);

  return (
    <div className={cn("relative", className)}>
      <label className="sr-only" htmlFor="location-search">
        Search for a county, sub-county, or ward
      </label>
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
      <Input
        id="location-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search any county, sub-county, or ward"
        autoComplete="off"
        className="pl-9 pr-9"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setQuery("")}
          className="absolute right-2 top-2.5 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {results.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-card shadow-lg">
          {results.map((result) => (
            <li key={`${result.level}-${result.code}`}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                onClick={() => {
                  select(result.level, result.code);
                  setQuery("");
                }}
              >
                <span className="text-sm font-semibold">{result.label}</span>
                <span className="text-xs text-muted-foreground">{result.context}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
