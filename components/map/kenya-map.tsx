"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Minus, Plus, RotateCcw } from "lucide-react";

import type { LocationLevel, LocationSelection } from "@/lib/kenya";
import { countyCodeOf, levelOf } from "@/lib/kenya";
import {
  countiesUrl,
  findAreaBounds,
  loadLayer,
  subCountiesUrl,
  wardsUrl,
  type MapArea,
  type MapLayer
} from "@/lib/map/geo-layers";
import {
  boundsToViewBox,
  easeInOut,
  interpolateViewBox,
  project,
  viewBoxToString,
  type Bounds,
  type ViewBox
} from "@/lib/map/projection";
import { cn } from "@/lib/utils";

/** Kenya's extent, used for the first paint before the county layer has loaded. */
const KENYA_BOUNDS: Bounds = (() => {
  const [minX, maxY] = project(33.9, -4.72);
  const [maxX, minY] = project(41.92, 5.51);
  return { minX, minY, maxX, maxY };
})();

const ZOOM_DURATION_MS = 850;
const MIN_VIEW_WIDTH = 0.4;

type KenyaMapProps = {
  selection: LocationSelection;
  onSelect: (level: LocationLevel, code?: string) => void;
  /** Counties that have at least one processed document, marked so coverage is visible at a glance. */
  documentedCounties?: string[];
  className?: string;
};

