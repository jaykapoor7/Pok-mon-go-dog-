"use client";

/* The Kind Hour Foundation's classroom documents: their originals, credited
   to them and opened from their shared Drive, never re-edited. Preview
   opens the original in a dialog (a native modal: focus stays inside it,
   Escape closes it); Open opens it at the source. StrayPaw's own note sits
   apart, labelled as ours; a content warning reads as a warning. */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Eye, X } from "lucide-react";
import { KIND_HOUR_MATERIALS, type KindHourMaterial } from "@/lib/platform/education";
import { Btn, Note, Sec, Tag } from "../kit";

export function KindHourLibrary({ ids, title }: { ids?: string[]; title?: string }) {
  const docs = ids ? KIND_HOUR_MATERIALS.filter((m) => ids.includes(m.id)) : KIND_HOUR_MATERIALS;
  const [open, setOpen] = useState<KindHourMaterial | null>(null);
  const compact = !!ids;
  return (
    <Sec id={compact ? undefined : "kind-hour"} title={compact ? (title ?? "Classroom material to pair with it") : "Classroom library, by The Kind Hour Foundation"} count={docs.length}
      note={compact ? "Original documents by The Kind Hour Foundation, chosen by StrayPaw for this session." : undefined}>
      {!compact && <p className="pb-fine lrn-fine">These documents are created by and belong to The Kind Hour Foundation and open from their shared Google Drive. Preview them here or open the originals. Notes marked “StrayPaw” are ours, not the Foundation’s.</p>}
      <ul className="pb-list" aria-label="Classroom documents">
        {docs.map((m) => {
          const sensitive = m.id === "hello";
          return (
            <li key={m.id} className="lx-doc lrn-doc">
              <div className="pb-row">
                <span className="pb-row-t"><b>{m.title}</b><small>{m.audience} · {m.slides} slides · {m.languages} · {m.purpose}</small></span>
                <span className="pb-row-e">
                  {sensitive ? <Tag tone="flame">Content note</Tag> : null}
                  <Btn small onClick={() => setOpen(m)} icon={<Eye size={16} aria-hidden />}>Preview<span className="pb-sr"> {m.title}</span></Btn>
                  <a className="pb-btn is-quiet is-s" href={m.driveUrl} target="_blank" rel="noreferrer">Open original <ArrowUpRight size={16} aria-hidden /><span className="pb-sr"> {m.title} (opens Google Drive in a new tab)</span></a>
                </span>
              </div>
              {sensitive ? <p className="lx-warn lrn-warn"><AlertTriangle size={16} aria-hidden /><span><b>Content note from StrayPaw.</b> {m.facilitatorNote}</span></p> : null}
            </li>
          );
        })}
      </ul>
      <Preview doc={open} onClose={() => setOpen(null)} />
    </Sec>
  );
}

function Preview({ doc, onClose }: { doc: KindHourMaterial | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (doc && !d.open) d.showModal(); else if (!doc && d.open) d.close(); }, [doc]);
  return (
    <dialog ref={ref} className="lx-dialog" aria-label={doc ? `${doc.title}, by The Kind Hour Foundation` : "Document preview"} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      {doc && <div className="lx-dialog-in">
        <header>
          <div><b>{doc.title}</b><small>Original by The Kind Hour Foundation · {doc.audience} · {doc.slides} slides</small></div>
          <a className="pb-btn is-line is-s" href={doc.driveUrl} target="_blank" rel="noreferrer">Open original <ArrowUpRight size={16} aria-hidden /></a>
          <Btn small variant="quiet" onClick={onClose} aria-label="Close the preview"><X size={16} aria-hidden /></Btn>
        </header>
        <Note tone={doc.id === "hello" ? "flame" : "plain"}><b>{doc.id === "hello" ? "Content note from StrayPaw." : "StrayPaw’s note."}</b> {doc.facilitatorNote}</Note>
        <iframe key={doc.id} src={doc.driveUrl.replace(/\/view$/, "/preview")} title={`${doc.title}, by The Kind Hour Foundation`} allowFullScreen />
        <p className="pb-fine">If the preview stays blank, Google Drive may be blocked on this network. Use “Open original”.</p>
      </div>}
    </dialog>
  );
}
