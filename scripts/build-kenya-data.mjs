/**
 * Builds the Kenya administrative dataset used by the map and the location pickers.
 *
 * Source: GADM 4.1 Kenya (level 1 = county, level 2 = sub-county/constituency, level 3 = ward).
 * The GADM download is cached under scripts/.geo-cache and is not committed.
 *
 * Outputs:
 *   data/kenya/hierarchy.json                  county -> sub-county -> ward names and codes
 *   public/geo/counties.topo.json              all 47 county outlines
 *   public/geo/subcounties/<county>.topo.json  one county's sub-counties
 *   public/geo/wards/<county>.topo.json        one county's wards
 *
 * Geometry is emitted as TopoJSON so shared borders are stored once and stay watertight after
 * simplification — independently simplified polygons would drift apart and leave visible seams.
 *
 * Run with: node scripts/build-kenya-data.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { quantize } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify, sphericalTriangleArea } from "topojson-simplify";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const cacheDir = path.join(here, ".geo-cache");
const geoOutDir = path.join(root, "public", "geo");
const dataOutDir = path.join(root, "data", "kenya");

const GADM_BASE = "https://geodata.ucdavis.edu/gadm/gadm4.1/json";

/** Fraction of geometry detail retained per level, tuned against the on-screen size of each layer. */
const RETAIN = { counties: 0.32, subCounties: 0.4, wards: 0.55 };
/** Coordinate grid resolution. 1e4 over Kenya's extent is roughly 1 metre — far below one pixel. */
const QUANTIZATION = 1e4;

async function main() {
  await mkdir(cacheDir, { recursive: true });
  await mkdir(path.join(geoOutDir, "subcounties"), { recursive: true });
  await mkdir(path.join(geoOutDir, "wards"), { recursive: true });
  await mkdir(dataOutDir, { recursive: true });

  const [level1, level2, level3] = await Promise.all([download(1), download(2), download(3)]);

  const counties = buildHierarchy(level1, level2, level3);
  await writeJson(path.join(dataOutDir, "hierarchy.json"), {
    source: "GADM 4.1 — Database of Global Administrative Areas (gadm.org)",
    generatedAt: new Date().toISOString(),
    counties
  });

  await writeTopology(
    path.join(geoOutDir, "counties.topo.json"),
    level1.features.map((feature) => ({
      ...feature,
      properties: {
        code: countyCode(feature.properties.NAME_1),
        name: normalizeName(feature.properties.NAME_1),
        level: "county"
      }
    })),
    RETAIN.counties
  );

  for (const county of counties) {
    await writeTopology(
      path.join(geoOutDir, "subcounties", `${county.code}.topo.json`),
      level2.features
        .filter((feature) => countyCode(feature.properties.NAME_1) === county.code)
        .map((feature) => {
          const known = !isUnassignedSubCounty(county.code, feature.properties.NAME_2);
          return {
            ...feature,
            properties: {
              code: known ? subCountyCode(county.code, feature.properties.NAME_2) : null,
              name: known ? subCountyName(county.code, feature.properties.NAME_2) : "Unassigned area",
              level: "sub-county",
              parent: county.code
            }
          };
        }),
      RETAIN.subCounties
    );

    await writeTopology(
      path.join(geoOutDir, "wards", `${county.code}.topo.json`),
      level3.features
        .filter((feature) => countyCode(feature.properties.NAME_1) === county.code)
        .map((feature) => {
          const known =
            !isUnassigned(feature.properties.NAME_3) &&
            !isUnassignedSubCounty(county.code, feature.properties.NAME_2);
          const parent = known ? subCountyCode(county.code, feature.properties.NAME_2) : null;
          return {
            ...feature,
            properties: {
              code: known ? wardCode(parent, feature.properties.NAME_3) : null,
              name: known ? normalizeName(feature.properties.NAME_3) : "Unassigned area",
              level: "ward",
              parent
            }
          };
        }),
      RETAIN.wards
    );
  }

  const wardTotal = counties.reduce(
    (sum, county) => sum + county.subCounties.reduce((inner, sub) => inner + sub.wards.length, 0),
    0
  );
  const subCountyTotal = counties.reduce((sum, county) => sum + county.subCounties.length, 0);
  console.log(`Built ${counties.length} counties, ${subCountyTotal} sub-counties, ${wardTotal} wards.`);
}

