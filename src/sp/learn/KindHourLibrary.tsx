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
import { Btn, Note, Panel, Section, Tag } from "@/ws/kit";
import "./learn.css";

export function KindHourLibrary({ ids, title }: { ids?: string[]; title?: string }) {
  const docs = ids ? KIND_HOUR_MATERIALS.filter((m) => ids.includes(m.id)) : KIND_HOUR_MATERIALS;
  const [open, setOpen] = useState<KindHourMaterial | null>(null);
  const compact = !!ids;
  return (
    <div id={compact ? undefined : "kind-hour"} className="lrn-anchor">
      <Section title={compact ? (title ?? "Classroom material to pair with it") : "Classroom library, by The Kind Hour Foundation"} count={docs.length}
        note={compact ? "Original documents by The Kind Hour Foundation, chosen by StrayPaw for this session." : undefined}>
        <Panel>
          <ol className="k-rows">
            {docs.map((m) => {
              const sensitive = m.id === "hello";
              return (
                <li key={m.id} className="lrn-doc">
                  <div className="k-row">
                    <span className="k-row-t"><b>{m.title}</b><small title={m.purpose}>{m.audience} · {m.slides} slides · {m.languages} · {m.purpose}</small></span>
                    <span className="k-row-e">
                      {sensitive ? <Tag tone="flame">Content note</Tag> : null}
                      <Btn small icon={<Eye size={14} />} onClick={() => setOpen(m)} aria-label={`Preview ${m.title}`}>Preview</Btn>
                      <a className="k-btn is-quiet is-s lrn-wide" href={m.driveUrl} target="_blank" rel="noreferrer"><span>Open original</span><ArrowUpRight size={14} aria-hidden /><span className="sr-only"> (opens Google Drive in a new tab)</span></a>
                    </span>
                  </div>
                  {sensitive ? <p className="lrn-warn"><AlertTriangle size={14} aria-hidden /><span><b>Content note from StrayPaw.</b> {m.facilitatorNote}</span></p> : null}
                </li>
              );
            })}
          </ol>
        </Panel>
        {!compact && <p className="lrn-fine">All five documents are created by and belong to The Kind Hour Foundation and open from their shared Google Drive. Preview them here or open the originals. Notes marked “StrayPaw” are ours, not the Foundation’s.</p>}
      </Section>
      <Preview doc={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Preview({ doc, onClose }: { doc: KindHourMaterial | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (doc && !d.open) d.showModal(); else if (!doc && d.open) d.close(); }, [doc]);
  return (
    <dialog ref={ref} className="lrn-dialog" aria-label={doc ? `${doc.title}, by The Kind Hour Foundation` : "Document preview"} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      {doc && <div className="lrn-dialog-in">
        <header>
          <div><b>{doc.title}</b><small>Original by The Kind Hour Foundation · {doc.audience} · {doc.slides} slides</small></div>
          <a className="k-btn is-s" href={doc.driveUrl} target="_blank" rel="noreferrer"><span>Open original</span><ArrowUpRight size={14} aria-hidden /></a>
          <button type="button" className="k-btn is-quiet is-s" onClick={onClose} aria-label="Close preview"><X size={16} aria-hidden /></button>
        </header>
        <Note tone={doc.id === "hello" ? "flame" : "plain"}><span><b>{doc.id === "hello" ? "Content note from StrayPaw." : "StrayPaw’s note."}</b> {doc.facilitatorNote}</span></Note>
        <iframe key={doc.id} src={doc.driveUrl.replace(/\/view$/, "/preview")} title={`${doc.title}, by The Kind Hour Foundation`} allowFullScreen />
        <p>If the preview stays blank, Google Drive may be blocked on this network. Use “Open original”.</p>
      </div>}
    </dialog>
  );
}
