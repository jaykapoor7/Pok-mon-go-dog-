"use client";

/* What anyone nearby can add to the record: I saw it, I fed it, it needs
   help, and a note. Each is a real write; the button only turns to "done"
   once the register has it. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2, Send, Siren, Utensils } from "lucide-react";
import { addComment, logFeed, logSeen, updateDogStatus } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { haptic } from "@/lib/haptics";

export function CommunityPanel({ id, label, needsHelp, comments }: {
  id: string; label: string; needsHelp: boolean;
  comments: { id: string; author: string; body: string; date: string }[];
}) {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [seen, setSeen] = useState(false);
  const [fed, setFed] = useState(false);
  const [help, setHelp] = useState(needsHelp);
  const [busy, setBusy] = useState<null | "seen" | "fed" | "help" | "note">(null);
  const [note, setNote] = useState("");

  const act = async (kind: "seen" | "fed") => {
    if (busy || (kind === "seen" ? seen : fed)) return;
    setBusy(kind);
    try {
      const ok = kind === "seen" ? await logSeen(id) : await logFeed(id, user?.name);
      if (!ok) { toast("That was not saved. Please try again."); return; }
      if (kind === "seen") setSeen(true); else setFed(true);
      haptic("success");
      toast(kind === "seen" ? `Sighting recorded for ${label}.` : `Meal recorded for ${label}.`);
    } catch { toast("That was not saved. Please try again."); } finally { setBusy(null); }
  };
  const flag = () => requireAuth(async () => {
    const next = !help;
    setBusy("help");
    try {
      const ok = await updateDogStatus(id, { status: null, needs_help: next, vaccinated: null, sterilised: null, is_friendly: null });
      if (ok) { setHelp(next); toast(next ? `Flagged for help — rescuers can see ${label} now.` : `Help flag cleared for ${label}.`); router.refresh(); }
      else toast("Record a sighting of this animal first, then you can flag it for help.");
    } catch { toast("Could not update right now. Please try again."); } finally { setBusy(null); }
  });
  const post = async () => {
    const body = note.trim();
    if (!body || busy) return;
    setBusy("note");
    try { await addComment(id, body, user?.name); setNote(""); haptic("success"); router.refresh(); }
    catch { toast("Your note was not saved. Please try again."); } finally { setBusy(null); }
  };

  return (
    <div className="lr-community">
      <div className="lr-community-acts">
        <button type="button" className={seen ? "is-done" : ""} disabled={!!busy || seen} onClick={() => act("seen")}>
          {busy === "seen" ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} {seen ? "Sighting recorded" : "I saw it today"}
        </button>
        <button type="button" className={fed ? "is-done" : ""} disabled={!!busy || fed} onClick={() => act("fed")}>
          {busy === "fed" ? <Loader2 size={16} className="animate-spin" /> : <Utensils size={16} />} {fed ? "Meal recorded" : "I fed it"}
        </button>
        <button type="button" className={help ? "is-hot" : ""} disabled={!!busy} onClick={flag} aria-pressed={help}>
          {busy === "help" ? <Loader2 size={16} className="animate-spin" /> : <Siren size={16} />} {help ? "Needs help · clear" : "It needs help"}
        </button>
      </div>
      <div className="lr-notes">
        {comments.length ? (
          <ol>
            {comments.map((c) => (
              <li key={c.id}><p>{c.body}</p><small>{c.author} · {new Date(c.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small></li>
            ))}
          </ol>
        ) : <p className="lr-quiet">No notes yet. Anything you know — a name locals use, a habit, an injury — helps the next person who looks.</p>}
        <div className="lr-note-form">
          <label className="sys-sr" htmlFor={`note-${id}`}>Add a note</label>
          <textarea id={`note-${id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note about this animal…" />
          <button type="button" onClick={post} disabled={!note.trim() || !!busy} aria-label="Post the note">
            {busy === "note" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="lr-fine">Notes are public. Leave out phone numbers and anyone&rsquo;s name but your own.</p>
      </div>
    </div>
  );
}
