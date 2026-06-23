"use client";

import { useCallback, useRef, useState } from "react";
import { Plus, Minus, Locate } from "lucide-react";
import type { Dog } from "@/lib/types";
import { markerMetaFor } from "@/lib/marker-state";
import { projectToBox, DELHI_ZONES } from "@/lib/delhi";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

interface Transform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Interactive stylised map of Delhi (used when no Mapbox token is set).
 * Supports drag-to-pan, pinch-to-zoom, ctrl/⌘-wheel zoom, double-click zoom and
 * +/- buttons — so the map feels alive even without Mapbox. Tapping a pin opens
 * the same quick card as the live map.
 */
export function FallbackMap({
  dogs,
  onSelect,
}: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
}) {
  const [t, setT] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPan = useRef<{ x: number; y: number } | null>(null);
  const pinchDist = useRef<number | null>(null);
  const moved = useRef(false);

  const clamp = useCallback((next: Transform): Transform => {
    const el = containerRef.current;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next.scale));
    const x = Math.min(0, Math.max(w * (1 - scale), next.x));
    const y = Math.min(0, Math.max(h * (1 - scale), next.y));
    return { x, y, scale };
  }, []);

  const zoomAround = useCallback(
    (factor: number, cx: number, cy: number) => {
      setT((prev) => {
        const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
        const k = scale / prev.scale;
        return clamp({ x: cx - k * (cx - prev.x), y: cy - k * (cy - prev.y), scale });
      });
    },
    [clamp]
  );

  const relative = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  };

  function onPointerDown(e: React.PointerEvent) {
    containerRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 1) {
      lastPan.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      lastPan.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchDist.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = relative((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAround(dist / pinchDist.current, mid.x, mid.y);
      pinchDist.current = dist;
      moved.current = true;
    } else if (lastPan.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      lastPan.current = { x: e.clientX, y: e.clientY };
      setT((prev) => clamp({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
    if (pointers.current.size === 1) {
      const remaining = [...pointers.current.values()][0];
      lastPan.current = { x: remaining.x, y: remaining.y };
    } else if (pointers.current.size === 0) {
      lastPan.current = null;
    }
  }

  function onWheel(e: React.WheelEvent) {
    // Only hijack the wheel for zoom when ctrl/⌘ is held, so the page can
    // still scroll past the map normally.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const p = relative(e.clientX, e.clientY);
    zoomAround(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
  }

  function onDoubleClick(e: React.MouseEvent) {
    const p = relative(e.clientX, e.clientY);
    zoomAround(1.6, p.x, p.y);
  }

  function buttonZoom(factor: number) {
    const el = containerRef.current;
    zoomAround(factor, (el?.clientWidth ?? 0) / 2, (el?.clientHeight ?? 0) / 2);
  }

  function reset() {
    setT({ x: 0, y: 0, scale: 1 });
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-[#e8efe6]"
      style={{ cursor: t.scale > 1 ? "grab" : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
    >
      {/* transform layer */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
        }}
      >
        {/* faux terrain */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, #f0f4ec 0, #e3ebe0 60%), repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 40px)",
          }}
        />
        {/* Yamuna river */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d="M62 0 C 58 20, 70 35, 64 50 C 58 65, 68 85, 60 100"
            stroke="#a5c8e1"
            strokeWidth="3.5"
            fill="none"
            opacity="0.7"
            strokeLinecap="round"
          />
          <path
            d="M0 70 C 25 64, 45 72, 70 60 C 85 53, 95 58, 100 54"
            stroke="#cdd9c4"
            strokeWidth="6"
            fill="none"
            opacity="0.5"
          />
        </svg>

        {/* zone labels */}
        {DELHI_ZONES.map((z) => {
          const { x, y } = projectToBox(z.lat, z.lng);
          return (
            <span
              key={z.name}
              className="pointer-events-none absolute -translate-x-1/2 font-medium text-bark-400"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                fontSize: `${9 / t.scale}px`,
              }}
            >
              {z.name}
            </span>
          );
        })}

        {/* dog pins (counter-scaled so they stay a constant size) */}
        {dogs.map((dog) => {
          const { x, y } = projectToBox(dog.lat, dog.lng);
          const meta = markerMetaFor(dog);
          return (
            <button
              key={dog.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelect?.(dog)}
              className="absolute transition-transform hover:z-20 focus:z-20"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: `translate(-50%, -50%) scale(${1 / t.scale})`,
              }}
              aria-label={`${dog.name} — ${meta.label}`}
            >
              {dog.needs_help && (
                <span
                  className="absolute inset-0 -z-10 rounded-full animate-pulse-ring"
                  style={{ backgroundColor: meta.color }}
                />
              )}
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] ring-[3px] ring-white shadow-[0_3px_10px_rgba(17,17,19,0.28)] dark:ring-bark-900"
                style={{ backgroundColor: meta.color }}
              >
                {meta.emoji}
              </span>
            </button>
          );
        })}
      </div>

      {/* legend */}
      <div className="pointer-events-none absolute bottom-4 left-3 glass rounded-2xl px-3 py-2 text-[10px] shadow-card">
        <p className="mb-0.5 font-semibold text-bark-700 dark:text-bark-100">
          Interactive map
        </p>
        <p className="text-bark-400">Drag to pan · pinch / ⌘-scroll to zoom</p>
      </div>

      {/* zoom controls — stop pointer events bubbling to the pan/zoom surface
          so the container's pointer capture doesn't swallow the button click. */}
      <div
        className="absolute right-3 top-32 z-20 flex flex-col gap-1.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => buttonZoom(1.4)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-bark-700 shadow-card hover:bg-paw-50"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => buttonZoom(1 / 1.4)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-bark-700 shadow-card hover:bg-paw-50"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={reset}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-bark-700 shadow-card hover:bg-paw-50"
          aria-label="Reset view"
        >
          <Locate className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
