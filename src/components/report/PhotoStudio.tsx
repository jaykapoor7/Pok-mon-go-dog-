"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, Loader2, RotateCcw, ScanSearch, ShieldCheck, Undo2, UserRoundX } from "lucide-react";
import {
  cropRect,
  exportFrame,
  focusPoint,
  maxZoom,
  OUTPUT_ASPECT,
  paint,
  type Frame,
} from "@/lib/photo/frame";
import { detectCarefully, detectPeople, warmDetector, type DetectStage } from "@/lib/photo/detect";
import { hitRegion, regionBox, type Region } from "@/lib/photo/redact";

/* ════════════════════════════════════════════════════════════════════
   What happens between picking a photograph and sending it.

   The preview is the export. It is a canvas drawn by exactly the function
   that writes the file, so what the reporter agrees to is what leaves the
   phone: crop, redaction and all. Nothing is a CSS overlay, because an
   overlay would mean uploading an intact photograph of somebody's face
   and asking every viewer's browser to be polite about it.

   Two modes. Framing is about the animal. Hiding is about everybody else,
   and it opens with whatever the detector found already applied, so the
   safe state is the default and the reporter removes rather than adds.
   ════════════════════════════════════════════════════════════════════ */

/* Big enough to judge a crop on a phone, small enough to redraw on every
   frame of a drag without thinking about it. */
const PREVIEW_W = 720;
const PREVIEW_H = Math.round(PREVIEW_W / OUTPUT_ASPECT);

/* A tap covers a head at the distance people photograph a street dog from.
   The slider moves it between something under a face and something over a
   whole upper body. Fractions of the image width. */
const BRUSH_MIN = 0.035;
const BRUSH_MAX = 0.22;
const BRUSH_DEFAULT = 0.075;

/* Below this a drag is a tap that wobbled, not a rectangle. */
const DRAG_MIN_PX = 14;

type Props = {
  file: File;
  onDone: (file: File, previewUrl: string) => void;
  onCancel: () => void;
};

