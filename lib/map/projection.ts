/**
 * Projection and path geometry for the Kenya map.
 *
 * A Web Mercator projection is used rather than raw longitude/latitude so county shapes are not
 * visibly stretched. Kenya straddles the equator, where Mercator distortion is negligible, so the
 * result reads as the shape people recognise.
 *
 * Projected units are scaled by SCALE to keep coordinates in a range where SVG stroke widths and
 * rounding behave predictably.
 */

const SCALE = 1000;
const DEG_TO_RAD = Math.PI / 180;

export type Point = [number, number];

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Shape = {
  path: string;
  bounds: Bounds;
  /** Area-weighted centre of the largest ring, used to place labels. */
  center: Point;
};

export function project(lon: number, lat: number): Point {
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const x = lon * DEG_TO_RAD * SCALE;
  // Negated so that north is up in SVG's downward-growing y axis.
  const y = -Math.log(Math.tan(Math.PI / 4 + (clampedLat * DEG_TO_RAD) / 2)) * SCALE;
  return [x, y];
}

type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: string; coordinates: unknown };

/** Builds the SVG path, bounding box, and label anchor for one administrative area in one pass. */
export function buildShape(geometry: GeoJsonGeometry): Shape {
  const polygons: number[][][][] =
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : geometry.type === "MultiPolygon"
        ? (geometry.coordinates as number[][][][])
        : [];

  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  };

  let path = "";
  let largestArea = 0;
  let center: Point = [0, 0];

  for (const polygon of polygons) {
    for (const [ringIndex, ring] of polygon.entries()) {
      if (ring.length < 3) continue;

      let ringPath = "";
      let signedArea = 0;
      let cx = 0;
      let cy = 0;
      let previous: Point | null = null;

      for (const [index, coordinate] of ring.entries()) {
        const point = project(coordinate[0], coordinate[1]);
        const x = round(point[0]);
        const y = round(point[1]);

        if (x < bounds.minX) bounds.minX = x;
        if (y < bounds.minY) bounds.minY = y;
        if (x > bounds.maxX) bounds.maxX = x;
        if (y > bounds.maxY) bounds.maxY = y;

        ringPath += index === 0 ? `M${x} ${y}` : `L${x} ${y}`;

        if (previous) {
          const cross = previous[0] * point[1] - point[0] * previous[1];
          signedArea += cross;
          cx += (previous[0] + point[0]) * cross;
          cy += (previous[1] + point[1]) * cross;
        }
        previous = point;
      }

      path += `${ringPath}Z`;

      // Only outer rings (index 0) are candidates for the label anchor; holes are skipped.
      const area = Math.abs(signedArea / 2);
      if (ringIndex === 0 && area > largestArea && signedArea !== 0) {
        largestArea = area;
        center = [round(cx / (3 * signedArea)), round(cy / (3 * signedArea))];
      }
    }
  }

  if (largestArea === 0) {
    center = [round((bounds.minX + bounds.maxX) / 2), round((bounds.minY + bounds.maxY) / 2)];
  }

  return { path, bounds, center };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function mergeBounds(list: Bounds[]): Bounds | null {
  const usable = list.filter((bounds) => Number.isFinite(bounds.minX));
  if (usable.length === 0) return null;

  return usable.reduce((merged, bounds) => ({
    minX: Math.min(merged.minX, bounds.minX),
    minY: Math.min(merged.minY, bounds.minY),
    maxX: Math.max(merged.maxX, bounds.maxX),
    maxY: Math.max(merged.maxY, bounds.maxY)
  }));
}

/**
 * Fits bounds into a viewport of a given aspect ratio, with padding, so a selected ward fills the
 * frame the same way a whole county does.
 */
export function boundsToViewBox(bounds: Bounds, aspect: number, padding = 0.12): ViewBox {
  const rawWidth = Math.max(bounds.maxX - bounds.minX, 0.001);
  const rawHeight = Math.max(bounds.maxY - bounds.minY, 0.001);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const paddedWidth = rawWidth * (1 + padding * 2);
  const paddedHeight = rawHeight * (1 + padding * 2);

  // Grow whichever dimension is short so nothing is cropped.
  const width = Math.max(paddedWidth, paddedHeight * aspect);
  const height = width / aspect;

  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}

export function viewBoxToString(viewBox: ViewBox) {
  return `${viewBox.x.toFixed(2)} ${viewBox.y.toFixed(2)} ${viewBox.width.toFixed(2)} ${viewBox.height.toFixed(2)}`;
}

export function interpolateViewBox(from: ViewBox, to: ViewBox, t: number): ViewBox {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    width: from.width + (to.width - from.width) * t,
    height: from.height + (to.height - from.height) * t
  };
}

export function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function pointInBounds(point: Point, bounds: Bounds) {
  return point[0] >= bounds.minX && point[0] <= bounds.maxX && point[1] >= bounds.minY && point[1] <= bounds.maxY;
}
