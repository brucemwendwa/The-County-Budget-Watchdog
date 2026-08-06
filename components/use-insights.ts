"use client";

import { useEffect, useState } from "react";

import type { LocationSelection } from "@/lib/kenya";
import type { LocationInsights } from "@/lib/location-insights";

type InsightsState = {
  data: LocationInsights | null;
  loading: boolean;
  error: string | null;
};

/**
 * Loads the processed-document view of the current place.
 *
 * Refetches whenever the selection or the financial year changes, and ignores responses from a
 * request the user has already moved past so a slow reply cannot overwrite a newer one.
 */
export function useInsights(selection: LocationSelection, fiscalYear?: string): InsightsState {
  const [state, setState] = useState<InsightsState>({ data: null, loading: true, error: null });

  const key = `${selection.countyCode ?? ""}|${selection.subCountyCode ?? ""}|${selection.wardCode ?? ""}|${
    fiscalYear ?? ""
  }`;

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));

    const params = new URLSearchParams();
    if (selection.countyCode) params.set("countyCode", selection.countyCode);
    if (selection.subCountyCode) params.set("subCountyCode", selection.subCountyCode);
    if (selection.wardCode) params.set("wardCode", selection.wardCode);
    if (fiscalYear) params.set("fiscalYear", fiscalYear);

    fetch(`/api/insights?${params.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load budget information.");
        return response.json() as Promise<LocationInsights>;
      })
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error: Error) => active && setState({ data: null, loading: false, error: error.message }));

    return () => {
      active = false;
    };
    // The key collapses the selection into one comparable value.
  }, [key, selection.countyCode, selection.subCountyCode, selection.wardCode, fiscalYear]);

  return state;
}