export function PhotoStudio({ file, onDone, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<Frame>({ focus: { x: 0.5, y: 0.5 }, zoom: 1 });
  const [regions, setRegions] = useState<Region[]>([]);
  const [autoFound, setAutoFound] = useState(0);
  const [ran, setRan] = useState<DetectStage[] | null>(null);
  const [mode, setMode] = useState<"frame" | "hide">("frame");
  const [brush, setBrush] = useState(BRUSH_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [saving, setSaving] = useState(false);
  const [careful, setCareful] = useState<"idle" | "running" | "done">("idle");
  const [undecodable, setUndecodable] = useState(false);
  /* The rectangle being dragged, in preview pixels, or null. */
  const [drawing, setDrawing] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  /* Start pulling the weights the moment the editor mounts, rather than
     when somebody reaches the hiding step: on a slow connection those are
     the same few seconds either way, and this way they overlap the crop. */
  useEffect(() => {
    warmDetector();
  }, []);

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
      setLoading(false);
      /* Applied as they arrive: the native detector answers instantly and
         the model takes as long as the download takes. */
      const report = await detectPeople(img, w, h, (partial) => {
        if (!alive) return;
        setRegions(partial.regions);
        setAutoFound(partial.regions.length);
      });
      if (!alive) return;
      setRegions(report.regions);
      setAutoFound(report.regions.length);
      setRan(report.ran);
      setScanning(false);
    };
    img.onerror = () => {
      if (!alive) return;
      /* Some phones hand over a format the browser will not decode, HEIC
         most often. There is nothing to frame or scan then, so the picture
         goes through as it came rather than the reporter hitting a dead end
         at the first step. */
      setLoading(false);
      setScanning(false);
      setUndecodable(true);
    };
    img.src = url;
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  /* One draw per change, straight from the export painter, plus the marks
     that exist only on screen. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !size) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paint(ctx, img, size.w, size.h, frame, regions, { w: PREVIEW_W, h: PREVIEW_H });
    if (mode !== "hide") return;

    /* Outlines, so somebody can see what is covered and tap it off. Drawn
       after the export painter and never by it, so none of this reaches
       the file. */
    const crop = cropRect(size.w, size.h, frame);
    ctx.save();
    ctx.lineWidth = 2;
    for (const r of regions) {
      const b = regionBox(r, size.w, size.h, crop, PREVIEW_W, PREVIEW_H);
      ctx.strokeStyle = r.origin === "auto" ? "rgba(36,87,206,0.9)" : "rgba(240,91,64,0.95)";
      ctx.beginPath();
      if (r.shape === "rect") ctx.rect(b.left, b.top, b.w, b.h);
      else ctx.ellipse(b.cx, b.cy, b.rx, b.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (drawing) {
      ctx.strokeStyle = "rgba(240,91,64,0.95)";
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(
        Math.min(drawing.x0, drawing.x1),
        Math.min(drawing.y0, drawing.y1),
        Math.abs(drawing.x1 - drawing.x0),
        Math.abs(drawing.y1 - drawing.y0)
      );
    }
    ctx.restore();
  }, [frame, regions, size, mode, drawing]);

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

  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!size || undecodable) return;
    const p = atPointer(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: p.x, y: p.y };
    if (mode === "hide") setDrawing({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !size) return;
    const p = atPointer(e);

    if (mode === "hide") {
      setDrawing((prev) => (prev ? { ...prev, x1: p.x, y1: p.y } : prev));
      return;
    }

    const r = cropRect(size.w, size.h, frame);
    const dx = ((p.x - d.x) / PREVIEW_W) * r.w;
    const dy = ((p.y - d.y) / PREVIEW_H) * r.h;
    drag.current = { ...d, x: p.x, y: p.y };
    setFrame((f) => ({
      ...f,
      focus: {
        x: Math.min(1, Math.max(0, f.focus.x - dx / size.w)),
        y: Math.min(1, Math.max(0, f.focus.y - dy / size.h)),
      },
    }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (mode !== "hide" || !size) {
      setDrawing(null);
      return;
    }

    const box = drawing;
    setDrawing(null);
    if (!box) return;
    const w = Math.abs(box.x1 - box.x0);
    const h = Math.abs(box.y1 - box.y0);
    const aspect = size.w / size.h;

    if (w >= DRAG_MIN_PX || h >= DRAG_MIN_PX) {
      /* A drag is a rectangle: number plates, shop boards with a phone
         number on them, a person no face detector was ever going to see. */
      const a = toSource({ x: Math.min(box.x0, box.x1), y: Math.min(box.y0, box.y1) });
      const b = toSource({ x: Math.max(box.x0, box.x1), y: Math.max(box.y0, box.y1) });
      setRegions((prev) => [
        ...prev,
        {
          id: `manual-${Date.now()}`,
          shape: "rect",
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          rx: (b.x - a.x) / 2,
          ry: ((b.y - a.y) / 2) / aspect,
          origin: "manual",
        },
      ]);
      return;
    }

    /* A tap toggles: on empty ground it hides a head, on something already
       hidden it takes that back off. */
    const s = toSource({ x: box.x0, y: box.y0 });
    setRegions((prev) => {
      const hit = prev.find((r) => hitRegion(r, s, aspect));
      if (hit) return prev.filter((r) => r.id !== hit.id);
      return [
        ...prev,
        {
          id: `manual-${Date.now()}`,
          shape: "ellipse",
          x: s.x,
          y: s.y,
          rx: brush,
          ry: brush,
          origin: "manual",
        },
      ];
    });
  }

  /* The same weights, every rung of the ladder, and a mirrored pass. Costs
     a few seconds and no download, and it is the answer to "are you sure
     you got everyone" that does not involve shipping a bigger model to
     every reporter who never needed it. */
  async function lookAgain() {
    const img = imgRef.current;
    if (!img || !size) return;
    setCareful("running");
    const report = await detectCarefully(img, size.w, size.h, regions);
    setRegions(report.regions);
    setAutoFound(report.regions.filter((r) => r.origin === "auto").length);
    setCareful("done");
  }

  async function accept() {
    const img = imgRef.current;
    if (!img || !size) {
      onDone(file, URL.createObjectURL(file));
      return;
    }
    setSaving(true);
    const out = await exportFrame(img, size.w, size.h, frame, regions, file.name);
    setSaving(false);
    const final = out ?? file;
    onDone(final, URL.createObjectURL(final));
  }

  const zMax = size ? maxZoom(size.w, size.h) : 1;
  const manual = regions.filter((r) => r.origin === "manual").length;

  /* Said plainly, because the alternative is a privacy promise the software
     cannot keep. A detector finds faces; it does not find the man with his
     back to the camera. */
  const scanLine = scanning
    ? "Looking for faces"
    : ran?.includes("unavailable") && regions.length === 0
      ? "Face detection could not load here. Tap anybody who should be hidden."
      : autoFound > 0
        ? `${autoFound} ${autoFound === 1 ? "face" : "faces"} found and hidden. Tap anybody it missed.`
        : "No faces found. It cannot see people facing away, so check the photo yourself.";

  return (
    <div className="photo-studio">
      <div className="photo-studio-stage">
        <canvas
          ref={canvasRef}
          width={PREVIEW_W}
          height={PREVIEW_H}
          className={mode === "hide" ? "is-hiding" : "is-framing"}
          aria-label={
            mode === "hide"
              ? "Tap anybody who should be hidden, or drag a box over something else"
              : "Drag to move the photo inside the frame"
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {loading && (
          <div className="photo-studio-wait">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Centring on the animal
          </div>
        )}
        {!loading && scanning && !undecodable && (
          <div className="photo-studio-wait">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Looking for faces
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
        <>
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
              onClick={() => setMode("hide")}
              aria-pressed={mode === "hide"}
              className="photo-studio-mode"
            >
              <UserRoundX className="h-4 w-4" aria-hidden /> Hide people
              {regions.length > 0 && <b>{regions.length}</b>}
            </button>
          </div>

          {mode === "frame" ? (
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
            <>
              <p className="photo-studio-note">{scanLine}</p>
              <div className="photo-studio-row">
                <label htmlFor="photo-brush">Size</label>
                <input
                  id="photo-brush"
                  type="range"
                  min={BRUSH_MIN}
                  max={BRUSH_MAX}
                  step={0.005}
                  value={brush}
                  onChange={(e) => setBrush(Number(e.target.value))}
                />
                <button
                  type="button"
                  className="photo-studio-reset"
                  onClick={() => setRegions((prev) => prev.slice(0, -1))}
                  disabled={regions.length === 0}
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
                </button>
              </div>
              <div className="photo-studio-row">
                <p className="photo-studio-hint">
                  Drag a box over a number plate, a shop sign, or anyone with
                  their back turned. {manual > 0 && `${manual} added by hand. `}
                  Anything covered is destroyed in the file rather than blurred
                  over.
                </p>
                <button
                  type="button"
                  className="photo-studio-reset"
                  onClick={lookAgain}
                  disabled={scanning || careful === "running"}
                >
                  {careful === "running" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <ScanSearch className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {careful === "running"
                    ? "Looking"
                    : careful === "done"
                      ? "Looked again"
                      : "Look again"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <div className="photo-studio-actions">
        <button type="button" className="photo-studio-cancel" onClick={onCancel}>
          Choose another
        </button>
        <button
          type="button"
          className="photo-studio-accept"
          onClick={accept}
          /* Not while the scan is running. Somebody who taps through in the
             second before it finishes would upload the photograph with
             nobody hidden, which is the one outcome this step exists to
             prevent. */
          disabled={loading || saving || scanning}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden />
          )}
          {scanning ? "Checking the photo" : "Use this photo"}
        </button>
      </div>
    </div>
  );
}