export function KenyaMap({ selection, onSelect, documentedCounties = [], className }: KenyaMapProps) {
  const level = levelOf(selection);
  const countyCode = countyCodeOf(selection.countyCode);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewBoxRef = useRef<ViewBox | null>(null);
  const targetBoundsRef = useRef<Bounds>(KENYA_BOUNDS);
  const frameRef = useRef<number | null>(null);
  const aspectRef = useRef(1.4);

  const [counties, setCounties] = useState<MapLayer | null>(null);
  const [subCounties, setSubCounties] = useState<MapLayer | null>(null);
  const [wards, setWards] = useState<MapLayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{ name: string; context: string; x: number; y: number } | null>(null);

  const documented = useMemo(() => new Set(documentedCounties), [documentedCounties]);

  const applyViewBox = useCallback((viewBox: ViewBox) => {
    viewBoxRef.current = viewBox;
    svgRef.current?.setAttribute("viewBox", viewBoxToString(viewBox));
  }, []);

  const stopAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  /** Animates the viewport rather than re-rendering React on every frame. */
  const animateToBounds = useCallback(
    (bounds: Bounds, immediate = false) => {
      targetBoundsRef.current = bounds;
      const target = boundsToViewBox(bounds, aspectRef.current);
      const from = viewBoxRef.current;
      stopAnimation();

      const reducedMotion =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!from || immediate || reducedMotion) {
        applyViewBox(target);
        return;
      }

      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / ZOOM_DURATION_MS);
        applyViewBox(interpolateViewBox(from, target, easeInOut(progress)));
        frameRef.current = progress < 1 ? requestAnimationFrame(step) : null;
      };
      frameRef.current = requestAnimationFrame(step);
    },
    [applyViewBox, stopAnimation]
  );

  // Base layer. Everything else is loaded on demand as the user drills in.
  useEffect(() => {
    let active = true;
    loadLayer(countiesUrl())
      .then((layer) => {
        if (!active) return;
        setCounties(layer);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("The map could not be loaded. Use the location pickers to continue.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Selecting a county pulls in both its sub-counties and its wards. The ward file is small and
  // fetching it now means the next drill-down is instant.
  useEffect(() => {
    if (!countyCode) {
      setSubCounties(null);
      setWards(null);
      return;
    }

    let active = true;
    setSubCounties(null);
    setWards(null);

    loadLayer(subCountiesUrl(countyCode))
      .then((layer) => active && setSubCounties(layer))
      .catch(() => undefined);
    loadLayer(wardsUrl(countyCode))
      .then((layer) => active && setWards(layer))
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [countyCode]);

  // Keep the viewport matched to the container so a ward fills the frame at any screen size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0 || box.height === 0) return;
      aspectRef.current = box.width / box.height;
      applyViewBox(boundsToViewBox(targetBoundsRef.current, aspectRef.current));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [applyViewBox]);

  useEffect(() => stopAnimation, [stopAnimation]);

  // The zoom follows the selection: Kenya, then the county, then the sub-county, then the ward.
  useEffect(() => {
    const focus =
      findAreaBounds(wards, selection.wardCode) ??
      findAreaBounds(subCounties, selection.subCountyCode) ??
      findAreaBounds(counties, selection.countyCode) ??
      counties?.bounds ??
      KENYA_BOUNDS;

    animateToBounds(focus);
  }, [animateToBounds, counties, subCounties, wards, selection.countyCode, selection.subCountyCode, selection.wardCode]);

  const zoomBy = useCallback(
    (factor: number, origin?: { x: number; y: number }) => {
      const current = viewBoxRef.current;
      if (!current) return;
      stopAnimation();

      const width = Math.max(MIN_VIEW_WIDTH, current.width * factor);
      const height = width / aspectRef.current;
      // Anchor the zoom on the pointer so the map moves the way a map is expected to.
      const anchorX = origin ? current.x + current.width * origin.x : current.x + current.width / 2;
      const anchorY = origin ? current.y + current.height * origin.y : current.y + current.height / 2;
      const ratio = width / current.width;

      applyViewBox({
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio,
        width,
        height
      });
    },
    [applyViewBox, stopAnimation]
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      const container = containerRef.current;
      if (!container) return;
      event.preventDefault();
      const box = container.getBoundingClientRect();
      zoomBy(event.deltaY > 0 ? 1.15 : 0.87, {
        x: (event.clientX - box.left) / box.width,
        y: (event.clientY - box.top) / box.height
      });
    },
    [zoomBy]
  );

  const dragRef = useRef<{ x: number; y: number; viewBox: ViewBox } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 || !viewBoxRef.current) return;
      stopAnimation();
      dragRef.current = { x: event.clientX, y: event.clientY, viewBox: viewBoxRef.current };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [stopAnimation]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;

      const box = container.getBoundingClientRect();
      const dx = ((event.clientX - drag.x) / box.width) * drag.viewBox.width;
      const dy = ((event.clientY - drag.y) / box.height) * drag.viewBox.height;
      // A drag of a few pixels is a click, not a pan.
      if (!dragging && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) {
        setDragging(true);
      }
      applyViewBox({ ...drag.viewBox, x: drag.viewBox.x - dx, y: drag.viewBox.y - dy });
    },
    [applyViewBox, dragging]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    // Cleared after the click event so a pan does not select whatever was under the pointer.
    window.setTimeout(() => setDragging(false), 0);
  }, []);

  const resetView = useCallback(() => {
    animateToBounds(targetBoundsRef.current);
  }, [animateToBounds]);

  const showHover = useCallback((area: MapArea, context: string, event: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container || !area.code) return;
    const box = container.getBoundingClientRect();
    setHovered({
      name: area.name,
      context,
      x: event.clientX - box.left,
      y: event.clientY - box.top
    });
  }, []);

  const selectArea = useCallback(
    (area: MapArea, areaLevel: LocationLevel) => {
      if (dragging || !area.code) return;
      onSelect(areaLevel, area.code);
    },
    [dragging, onSelect]
  );

  const wardsOfSelectedSubCounty = useMemo(
    () => (wards && selection.subCountyCode ? wards.areas.filter((area) => area.parent === selection.subCountyCode) : []),
    [wards, selection.subCountyCode]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl bg-[hsl(var(--map-water))] select-none",
        className
      )}
    >
      <svg
        ref={svgRef}
        viewBox={viewBoxToString(boundsToViewBox(KENYA_BOUNDS, aspectRef.current))}
        className={cn("h-full w-full touch-none", dragRef.current ? "cursor-grabbing" : "cursor-grab")}
        role="application"
        aria-label="Map of Kenya. Select a county, then a sub-county, then a ward. The location pickers beside the map do the same thing."
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          endDrag();
          setHovered(null);
        }}
      >
        <g>
          {counties?.areas.map((area, index) => {
            const isSelected = area.code === selection.countyCode;
            const interactive = level === "kenya";
            return (
              <path
                key={`${area.code ?? area.name}-${index}`}
                d={area.shape.path}
                className={cn(
                  "transition-[fill,opacity] duration-500",
                  isSelected
                    ? "fill-[hsl(var(--map-land))]"
                    : documented.has(area.code ?? "")
                      ? "fill-[hsl(var(--map-documented))]"
                      : "fill-[hsl(var(--map-land))]",
                  interactive && "hover:fill-[hsl(var(--map-hover))] focus-visible:outline-none",
                  // Kenya recedes as the user drills in, until only the chosen area is left.
                  !isSelected && level === "county" && "opacity-25",
                  !isSelected && level === "sub-county" && "opacity-10",
                  !isSelected && level === "ward" && "opacity-0"
                )}
                stroke="hsl(var(--map-stroke))"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: interactive ? "auto" : "none" }}
                tabIndex={interactive && area.code ? 0 : -1}
                role={interactive ? "button" : undefined}
                aria-label={interactive ? `${area.name} County` : undefined}
                onClick={() => selectArea(area, "county")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectArea(area, "county");
                  }
                }}
                onPointerMove={(event) => interactive && showHover(area, "County", event)}
                onPointerLeave={() => setHovered(null)}
              />
            );
          })}
        </g>

        {level !== "kenya" ? (
          <g>
            {subCounties?.areas.map((area, index) => {
              const isSelected = area.code === selection.subCountyCode;
              const interactive = level === "county" && Boolean(area.code);
              return (
                <path
                  key={`${area.code ?? area.name}-${index}`}
                  d={area.shape.path}
                  className={cn(
                    "transition-[fill,opacity] duration-500",
                    isSelected ? "fill-[hsl(var(--map-selected))]" : "fill-[hsl(var(--map-land-2))]",
                    interactive && "hover:fill-[hsl(var(--map-hover))]",
                    !isSelected && level === "sub-county" && "opacity-25",
                    !isSelected && level === "ward" && "opacity-0"
                  )}
                  stroke="hsl(var(--map-stroke))"
                  strokeWidth={0.7}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: interactive ? "auto" : "none" }}
                  tabIndex={interactive ? 0 : -1}
                  role={interactive ? "button" : undefined}
                  aria-label={interactive ? `${area.name} Sub-county` : undefined}
                  onClick={() => selectArea(area, "sub-county")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectArea(area, "sub-county");
                    }
                  }}
                  onPointerMove={(event) => interactive && showHover(area, "Sub-county", event)}
                  onPointerLeave={() => setHovered(null)}
                />
              );
            })}
          </g>
        ) : null}

        {level === "sub-county" || level === "ward" ? (
          <g>
            {wardsOfSelectedSubCounty.map((area, index) => {
              const isSelected = area.code === selection.wardCode;
              const interactive = level === "sub-county" && Boolean(area.code);
              return (
                <path
                  key={`${area.code ?? area.name}-${index}`}
                  d={area.shape.path}
                  className={cn(
                    "transition-[fill,opacity] duration-500",
                    isSelected ? "fill-[hsl(var(--map-selected))]" : "fill-[hsl(var(--map-land-2))]",
                    interactive && "hover:fill-[hsl(var(--map-hover))]",
                    !isSelected && level === "ward" && "opacity-0"
                  )}
                  stroke="hsl(var(--map-stroke))"
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: interactive ? "auto" : "none" }}
                  tabIndex={interactive ? 0 : -1}
                  role={interactive ? "button" : undefined}
                  aria-label={interactive ? `${area.name} Ward` : undefined}
                  onClick={() => selectArea(area, "ward")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectArea(area, "ward");
                    }
                  }}
                  onPointerMove={(event) => interactive && showHover(area, "Ward", event)}
                  onPointerLeave={() => setHovered(null)}
                />
              );
            })}
          </g>
        ) : null}
      </svg>

      {hovered ? (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border bg-card/95 px-2.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur"
          style={{ left: hovered.x, top: hovered.y }}
        >
          {hovered.name}
          <span className="ml-1.5 font-normal text-muted-foreground">{hovered.context}</span>
        </div>
      ) : null}

      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
        <MapButton label="Zoom in" onClick={() => zoomBy(0.75)}>
          <Plus className="h-4 w-4" />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => zoomBy(1.33)}>
          <Minus className="h-4 w-4" />
        </MapButton>
        <MapButton label="Reset view" onClick={resetView}>
          <RotateCcw className="h-4 w-4" />
        </MapButton>
      </div>

      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/60 text-sm font-medium text-muted-foreground backdrop-blur-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the map of Kenya…
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-x-4 top-4 z-10 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function MapButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md border bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}
