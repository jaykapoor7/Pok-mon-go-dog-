"use client";

import { useCallback, useRef, useState } from "react";
import { Plus, Minus, Locate } from "lucide-react";
import type { Dog } from "@/lib/types";
import { projectToBox, DELHI_ZONES, DELHI_CENTER } from "@/lib/delhi";
import { PhotoMarker } from "./PhotoMarker";

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
  const [isDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  // Calm, muted canvas palette (light / dark).
  const P = isDark
    ? {
        base: "#0d0d0f",
        terrain: "radial-gradient(circle at 30% 20%, #131316 0, #0d0d0f 62%)",
        grid: "rgba(255,255,255,0.022)",
        river: "rgba(120,150,180,0.30)",
        green: "rgba(120,150,110,0.14)",
        ring: "#0d0d0f",
        label: "rgba(255,255,255,0.34)",
      }
    : {
        base: "#eceeec",
        terrain: "radial-gradient(circle at 30% 20%, #f4f5f3 0, #e7eae7 62%)",
        grid: "rgba(0,0,0,0.018)",
        river: "rgba(150,178,200,0.45)",
        green: "rgba(150,178,150,0.30)",
        ring: "#ffffff",
        label: "rgba(60,55,50,0.40)",
      };

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
      className="relative h-full w-full touch-none select-none overflow-hidden"
      style={{ cursor: t.scale > 1 ? "grab" : "default", backgroundColor: P.base }}
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
        {/* faux terrain — muted canvas with a barely-there grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `${P.terrain}, repeating-linear-gradient(0deg, ${P.grid} 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, ${P.grid} 0 1px, transparent 1px 56px)`,
          }}
        />
        {/* Yamuna river + a soft green belt, gently understated */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d="M62 0 C 58 20, 70 35, 64 50 C 58 65, 68 85, 60 100"
            stroke={P.river}
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M0 70 C 25 64, 45 72, 70 60 C 85 53, 95 58, 100 54"
            stroke={P.green}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* zone labels */}
        {DELHI_ZONES.map((z) => {
          const { x, y } = projectToBox(z.lat, z.lng);
          return (
            <span
              key={z.name}
              className="pointer-events-none absolute -translate-x-1/2 font-medium tracking-tight"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                fontSize: `${9 / t.scale}px`,
                color: P.label,
              }}
            >
              {z.name}
            </span>
          );
        })}

        {/* player "you are here" avatar (decorative, Pokémon-Go style) */}
        {(() => {
          const { x, y } = projectToBox(DELHI_CENTER.lat, DELHI_CENTER.lng);
          return (
            <div
              aria-hidden
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / t.scale})` }}
            >
              <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paw-500/15" />
              <span className="relative block h-3.5 w-3.5 rounded-full bg-paw-500 ring-[3px] ring-white shadow-md dark:ring-bark-900" />
            </div>
          );
        })()}

        {/* dog markers — meowmbai-style photo thumbnails; counter-scaled. */}
        {dogs.map((dog) => {
          const { x, y } = projectToBox(dog.lat, dog.lng);
          return (
            <div
              key={dog.id}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute hover:z-20 focus-within:z-20"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: `translate(-50%, -50%) scale(${1 / t.scale})`,
              }}
            >
              <PhotoMarker
                photo={dog.cover_photo}
                seed={dog.id}
                count={dog.sightings_count}
                urgent={dog.needs_help}
                size={44}
                label={dog.name ?? "Dog"}
                onClick={() => onSelect?.(dog)}
              />
            </div>
          );
        })}
      </div>

      {/* zoom controls — premium glass; stop pointer events bubbling to the
          pan surface so its pointer capture doesn't swallow the button click. */}
      <div
        className="glass absolute right-3 top-32 z-20 flex flex-col overflow-hidden rounded-2xl shadow-card"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => buttonZoom(1.4)}
          className="flex h-9 w-9 items-center justify-center text-bark-600 transition-colors hover:bg-black/[0.04] dark:text-bark-200 dark:hover:bg-white/[0.06]"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="mx-2 h-px bg-black/[0.06] dark:bg-white/[0.08]" />
        <button
          onClick={() => buttonZoom(1 / 1.4)}
          className="flex h-9 w-9 items-center justify-center text-bark-600 transition-colors hover:bg-black/[0.04] dark:text-bark-200 dark:hover:bg-white/[0.06]"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="mx-2 h-px bg-black/[0.06] dark:bg-white/[0.08]" />
        <button
          onClick={reset}
          className="flex h-9 w-9 items-center justify-center text-bark-600 transition-colors hover:bg-black/[0.04] dark:text-bark-200 dark:hover:bg-white/[0.06]"
          aria-label="Reset view"
        >
          <Locate className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
