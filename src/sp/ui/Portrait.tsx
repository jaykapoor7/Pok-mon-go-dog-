"use client";

/* ════════════════════════════════════════════════════════════════════
   An animal's picture, honestly (Photo Ark discipline, decision 039).

   A real photograph leads, with its credit; one that may show an injury
   starts veiled ("Tap to view", remembered for the session). Without a
   photograph the record gets a typographic plate that says so — the
   animal's ID set large on a printed ground — never an illustration
   passed off as the animal.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { EyeOff } from "lucide-react";

const SEEN = "sp2.veil.seen";
const seen = (src: string) => { try { return (JSON.parse(sessionStorage.getItem(SEEN) ?? "[]") as string[]).includes(src); } catch { return false; } };
const remember = (src: string) => { try { const s = new Set(JSON.parse(sessionStorage.getItem(SEEN) ?? "[]") as string[]); s.add(src); sessionStorage.setItem(SEEN, JSON.stringify([...s].slice(-200))); } catch { /* storage blocked */ } };

const GROUNDS = ["#e9dcc6", "#dfe6ee", "#e6e2cf", "#efdcd2", "#dde5da"];
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

export function Portrait({ src, tag, sensitive = false, credit, size = "m", alt }: { src: string | null; tag: string; sensitive?: boolean; credit?: string | null; size?: "s" | "m" | "l"; alt?: string }) {
  const [open, setOpen] = useState(!sensitive);
  useEffect(() => { if (src && sensitive && seen(src)) setOpen(true); }, [src, sensitive]);
  if (!src) {
    const g = GROUNDS[hash(tag) % GROUNDS.length];
    return (
      <figure className={`portrait is-none is-${size}`} style={{ ["--pg" as string]: g }}>
        <div className="portrait-plate" aria-label={`No photograph recorded for ${tag}`} role="img">
          <span className="mono">{tag}</span>
          <svg viewBox="0 0 100 60" aria-hidden><path d="M0 46 Q25 36 50 44 T100 40" fill="none" stroke="currentColor" strokeWidth=".8" /><path d="M0 52 Q30 44 60 50 T100 48" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".6" /></svg>
          <em>No photograph recorded</em>
        </div>
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