/** GADM ships names as run-together words ("DagorettiNorth"), so every label needs unpacking. */
function normalizeName(raw) {
  return raw
    .replace(/\\/g, "/")
    // A quoted single letter is a section marker: "Nyalenda'A'" is Nyalenda A.
    .replace(/'([A-Za-z])'/g, (_, letter) => ` ${letter.toUpperCase()}`)
    // "Ang'Urai" is the ng' digraph, not a word boundary.
    .replace(/'([A-Z])/g, (_, letter) => `'${letter.toLowerCase()}`)
    .replace(/([a-z'.])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function countyCode(rawName) {
  return slug(rawName);
}

function subCountyCode(county, rawName) {
  return `${county}.${slug(correctSubCountyName(county, rawName))}`;
}

function subCountyName(county, rawName) {
  return normalizeName(correctSubCountyName(county, rawName));
}

function wardCode(subCounty, rawName) {
  return `${subCounty}.${slug(rawName)}`;
}

/**
 * Corrections to known defects in the source data, keyed by "<county>|<raw GADM name>".
 *
 * GADM files Baringo's Lembus ward under a sub-county called "805" rather than a constituency name.
 * Lembus is a ward of Eldama Ravine constituency, alongside Lembus Kwen and Lembus/Perkerra which
 * GADM already places there, so the polygon is reattached to its real parent instead of being
 * dropped — dropping it would remove a ward that exists.
 */
const SUB_COUNTY_CORRECTIONS = new Map([["baringo|805", "EldamaRavine"]]);

function correctSubCountyName(countyCode, rawName) {
  return SUB_COUNTY_CORRECTIONS.get(`${countyCode}|${rawName}`) ?? rawName;
}

/** A sub-county is unnamed only if it is still unnamed after corrections are applied. */
function isUnassignedSubCounty(county, rawName) {
  return isUnassigned(correctSubCountyName(county, rawName));
}

/**
 * GADM uses "unknownN" for polygons it could not attribute to a named unit, and occasionally a bare
 * number. Neither is an administrative unit, so they are drawn but never listed or selectable.
 */
function isUnassigned(name) {
  return /^unknown\d*$/i.test(name) || /^[\d\s.-]+$/.test(name);
}

function buildHierarchy(level1, level2, level3) {
  const counties = new Map();

  for (const feature of level1.features) {
    const code = countyCode(feature.properties.NAME_1);
    counties.set(code, { code, name: normalizeName(feature.properties.NAME_1), subCounties: [] });
  }

  const subCounties = new Map();
  for (const feature of level2.features) {
    const county = counties.get(countyCode(feature.properties.NAME_1));
    if (!county) continue;
    if (isUnassignedSubCounty(county.code, feature.properties.NAME_2)) continue;
    const code = subCountyCode(county.code, feature.properties.NAME_2);
    if (subCounties.has(code)) continue;
    const entry = { code, name: subCountyName(county.code, feature.properties.NAME_2), wards: [] };
    subCounties.set(code, entry);
    county.subCounties.push(entry);
  }

  for (const feature of level3.features) {
    const county = countyCode(feature.properties.NAME_1);
    if (isUnassigned(feature.properties.NAME_3) || isUnassignedSubCounty(county, feature.properties.NAME_2)) {
      continue;
    }
    const parent = subCountyCode(county, feature.properties.NAME_2);
    const subCounty = subCounties.get(parent);
    if (!subCounty) continue;
    const code = wardCode(parent, feature.properties.NAME_3);
    if (subCounty.wards.some((ward) => ward.code === code)) continue;
    subCounty.wards.push({ code, name: normalizeName(feature.properties.NAME_3) });
  }

  const sortByName = (a, b) => a.name.localeCompare(b.name);
  const ordered = [...counties.values()].sort(sortByName);
  for (const county of ordered) {
    county.subCounties.sort(sortByName);
    for (const subCounty of county.subCounties) subCounty.wards.sort(sortByName);
  }
  return ordered;
}

async function writeTopology(outPath, features, retain) {
  let topo = topology({ areas: { type: "FeatureCollection", features } });
  topo = presimplify(topo, sphericalTriangleArea);
  const weight = quantile(topo, retain);
  topo = simplify(topo, weight);
  topo = quantize(topo, QUANTIZATION);
  await writeJson(outPath, topo);
}

async function writeJson(outPath, value) {
  await writeFile(outPath, JSON.stringify(value), "utf8");
}

async function download(level) {
  const jsonPath = path.join(cacheDir, `gadm41_KEN_${level}.json`);
  if (!existsSync(jsonPath)) {
    const zipPath = `${jsonPath}.zip`;
    console.log(`Downloading GADM level ${level}...`);
    const response = await fetch(`${GADM_BASE}/gadm41_KEN_${level}.json.zip`);
    if (!response.ok) throw new Error(`GADM level ${level} download failed: ${response.status}`);
    await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
    execFileSync("unzip", ["-o", "-q", zipPath, "-d", cacheDir]);
  }
  return JSON.parse(await readFile(jsonPath, "utf8"));
}

await main();
