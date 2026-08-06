import "server-only";

import hierarchyData from "@/data/kenya/hierarchy.json";
import {
  findCounty,
  findSubCounty,
  findWard,
  resolveLocation,
  type KenyaHierarchy,
  type LocationSelection
} from "@/lib/kenya";

/**
 * The full hierarchy is bundled into the server runtime so API routes can validate a submitted
 * county, sub-county, or ward without a network round trip.
 */
export const kenyaHierarchy = hierarchyData as KenyaHierarchy;

export function getCounty(code: string | undefined) {
  return findCounty(kenyaHierarchy, code);
}

export function getSubCounty(code: string | undefined) {
  return findSubCounty(kenyaHierarchy, code);
}

export function getWard(code: string | undefined) {
  return findWard(kenyaHierarchy, code);
}

export function resolve(selection: LocationSelection) {
  return resolveLocation(kenyaHierarchy, selection);
}

/**
 * Confirms a submitted selection describes a real place and that each level is actually the parent
 * of the next, so a ward cannot be filed under a sub-county it does not belong to.
 */
export function validateSelection(selection: LocationSelection):
  | { ok: true; county: NonNullable<ReturnType<typeof getCounty>>; subCounty?: ReturnType<typeof getSubCounty>; ward?: ReturnType<typeof getWard> }
  | { ok: false; error: string } {
  const county = getCounty(selection.countyCode);
  if (!county) {
    return { ok: false, error: "Unknown county." };
  }

  if (!selection.subCountyCode) {
    return { ok: true, county };
  }

  const subCounty = getSubCounty(selection.subCountyCode);
  if (!subCounty || !subCounty.code.startsWith(`${county.code}.`)) {
    return { ok: false, error: "Unknown sub-county for this county." };
  }

  if (!selection.wardCode) {
    return { ok: true, county, subCounty };
  }

  const ward = getWard(selection.wardCode);
  if (!ward || !ward.code.startsWith(`${subCounty.code}.`)) {
    return { ok: false, error: "Unknown ward for this sub-county." };
  }

  return { ok: true, county, subCounty, ward };
}

/** Best-effort match of free text (from a PDF) to a county, used by document auto-detection. */
export function matchCountyByName(text: string) {
  const haystack = text.toLowerCase();
  let best: { code: string; name: string; index: number } | null = null;

  for (const county of kenyaHierarchy.counties) {
    const index = haystack.indexOf(county.name.toLowerCase());
    if (index === -1) continue;
    if (!best || index < best.index) {
      best = { code: county.code, name: county.name, index };
    }
  }

  return best;
}
