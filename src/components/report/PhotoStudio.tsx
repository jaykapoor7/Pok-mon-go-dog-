"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, EyeOff, Loader2, RotateCcw, Undo2 } from "lucide-react";
import {
  cropRect,
  detectFaces,
  exportFrame,
  focusPoint,
  maxZoom,
  OUTPUT_ASPECT,
  paint,
  type BlurSpot,
  type Frame,
} from "@/lib/photo/frame";

/* ════════════════════════════════════════════════════════════════════
   What happens between picking a photograph and sending it.

   The preview is the export. It is a canvas drawn by exactly the function
   that writes the file, so what the reporter agrees to is what leaves the
   phone: crop, blur and all. Nothing is a CSS overlay, because an overlay
   would mean uploading an intact photograph of somebody's face and asking
   the viewer's browser to be polite about it.

   Two controls and no more. Drag to move the frame, a slider to close in,
   and tapping a person blurs them. Every extra control here is paid for at
   the step where most reports are already lost.
   ════════════════════════════════════════════════════════════════════ */

/* Big enough to judge a crop on a phone, small enough to redraw on every
   frame of a drag without thinking about it. */
const PREVIEW_W = 720;
const PREVIEW_H = Math.round(PREVIEW_W / OUTPUT_ASPECT);

type Props = {
  file: File;
  /** Called when the reporter accepts the frame. */
  onDone: (file: File, previewUrl: string) => void;
  onCancel: () => void;
};

