import { feature } from "topojson-client";

import { buildShape, mergeBounds, type Bounds, type Shape } from "@/lib/map/projection";
import type { LocationLevel } from "@/lib/kenya";

/** One drawable administrative area: its identity plus its projected geometry. */
export type MapArea = {
  /** Null for polygons the source could not attribute to a named unit; these are drawn but inert. */
  code: string | null;
  name: string;
  level: LocationLevel;
  parent: string | null;
  shape: Shape;
};

export type MapLayer = {
  areas: MapArea[];
  bounds: Bounds | null;
};

type LayerProperties = {
  code: string | null;
  name: string;
  level: string;
  parent?: string | null;
};

const cache = new Map<string, Promise<MapLayer>>();

export function countiesUrl() {
  return "/geo/counties.topo.json";
}

export function subCountiesUrl(countyCode: string) {
  return `/geo/subcounties/${countyCode}.topo.json`;
}

export function wardsUrl(countyCode: string) {
  return `/geo/wards/${countyCode}.topo.json`;
}

/**
 * Loads and projects a TopoJSON layer once per URL.
 *
 * Projection is the expensive part — thousands of coordinates per county — so the finished paths
 * are cached for the life of the page. Concurrent callers share the same in-flight promise, which
 * matters because selecting a county triggers both a sub-county and a ward load.
 */
export function loadLayer(url: string): Promise<MapLayer> {
  const existing = cache.get(url);
  if (existing) return existing;

  const request = fetchLayer(url).catch((error: unknown) => {
    // A failed load must not poison the cache, or the layer can never be retried.
    cache.delete(url);
    throw error;
  });

  cache.set(url, request);
  return request;
}

async function fetchLayer(url: string): Promise<MapLayer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Map layer unavailable (${response.status})`);
  }

  const topology = await response.json();
  const collection = feature(topology, topology.objects.areas) as unknown as {
    features: Array<{ properties: LayerProperties; geometry: { type: string; coordinates: unknown } }>;
  };

  const areas: MapArea[] = collection.features.map((item) => ({
    code: item.properties.code ?? null,
    name: item.properties.name,
    level: item.properties.level as LocationLevel,
    parent: item.properties.parent ?? null,
    shape: buildShape(item.geometry as Parameters<typeof buildShape>[0])
  }));

  return { areas, bounds: mergeBounds(areas.map((area) => area.shape.bounds)) };
}

/**
 * Bounds of one administrative unit.
 *
 * A unit can arrive as more than one polygon — an island, an exclave, or a source file that split
 * it — so every polygon carrying the code is merged. Using only the first would zoom to a fragment.
 */
export function findAreaBounds(layer: MapLayer | null, code: string | undefined): Bounds | null {
  if (!layer || !code) return null;
  const matches = layer.areas.filter((area) => area.code === code);
  return matches.length > 0 ? mergeBounds(matches.map((area) => area.shape.bounds)) : null;
}
