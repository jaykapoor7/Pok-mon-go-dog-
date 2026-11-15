"use client";

/* The creator's controls on their own campaign, shown only to the account
   that created it (the server checks created_by_id = auth.uid() again):
   reported progress and close/reopen (update_fundraiser), an update with an
   optional photo (uploadPhoto to the "sightings" bucket, then
   add_fundraiser_update), and the use of funds and outcome
   (set_fundraiser_details). Each waits for the server's answer. */

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ClipboardList, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { addFundraiserUpdate, setFundraiserDetails, updateFundraiser } from "@/lib/fundraiser-actions";
import { uploadPhoto } from "@/lib/actions";
import type { BudgetLine, Fundraiser } from "@/lib/types";
import { Ack, Btn, Lanes, Panel, Sec } from "../kit";
import { run, type Receipt } from "../receipt";

type Pane = "progress" | "update" | "budget";

export function OwnerControls({ f }: { f: Fundraiser }) {
  const { user } = useAuth();
  const router = useRouter();
  const [pane, setPane] = useState<Pane>("progress");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);
  const [raised, setRaised] = useState(f.raised_reported?.toString() ?? "");
  const [closing, setClosing] = useState(false);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<BudgetLine[]>(f.budget ?? []);
  const [outcome, setOutcome] = useState(f.outcome ?? "");

  if (!user || user.id !== f.created_by_id) return null;

  const go = async (key: string, what: string, fn: () => Promise<boolean | string | null>, after?: () => void) => {
    setBusy(true); setR(null);
    const x = await run(`fr:${key}:${f.id}`, what, fn);
    setR(x); setBusy(false);
    if (x.ok) { after?.(); router.refresh(); }
  };
  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setUploading(true); setR(null);
    try { setPhoto(await uploadPhoto(file)); }
    catch (err) { setR({ ok: false, error: err instanceof Error ? err.message : "The photo could not be uploaded." }); }
    finally { setUploading(false); }
  }
  const amount = raised.trim() === "" ? null : Math.max(0, parseInt(raised, 10) || 0);

  return (
    <Sec title="Manage your campaign" note="Only you see this. Changes show on the public page as soon as the server confirms them.">
      <Panel>
        <Lanes<Pane> label="What to change" value={pane} onChange={(p) => { setPane(p); setR(null); }} lanes={[{ id: "progress", label: "Progress" }, { id: "update", label: "Post an update" }, { id: "budget", label: "Budget and outcome" }]} />
        {pane === "progress" && (
          <>
            <div className="pb-field">
              <label htmlFor="fr-raised">Amount raised so far (₹)</label>
              <input id="fr-raised" className="pb-input" type="number" inputMode="numeric" min={0} value={raised} onChange={(e) => setRaised(e.target.value)} placeholder="12500" />
              <small>Self-reported, shown as progress. Once saved it cannot be cleared back to empty, only changed.</small>
            </div>
            <div className="pb-actions">
              <Btn variant="primary" disabled={busy || amount === null} onClick={() => go("raised", "Progress saved", () => updateFundraiser(f.id, { raisedReported: amount }))}>Save progress</Btn>
              {f.status === "closed"
                ? <Btn disabled={busy} onClick={() => go("status", "Campaign reopened", () => updateFundraiser(f.id, { status: "active" }))}>Reopen the campaign</Btn>
                : !closing ? <Btn disabled={busy} onClick={() => setClosing(true)}>Close the campaign</Btn> : null}
            </div>
            {closing && f.status !== "closed" && (
              <div className="pb-note is-amber" role="group" aria-label="Close the campaign">
                <div>Closing takes it off the Fundraisers list and marks the page as closed. You can reopen it later.</div>
                <div className="pb-note-a"><Btn small variant="primary" disabled={busy} onClick={() => go("status", "Campaign closed", () => updateFundraiser(f.id, { status: "closed" }), () => setClosing(false))}>Yes, close it</Btn><Btn small variant="quiet" onClick={() => setClosing(false)}>Keep it open</Btn></div>
              </div>
            )}
          </>
        )}
        {pane === "update" && (
          <>
            <div className="pb-field"><label htmlFor="fr-up">The update</label><textarea id="fr-up" className="pb-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="A rescue completed, a milestone, a thank-you to supporters" /></div>
            <div className="pb-actions">
              <input ref={fileRef} type="file" accept="image/*" className="pb-sr" onChange={pickPhoto} tabIndex={-1} aria-hidden />
              <Btn onClick={() => fileRef.current?.click()} disabled={uploading} icon={<Camera size={16} aria-hidden />}>{uploading ? "Uploading the photo…" : photo ? "Change the photo" : "Add a photo"}</Btn>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo && <img className="fr-thumb" src={photo} alt="The photo for this update" />}
              {photo && <Btn variant="quiet" onClick={() => setPhoto(null)}>Remove the photo</Btn>}
            </div>
            <div className="pb-actions"><Btn variant="primary" disabled={busy || uploading || !body.trim()} onClick={() => go("update", "Update posted", () => addFundraiserUpdate(f.id, body.trim(), photo), () => { setBody(""); setPhoto(null); })}>Post the update</Btn></div>
          </>
        )}
        {pane === "budget" && (
          <>
            <fieldset className="pb-field">
              <legend>Use of funds</legend>
              <div className="fr-lines">
                {lines.map((line, i) => (
                  <div key={i} className="fr-line">
                    <label className="pb-sr" htmlFor={`fr-l-${i}`}>Line {i + 1}</label>
                    <input id={`fr-l-${i}`} className="pb-input" value={line.label} onChange={(e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))} placeholder="Vet medicines" />
                    <label className="pb-sr" htmlFor={`fr-a-${i}`}>Amount for line {i + 1} (₹)</label>
                    <input id={`fr-a-${i}`} className="pb-input fr-amt" type="number" inputMode="numeric" min={0} value={line.amount || ""} onChange={(e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, amount: parseInt(e.target.value, 10) || 0 } : l)))} placeholder="₹" />
                    <Btn variant="quiet" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 size={16} aria-hidden /></Btn>
                  </div>
                ))}
              </div>
              <div><Btn small variant="quiet" icon={<Plus size={16} aria-hidden />} onClick={() => setLines((ls) => [...ls, { label: "", amount: 0 }])}>Add a line</Btn></div>
            </fieldset>
            <div className="pb-field"><label htmlFor="fr-out">Outcome <span className="pb-opt">once resolved</span></label><textarea id="fr-out" className="pb-input" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What the funds achieved" /></div>
            <div className="pb-actions"><Btn variant="primary" disabled={busy} onClick={() => go("details", "Budget and outcome saved", () => setFundraiserDetails(f.id, { budget: lines.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), amount: Math.max(0, l.amount || 0) })), outcome: outcome.trim() || null }))}>Save budget and outcome</Btn></div>
          </>
        )}
        <div aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}.</Ack> : <Ack state="failed">Not saved: {r.error}</Ack>) : null}</div>
        {f.case_id && <p className="pb-fine"><ClipboardList size={16} aria-hidden /> <Link href={`/next/ngo/cases/${f.case_id}`}>Open the case this funds</Link> in your workspace.</p>}
      </Panel>
    </Sec>
  );
}
