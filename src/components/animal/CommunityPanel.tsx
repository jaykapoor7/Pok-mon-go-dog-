"use client";

/* What anyone nearby can add to the record. A sighting must go through the
   reviewed report flow; no one-tap action can silently change a shared record. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2, Send, Siren, Utensils } from "lucide-react";
import { addComment, logFeed, updateDogStatus } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { haptic } from "@/lib/haptics";

export function CommunityPanel({ id, label, needsHelp, comments }: {
  id: string; label: string; needsHelp: boolean;
  comments: { id: string; author: string; body: string; date: string }[];
}) {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [fed, setFed] = useState(false);
  const [help, setHelp] = useState(needsHelp);
  const [busy, setBusy] = useState<null | "seen" | "fed" | "help" | "note">(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<"seen" | "fed" | null>(null);

  const recordMeal = async () => {
    if (busy || fed) return;
    setBusy("fed");
    try {
      const ok = await logFeed(id, user?.name);
      if (!ok) { toast("That was not saved. Please try again."); return; }
      setFed(true);
      haptic("success");
      toast(`Meal recorded for ${label}.`);
    } catch { toast("That was not saved. Please try again."); } finally { setBusy(null); setConfirm(null); }
  };
  const flag = () => requireAuth(async () => {
    const next = !help;
    setBusy("help");
    try {
      const ok = await updateDogStatus(id, { status: null, needs_help: next, vaccinated: null, sterilised: null, is_friendly: null });
      if (ok) { setHelp(next); toast(next ? `Flagged for help. Rescuers can see ${label} now.` : `Help flag cleared for ${label}.`); router.refresh(); }
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
        <button type="button" disabled={!!busy} onClick={() => setConfirm("seen")}>
          <Eye size={16} /> I saw it today
        </button>
        <button type="button" className={fed ? "is-done" : ""} disabled={!!busy || fed} onClick={() => setConfirm("fed")}>
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
        ) : <p className="lr-quiet">No notes yet. Anything you know (a name locals use, a habit, an injury) helps the next person who looks.</p>}
        <div className="lr-note-form">
          <label className="sys-sr" htmlFor={`note-${id}`}>Add a note</label>
          <textarea id={`note-${id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note about this animal…" />
          <button type="button" onClick={post} disabled={!note.trim() || !!busy} aria-label="Post the note">
            {busy === "note" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="lr-fine">Notes are public. Leave out phone numbers and anyone&rsquo;s name but your own.</p>
      </div>
      {confirm && (
        <div className="lr-confirm-wrap" role="presentation">
          <div className="lr-confirm" role="dialog" aria-modal="true" aria-labelledby="lr-confirm-title">
            <h3 id="lr-confirm-title">{confirm === "seen" ? "Add a sighting?" : "Record a meal?"}</h3>
            <p>{confirm === "seen" ? "Sightings are reviewed before they become part of this shared record. Continue to the short report." : "This adds a meal to the shared record for this animal."}</p>
            <div>
              <button type="button" className="lr-act" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className="lr-act is-on" onClick={() => confirm === "seen" ? router.push(`/report?dog=${id}`) : recordMeal()}>
                {confirm === "seen" ? "Continue to report" : busy === "fed" ? "Recording…" : "Record meal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