export function PhotoStudio({ file, onDone, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<Frame>({ focus: { x: 0.5, y: 0.5 }, zoom: 1 });
  const [spots, setSpots] = useState<BlurSpot[]>([]);
  const [autoCount, setAutoCount] = useState<number | null>(null);
  const [mode, setMode] = useState<"frame" | "blur">("frame");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [undecodable, setUndecodable] = useState(false);

  /* Load, then centre on the subject and ask the browser about faces. Both
     are starting positions the reporter can overrule. */
  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      if (!alive) return;
      imgRef.current = img;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setSize({ w, h });
      setFrame({ focus: focusPoint(img, w, h), zoom: 1 });
      const faces = await detectFaces(img, w, h);
      if (!alive) return;
      setSpots(faces);
      setAutoCount(faces.length);
      setBusy(false);
    };
    img.onerror = () => {
      if (!alive) return;
      /* Some phones hand over a format the browser will not decode, HEIC
         most often. There is nothing to frame then, so the picture goes
         through as it came rather than the reporter hitting a dead end at
         the first step. */
      setBusy(false);
      setUndecodable(true);
    };
    img.src = url;
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  /* One draw per change, straight from the export painter. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !size) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paint(ctx, img, size.w, size.h, frame, spots, { w: PREVIEW_W, h: PREVIEW_H });
  }, [frame, spots, size]);

  /* Canvas coordinates from a pointer, whatever the element is scaled to. */
  const atPointer = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) / box.width) * PREVIEW_W,
      y: ((e.clientY - box.top) / box.height) * PREVIEW_H,
    };
  }, []);

  /** Preview pixels back to a point in the source image. */
  const toSource = useCallback(
    (p: { x: number; y: number }) => {
      if (!size) return { x: 0.5, y: 0.5 };
      const r = cropRect(size.w, size.h, frame);
      return {
        x: (r.x + (p.x / PREVIEW_W) * r.w) / size.w,
        y: (r.y + (p.y / PREVIEW_H) * r.h) / size.h,
      };
    },
    [frame, size]
  );

  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!size) return;
    const p = atPointer(e);
    if (mode === "blur") {
      const s = toSource(p);
      setSpots((prev) => {
        /* Tapping a blur again takes it off, which is the only sensible
           thing a second tap on the same spot can mean. */
        const hit = prev.find(
          (b) =>
            Math.hypot((b.x - s.x) * size.w, (b.y - s.y) * size.h) <= b.r * size.w
        );
        if (hit) return prev.filter((b) => b.id !== hit.id);
        /* One size, chosen to cover a head at the distance people
           photograph a street dog from. */
        return [...prev, { id: `tap-${Date.now()}`, x: s.x, y: s.y, r: 0.075 }];
      });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: p.x, y: p.y, moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !size) return;
    const p = atPointer(e);
    const r = cropRect(size.w, size.h, frame);
    const dx = ((p.x - d.x) / PREVIEW_W) * r.w;
    const dy = ((p.y - d.y) / PREVIEW_H) * r.h;
    drag.current = { ...d, x: p.x, y: p.y, moved: true };
    setFrame((f) => ({
      ...f,
      focus: {
        x: Math.min(1, Math.max(0, f.focus.x - dx / size.w)),
        y: Math.min(1, Math.max(0, f.focus.y - dy / size.h)),
      },
    }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null;
  }

  async function accept() {
    const img = imgRef.current;
    if (!img || !size) {
      onDone(file, URL.createObjectURL(file));
      return;
    }
    setSaving(true);
    const out = await exportFrame(img, size.w, size.h, frame, spots, file.name);
    setSaving(false);
    const final = out ?? file;
    onDone(final, URL.createObjectURL(final));
  }

  const zMax = size ? maxZoom(size.w, size.h) : 1;

  return (
    <div className="photo-studio">
      <div className="photo-studio-stage">
        <canvas
          ref={canvasRef}
          width={PREVIEW_W}
          height={PREVIEW_H}
          className={mode === "blur" ? "is-blurring" : "is-framing"}
          aria-label={
            mode === "blur"
              ? "Tap anybody who should be blurred"
              : "Drag to move the photo inside the frame"
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {busy && (
          <div className="photo-studio-wait">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Centring on the animal
          </div>
        )}
        {undecodable && (
          <p className="photo-studio-wait">
            This phone&rsquo;s photo format cannot be edited here. It will be
            sent as it is.
          </p>
        )}
      </div>

      {!undecodable && (
      <div className="photo-studio-modes" role="group" aria-label="Photo tools">
        <button
          type="button"
          onClick={() => setMode("frame")}
          aria-pressed={mode === "frame"}
          className="photo-studio-mode"
        >
          <Crop className="h-4 w-4" aria-hidden /> Frame
        </button>
        <button
          type="button"
          onClick={() => setMode("blur")}
          aria-pressed={mode === "blur"}
          className="photo-studio-mode"
        >
          <EyeOff className="h-4 w-4" aria-hidden /> Blur people
        </button>
      </div>
      )}

      {undecodable ? null : mode === "frame" ? (
        <div className="photo-studio-row">
          <label htmlFor="photo-zoom">Closer</label>
          <input
            id="photo-zoom"
            type="range"
            min={1}
            max={Math.max(1.01, zMax)}
            step={0.01}
            value={frame.zoom}
            onChange={(e) => setFrame((f) => ({ ...f, zoom: Number(e.target.value) }))}
          />
          <button
            type="button"
            className="photo-studio-reset"
            onClick={() =>
              imgRef.current && size
                ? setFrame({ focus: focusPoint(imgRef.current, size.w, size.h), zoom: 1 })
                : undefined
            }
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Re-centre
          </button>
        </div>
      ) : (
        <div className="photo-studio-row">
          <p className="photo-studio-note">
            {autoCount === null
              ? "Looking for faces."
              : autoCount > 0
                ? `${autoCount} ${autoCount === 1 ? "face" : "faces"} found and blurred. Tap anybody else.`
                : "Tap anybody who should not be on a public map."}
          </p>
          <button
            type="button"
            className="photo-studio-reset"
            onClick={() => setSpots((prev) => prev.slice(0, -1))}
            disabled={spots.length === 0}
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
          </button>
        </div>
      )}

      <div className="photo-studio-actions">
        <button type="button" className="photo-studio-cancel" onClick={onCancel}>
          Choose another
        </button>
        <button
          type="button"
          className="photo-studio-accept"
          onClick={accept}
          disabled={busy || saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Use this photo
        </button>
      </div>
    </div>
  );
}
