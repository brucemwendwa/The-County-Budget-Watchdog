"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  resolveLocation,
  selectionFor,
  selectionsEqual,
  type KenyaHierarchy,
  type LocationLevel,
  type LocationSelection,
  type ResolvedLocation
} from "@/lib/kenya";

type LocationContextValue = {
  hierarchy: KenyaHierarchy | null;
  hierarchyLoading: boolean;
  selection: LocationSelection;
  location: ResolvedLocation;
  /** Selects a level and clears everything below it, the way the map and breadcrumbs both behave. */
  select: (level: LocationLevel, code?: string) => void;
  reset: () => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

const STORAGE_KEY = "cbt-location";

/**
 * Holds the one selection the whole app shares.
 *
 * The map, the breadcrumbs, the pickers, and every page read from here, which is what keeps them in
 * sync — there is no second copy of the selection to drift. It lives in the root layout so moving
 * between pages keeps your place, and it is mirrored into the URL so a view can be shared.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [hierarchy, setHierarchy] = useState<KenyaHierarchy | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [selection, setSelection] = useState<LocationSelection>({});

  useEffect(() => {
    let active = true;
    fetch("/api/kenya")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: KenyaHierarchy | null) => {
        if (!active) return;
        setHierarchy(data);
        setHierarchyLoading(false);
      })
      .catch(() => active && setHierarchyLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Restored after mount rather than during render, so the server and client agree on first paint.
  useEffect(() => {
    const fromUrl = readSelectionFromUrl();
    if (fromUrl.countyCode) {
      setSelection(fromUrl);
      return;
    }
    const stored = readStoredSelection();
    if (stored) setSelection(stored);
  }, []);

  const select = useCallback((level: LocationLevel, code?: string) => {
    setSelection((current) => {
      const next = selectionFor(level, code);
      return selectionsEqual(current, next) ? current : next;
    });
  }, []);

  const reset = useCallback(() => setSelection({}), []);

  useEffect(() => {
    writeSelectionToUrl(selection);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // Storage can be unavailable in private browsing; the selection still works for this session.
    }
  }, [selection]);

  const value = useMemo<LocationContextValue>(
    () => ({
      hierarchy,
      hierarchyLoading,
      selection,
      location: resolveLocation(hierarchy, selection),
      select,
      reset
    }),
    [hierarchy, hierarchyLoading, selection, select, reset]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationState() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocationState must be used inside LocationProvider");
  }
  return context;
}

function readSelectionFromUrl(): LocationSelection {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    countyCode: params.get("county") ?? undefined,
    subCountyCode: params.get("subcounty") ?? undefined,
    wardCode: params.get("ward") ?? undefined
  };
}

/**
 * Written with replaceState rather than a router push: the drill-down is a single continuous view,
 * so it should never add history entries or trigger a navigation.
 */
function writeSelectionToUrl(selection: LocationSelection) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);

  const apply = (key: string, value?: string) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

  apply("county", selection.countyCode);
  apply("subcounty", selection.subCountyCode);
  apply("ward", selection.wardCode);

  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function readStoredSelection(): LocationSelection | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationSelection;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
