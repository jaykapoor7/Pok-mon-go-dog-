"use client";

/* ════════════════════════════════════════════════════════════════════
   The Kind Hour Foundation's classroom documents.

   Their originals, credited to them and opened from their shared Drive,
   never re-edited. Every document is visible at once: a typographic cover
   (not an image of the deck), who it is for, its length and languages,
   and what it is about. Preview opens the original in a dialog; Open
   opens it at the source. StrayPaw's own facilitation note sits apart,
   labelled as ours; a content warning reads as a warning.

   `ids` narrows the library to the documents paired with a workshop.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Eye, X } from "lucide-react";
import { KIND_HOUR_MATERIALS, type KindHourMaterial } from "@/lib/platform/education";
import "./academy.css";

export function KindHourLibrary({ ids, title }: { ids?: string[]; title?: string }) {
  const docs = ids ? KIND_HOUR_MATERIALS.filter((m) => ids.includes(m.id)) : KIND_HOUR_MATERIALS;
  const [open, setOpen] = useState<KindHourMaterial | null>(null);
  const compact = !!ids;
  return (
    <section id={compact ? undefined : "kind-hour"} className={`kh${compact ? " is-pair" : ""}`} aria-labelledby={compact ? "kh-pair-title" : "kh-title"}>
      {compact
        ? <header className="kh-head"><h2 id="kh-pair-title">{title ?? "Classroom material to pair with it"}</h2><p>Original documents by The Kind Hour Foundation, chosen by StrayPaw for this session.</p></header>
        : <header className="kh-head">
            <p className="kh-by">Classroom library · by The Kind Hour Foundation</p>
            <h2 id="kh-title">Teach it with their originals.</h2>
            <p>Five teaching decks on animals, empathy and coexistence, made by The Kind Hour Foundation and shared for classrooms. Preview them here or open the originals.</p>
          </header>}
      <ol className="kh-list">
        {docs.map((m) => {
          const sensitive = m.id === "hello";
          return (
            <li key={m.id} className="kh-doc">
              <div className={`kh-cover is-${m.id}`} aria-hidden="true"><small>The Kind Hour Foundation</small><b>{m.title}</b><span>{m.slides} slides</span></div>
              <div className="kh-body">
                <h3>{m.title}</h3>
                <p className="kh-meta">{m.audience} · {m.slides} slides · {m.languages}</p>
                <p className="kh-purpose">{m.purpose}</p>
                {!compact && <ul className="kh-themes" aria-label="Themes">{m.themes.map((t) => <li key={t}>{t}</li>)}</ul>}
                <p className={`kh-note${sensitive ? " is-warn" : ""}`}>{sensitive ? <AlertTriangle size={15} aria-hidden /> : null}<span><b>{sensitive ? "Content note from StrayPaw" : "StrayPaw’s note"}</b>{m.facilitatorNote}</span></p>
                <div className="kh-act">
                  <button type="button" className="btn is-ink" onClick={() => setOpen(m)}><Eye size={16} aria-hidden />Preview</button>
                  <a className="btn" href={m.driveUrl} target="_blank" rel="noreferrer">Open original<ArrowUpRight size={16} aria-hidden /><span className="sr-only"> (opens Google Drive in a new tab)</span></a>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {!compact && <p className="kh-credit">All five documents are created by and belong to The Kind Hour Foundation and open from their shared Google Drive. Notes marked “StrayPaw” are ours, not the Foundation’s.</p>}
      <Preview doc={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function Preview({ doc, onClose }: { doc: KindHourMaterial | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (doc && !d.open) d.showModal(); else if (!doc && d.open) d.close(); }, [doc]);
  return (
    <dialog ref={ref} className="kh-dialog" aria-label={doc ? `${doc.title}, by The Kind Hour Foundation` : "Document preview"} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      {doc && <div className="kh-dialog-in">
        <header>
          <div><b>{doc.title}</b><small>Original by The Kind Hour Foundation · {doc.slides} slides</small></div>
          <a className="btn is-s" href={doc.driveUrl} target="_blank" rel="noreferrer">Open original<ArrowUpRight size={14} aria-hidden /></a>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview"><X size={18} aria-hidden /></button>
        </header>
        <iframe key={doc.id} src={doc.driveUrl.replace(/\/view$/, "/preview")} title={`${doc.title}, by The Kind Hour Foundation`} allowFullScreen />
        <p>If the preview stays blank, Google Drive may be blocked on this network. Use “Open original”.</p>
      </div>}
    </dialog>
  );
}
