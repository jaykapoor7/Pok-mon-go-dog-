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
import { Camera } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { FUNDRAISER_CATEGORIES } from "@/lib/types";
import { Btn, Head, Lanes, Page, Panel, Section, Split } from "@/ws/kit";
import { Ack } from "../../ui";
import { startFundraiser, type Receipt } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../org.k.css";

export function NewFundraiser() {
  const { user } = useAuth();
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
      <Page>
        <Head title="New campaign" sum="Donors give directly through your own link. StrayPaw shows the campaign and sends people your way." />

        {r?.ok ? (
          <Panel pad>
            <div className="og-form" aria-live="polite">
              <Ack state="saved">{r.what}</Ack>
              <p className="og-p"><b>{title}</b> is public now. Post updates and the amount raised from its own page.</p>
              <div className="og-go">{r.id && <Btn variant="primary" href={`/fundraisers/${r.id}`}>Open the campaign</Btn>}<Btn href="/ngo/fundraising">Back to fundraising</Btn></div>
            </div>
          </Panel>
        ) : (
          <Split side={
            <Section title="Before you publish">
              <ul className="og-list">
                <li>The campaign is public as soon as it is published.</li>
                <li>Money goes to your link. StrayPaw never holds it.</li>
                <li>Any amount raised is shown as reported by you, not verified.</li>
                <li>Only members of a verified partner organisation can publish; the database refuses anyone else.</li>
              </ul>
            </Section>}>
            <form className="og-form" onSubmit={submit}>
              {caseId && <p className="og-p">Linked to <Link className="og-a" href={`/ngo/cases/${caseId}`}>a case</Link>. The campaign will show on it.</p>}
              <div className="og-f"><label htmlFor="fr-t">Title</label><input id="fr-t" className="og-in" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Clear pending vet bills for 30 rescues" /></div>
              <div className="og-f"><span className="og-l">Category</span><Lanes label="Category" value={category} onChange={setCategory} lanes={FUNDRAISER_CATEGORIES.map((c) => ({ id: c.value, label: c.label }))} /></div>
              <div className="og-f"><label htmlFor="fr-u">Your donation link</label><input id="fr-u" className="og-in" value={donateUrl} onChange={(e) => setDonateUrl(e.target.value)} required inputMode="url" placeholder="UPI / Razorpay / Milaap / Ketto / bank page URL" /><span className="og-hint">Where the money goes. Donors are sent here to pay you directly{url && url !== donateUrl.trim() ? `; it will be saved as ${url}` : ""}.</span></div>
              <div className="og-two">
                <div className="og-f"><label htmlFor="fr-g">Goal in ₹ <span className="og-opt">optional</span></label><input id="fr-g" className="og-in" type="number" min={0} inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="50000" /></div>
                <div className="og-f"><label htmlFor="fr-d">Needed by <span className="og-opt">optional</span></label><input id="fr-d" className="og-in" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
              </div>
              <div className="og-f"><label htmlFor="fr-s">Story</label><textarea id="fr-s" className="og-in" rows={4} value={story} onChange={(e) => setStory(e.target.value)} placeholder="What are the funds for? Which dogs? What happens if you don't raise it?" /></div>
              <div className="og-f">
                <span className="og-l">Cover photo <span className="og-opt">optional</span></span>
                <input ref={fileRef} type="file" accept="image/*" hidden aria-label="Choose a cover photo" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} />
                {preview ? (
                  <div className="fr-cover"><SensitiveVeil sensitive id={preview} note="Cover photos are blurred until someone chooses to view">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="Chosen cover" /></SensitiveVeil></div>
                ) : (
                  <div className="og-go"><Btn icon={<Camera size={14} />} onClick={() => fileRef.current?.click()}>Add a photo</Btn></div>
                )}
                {preview && <div className="og-go"><Btn small onClick={() => fileRef.current?.click()}>Change photo</Btn><Btn small variant="quiet" onClick={() => { setFile(null); setPreview(null); }}>Remove</Btn></div>}
              </div>
              <div className="og-go">
                <Btn type="submit" variant="primary" disabled={!can}>{busy ? "Publishing…" : "Publish campaign"}</Btn>
                <span aria-live="polite">{busy ? <Ack state="pending">Uploading and publishing…</Ack> : r && !r.ok ? <Ack state="failed">Not published: {r.error}</Ack> : !url || !title.trim() ? <span className="og-hint">A title and a donation link are needed.</span> : null}</span>
              </div>
            </form>
          </Split>
        )}
      </Page>
    </NgoGate>
  );
}
