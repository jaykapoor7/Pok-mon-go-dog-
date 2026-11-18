"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "../kit";
import { useKaju } from "./state";

/* Saved conversations, newest first. Only the person sees their own, and only while they still belong to the
   organisation the conversation was held in (row-level security on kaju_threads). Opening one puts it back on screen to
   continue; prepared changes are not carried over, since they can be confirmed only where they were prepared. */

const when = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  return days <= 0 ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : days === 1 ? "Yesterday" : days < 7 ? d.toLocaleDateString("en-IN", { weekday: "short" }) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export function KajuHistory({ limit = 20, onOpened, title = "Your conversations" }: { limit?: number; onOpened?: () => void; title?: string | null }) {
  const k = useKaju();
  const [showAll, setShowAll] = useState(false);
  const { keeping, loadHistory } = k;
  useEffect(() => { if (keeping === "on") void loadHistory(); }, [keeping, loadHistory]);
  if (keeping !== "on") return null;
  if (k.history === null) return <div className="kj-skel" aria-label="Reading your conversations" />;
  if (!k.history.length) return null;
  const list = showAll ? k.history.slice(0, limit) : k.history.slice(0, Math.min(5, limit));
  return (
    <nav aria-label={title ?? "Your conversations"}>
      {title ? <p className="kj-eyebrow" style={{ marginBottom: 4 }}>{title}</p> : null}
      <ul className="kj-hist">
        {list.map((h) => (
          <li key={h.id}>
            <button type="button" className="kj-hist-open" aria-current={k.threadId === h.id ? "true" : undefined} disabled={k.busy}
              onClick={async () => { if (await k.resume(h.id)) onOpened?.(); else toast({ text: "That conversation could not be opened.", tone: "bad" }); }}>
              <span>{h.title}</span><time dateTime={h.updated_at}>{when(h.updated_at)}</time>
            </button>
            <button type="button" className="nx-ib" aria-label={`Delete “${h.title}”`} title="Delete"
              onClick={async () => { if (!(await k.forget(h.id))) toast({ text: "It could not be deleted. Try again.", tone: "bad" }); }}><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
      {k.history.length > list.length ? <button type="button" className="nx-link" onClick={() => setShowAll(true)}>Show {Math.min(k.history.length, limit) - list.length} more</button> : null}
    </nav>
  );
}

/** One line under a conversation saying, truthfully, whether it is kept and who can see it. */
export function KeepingNote() {
  const { keeping, turns } = useKaju();
  if (!turns.length) return null;
  return <span className="kj-keeping">{keeping === "on" ? "Saved to your conversations. Only you can see them." : keeping === "health" ? "Not saved: conversations about patients and clinics stay in this browser tab only." : "Not saved: sign in to keep conversations."}</span>;
}
