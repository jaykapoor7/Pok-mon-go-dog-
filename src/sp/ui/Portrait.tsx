"use client";

/* ════════════════════════════════════════════════════════════════════
   An animal's picture, honestly (Photo Ark discipline, decision 039).

   A real photograph leads, with its credit; one that may show an injury
   starts veiled ("Tap to view", remembered for the session). Without a
   photograph the record says so first, in type, beside a crop of a real,
   openly licensed Indian dog painting (lib/art/sources) captioned as an
   illustration that is not this animal — never passed off as the animal.
   Thumbnails stay typographic: too small to carry the caption.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { EyeOff } from "lucide-react";
import { dogArtFor, WORKS } from "@/lib/art/sources";

const SEEN = "sp2.veil.seen";
const seen = (src: string) => { try { return (JSON.parse(sessionStorage.getItem(SEEN) ?? "[]") as string[]).includes(src); } catch { return false; } };
const remember = (src: string) => { try { const s = new Set(JSON.parse(sessionStorage.getItem(SEEN) ?? "[]") as string[]); s.add(src); sessionStorage.setItem(SEEN, JSON.stringify([...s].slice(-200))); } catch { /* storage blocked */ } };

const GROUNDS = ["#e9dcc6", "#dfe6ee", "#e6e2cf", "#efdcd2", "#dde5da"];
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

export function Portrait({ src, tag, sensitive = false, credit, size = "m", alt, puppy = false }: { src: string | null; tag: string; sensitive?: boolean; credit?: string | null; size?: "s" | "m" | "l"; alt?: string; puppy?: boolean }) {
  const [open, setOpen] = useState(!sensitive);
  useEffect(() => { if (src && sensitive && seen(src)) setOpen(true); }, [src, sensitive]);
  if (!src) {
    const g = GROUNDS[hash(tag) % GROUNDS.length];
    if (size === "s") {
      return (
        <figure className={`portrait is-none is-${size}`} style={{ ["--pg" as string]: g }}>
          <div className="portrait-plate" aria-label={`No photograph recorded for ${tag}`} role="img"><span className="mono">{tag}</span></div>
        </figure>
      );
    }
    /* No photograph: say so first, in type; beside it, a crop of a real, openly licensed
       Indian painting of a dog, captioned as an illustration that is not this animal. */
    const art = dogArtFor(tag, puppy ? "puppy" : null);
    const w = WORKS[art.work];
    return (
      <figure className={`portrait is-none is-art is-${size}${art.ground === "#5d6560" ? " is-dark" : ""}`} style={{ ["--pg" as string]: art.ground }}>
        <div className="portrait-art" data-flip={art.flip ? "" : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="portrait-art-bg" src={art.src} alt="" loading="lazy" decoding="async" draggable={false} />
          <img className="portrait-art-fg" src={art.src} alt="" loading="lazy" decoding="async" draggable={false} />
        </div>
        <div className="portrait-none" role="img" aria-label={`No photograph recorded for ${tag}. Shown instead: an illustration from the painting ${w.title}, not this animal.`}>
          <b>No photograph recorded</b>
          <span className="mono">{tag}</span>
        </div>
        <figcaption className="portrait-credit">Illustration, not this animal · <i>{w.title}</i>{w.date ? `, ${w.date}` : ""} · {w.maker} · {w.source.replace(", Open Access", "")} ({w.licence})</figcaption>
      </figure>
    );
  }
  return (
    <figure className={`portrait is-${size}${open ? "" : " is-veiled"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? `Photograph of ${tag}`} loading="lazy" decoding="async" />
      {!open && (
        <button type="button" className="portrait-veil" onClick={() => { setOpen(true); remember(src); }}>
          <EyeOff size={18} aria-hidden /><b>This photo may show an injury</b><span>Tap to view</span>
        </button>
      )}
      {credit && size !== "s" && <figcaption className="k">{credit}</figcaption>}
    </figure>
  );
}
