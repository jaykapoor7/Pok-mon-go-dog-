"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · New campaign (1.0 /partner/fundraisers/new).

   Same fields and the same create_fundraiser RPC: title, category,
   donation link (normalised to https://), optional goal, needed-by date,
   story, cover photo, and a linked case when opened from one
   (?case=…, ?title=… prefill). The answer is a receipt, never an
   assumed success. The cover stays blurred until chosen to view.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { FUNDRAISER_CATEGORIES } from "@/lib/types";
import { useMembership } from "../../shell/Shell";
import { Ack } from "../../ui";
import { startFundraiser, type Receipt } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../ngo.css";
import "./outreach.css";

export function NewFundraiser() {
  const { user } = useAuth();
  const mem = useMembership();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  useEffect(() => { const p = new URLSearchParams(window.location.search); const t = p.get("title"); if (t) setTitle(t); setCaseId(p.get("case")); }, []);
  const [category, setCategory] = useState("bills");
  const [story, setStory] = useState("");
  const [goal, setGoal] = useState("");
  const [donateUrl, setDonateUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<(Receipt & { id?: string }) | null>(null);

  const url = (() => { const u = donateUrl.trim(); return !u ? "" : /^https?:\/\//i.test(u) ? u : `https://${u}`; })();
  const can = title.trim().length > 0 && url.length > 0 && !busy && !!user;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!can || !user) return;
    setBusy(true); setR(null);
    const x = await startFundraiser({ title: title.trim(), story: story.trim() || undefined, category, goalAmount: goal ? Math.max(0, parseInt(goal, 10) || 0) : null, donateUrl: url, deadline: deadline || null, caseId }, { id: user.id, name: user.name }, file);
    setR(x); setBusy(false);
  }

  return (
    <NgoGate title="New campaign" lede="Start a fundraiser that sends donors to your own donation page.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k"><Link className="link" href="/ngo/fundraising"><ArrowLeft size={12} aria-hidden /> Fundraising</Link> · {mem.org?.name ?? "your organisation"}</p><h1 className="serif">New campaign</h1></div>
          <p className="ngo-sum">Donors give directly through your own link. StrayPaw shows the campaign and sends people your way.</p>
        </header>

        {r?.ok ? (
          <div className="or-new">
            <div className="or-new-col" aria-live="polite">
              <Ack state="saved">{r.what}</Ack>
              <h2 className="h2">{title}</h2>
              <p className="body">It is public now. Post updates and the amount raised from its own page.</p>
              <div className="row">{r.id && <Link className="btn is-ink" href={`/fundraisers/${r.id}`}>Open the campaign</Link>}<Link className="btn" href="/ngo/fundraising">Back to fundraising</Link></div>
            </div>
          </div>
        ) : (
          <form className="or-new" onSubmit={submit}>
            <div className="or-new-col">
              {caseId && <p className="small">Linked to <Link className="link" href={`/ngo/cases/${caseId}`}>a case</Link>. The campaign will show on it.</p>}
              <div className="field"><label htmlFor="fr-t">Title</label><input id="fr-t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Clear pending vet bills for 30 rescues" /></div>
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="label" style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Category</legend>
                <div className="or-cats">{FUNDRAISER_CATEGORIES.map((c) => <button key={c.value} type="button" className="chip" aria-pressed={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</button>)}</div>
              </fieldset>
              <div className="field"><label htmlFor="fr-u">Your donation link</label><input id="fr-u" className="input" value={donateUrl} onChange={(e) => setDonateUrl(e.target.value)} required inputMode="url" placeholder="UPI / Razorpay / Milaap / Ketto / bank page URL" /><span className="hint">Where the money goes. Donors are sent here to pay you directly{url && url !== donateUrl.trim() ? `; it will be saved as ${url}` : ""}.</span></div>
              <div className="or-two">
                <div className="field"><label htmlFor="fr-g">Goal in ₹ <span className="small">optional</span></label><input id="fr-g" className="input" type="number" min={0} inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="50000" /></div>
                <div className="field"><label htmlFor="fr-d">Needed by <span className="small">optional</span></label><input id="fr-d" className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
              </div>
              <div className="field"><label htmlFor="fr-s">Story</label><textarea id="fr-s" className="textarea" rows={5} value={story} onChange={(e) => setStory(e.target.value)} placeholder="What are the funds for? Which dogs? What happens if you don't raise it?" /></div>
              <div className="field">
                <span className="label">Cover photo <span className="small">optional</span></span>
                <input ref={fileRef} type="file" accept="image/*" hidden aria-label="Choose a cover photo" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} />
                {preview ? (
                  <div className="or-cover has-img"><SensitiveVeil sensitive id={preview} note="Cover photos are blurred until someone chooses to view">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="Chosen cover" /></SensitiveVeil></div>
                ) : (
                  <button type="button" className="or-cover" onClick={() => fileRef.current?.click()}><span className="row"><Camera size={18} aria-hidden /> Add a photo</span></button>
                )}
                {preview && <div className="row"><button type="button" className="btn is-s" onClick={() => fileRef.current?.click()}>Change photo</button><button type="button" className="btn is-ghost is-s" onClick={() => { setFile(null); setPreview(null); }}>Remove</button></div>}
              </div>
              <div className="or-send">
                <button type="submit" className="btn is-flame" disabled={!can}>{busy ? "Publishing…" : "Publish campaign"}</button>
                <span aria-live="polite">{busy ? <Ack state="pending">Uploading and publishing…</Ack> : r && !r.ok ? <Ack state="failed">Not published: {r.error}</Ack> : !url || !title.trim() ? <span className="small">A title and a donation link are needed.</span> : null}</span>
              </div>
            </div>
            <aside className="or-new-side">
              <h2 className="serif">Before you publish</h2>
              <ul>
                <li>The campaign is public as soon as it is published.</li>
                <li>Money goes to your link. StrayPaw never holds it.</li>
                <li>Any amount raised is shown as reported by you, not verified.</li>
                <li>Only members of a verified partner organisation can publish; the database refuses anyone else.</li>
              </ul>
            </aside>
          </form>
        )}
      </div>
    </NgoGate>
  );
}
