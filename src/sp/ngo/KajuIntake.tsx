"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Inbox · "Paste from WhatsApp".

   Paste one message, several, or a whole exported chat. Kaju prepares
   each report: what it is, where, the animal when a tag matches exactly,
   and any open case it may duplicate. A person picks the option and
   confirms; "Confirm all clear ones" takes only reports with one obvious
   answer. Saves go through the audited confirm path and are read back
   before they show as saved, then link straight to the record.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { Check, ClipboardPaste, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { confirmVerified, STOP_MESSAGE } from "@/sp3/ai/execute";
import type { IntakePlan } from "@/sp3/ai/intake";
import "./intake.css";

type Saved = { state: "saving" } | { state: "done"; href?: string } | { state: "failed"; error: string };
const CAT: Record<string, string> = { injury: "Injured animal", sterilisation: "ABC sterilisation", vaccination: "Anti-rabies vaccination", rescue: "Rescue", other: "Field update" };
const SEV: Record<string, string> = { critical: "Critical", high: "Urgent", normal: "Routine", low: "Low" };

export function KajuIntake({ actor }: { actor: { id: string; name: string } }) {
  const [text, setText] = useState("");
  const [plans, setPlans] = useState<IntakePlan[] | null>(null);
  const [choice, setChoice] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<string, Saved>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);

  const [simulated, setSimulated] = useState(false);
  const prepare = async (simulate = false) => {
    setBusy(true); setError(null); setPlans(null);
    try {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      if (!token) throw Error("Sign in again to continue.");
      const r = await fetch("/api/ai/intake", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(simulate ? { simulate: true } : { text }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(j.error ?? "Kaju could not prepare these reports.");
      const ps = j.plans as IntakePlan[];
      setPartial(!!j.partial); setSimulated(!!j.simulated);
      setPlans(ps);
      setChoice(Object.fromEntries(ps.map((p, i) => [i, p.options.find((o) => o.recommended)?.key ?? ""])));
      setSaved(Object.fromEntries((j.done as { request_id: string }[]).map((d) => [d.request_id, { state: "done" } as Saved])));
    } catch (e) { setError(e instanceof Error ? e.message : "Kaju could not prepare these reports."); }
    setBusy(false);
  };

  const savedFor = (p: IntakePlan) => p.options.map((o) => saved[o.proposal.id]).find((s) => s?.state === "done") as Extract<Saved, { state: "done" }> | undefined;
  const confirm = async (i: number) => {
    const p = plans?.[i];
    const o = p?.options.find((x) => x.key === choice[i]);
    if (!p || !o || savedFor(p)) return null;
    setSaved((s) => ({ ...s, [o.proposal.id]: { state: "saving" } }));
    const r = await confirmVerified(o.proposal, actor);
    setSaved((s) => ({ ...s, [o.proposal.id]: r.ok && r.verified ? { state: "done", href: r.href } : { state: "failed", error: r.ok ? "Saved, but not yet verified. Confirm again to check." : r.error ?? "Not saved." } }));
    return r;
  };
  const clear = (plans ?? []).map((p, i) => ({ p, i })).filter(({ p, i }) => p.clear && !savedFor(p) && p.options.find((o) => o.key === choice[i])?.recommended);
  const confirmClear = async () => {
    setBusy(true);
    for (const { i } of clear) { const r = await confirm(i); if (r && !r.ok && STOP_MESSAGE.test(r.error ?? "")) break; }
    setBusy(false);
  };

  return (
    <section className="ki" aria-labelledby="ki-h">
      <h2 id="ki-h" className="ki-h"><Sparkles size={15} aria-hidden /> Paste from WhatsApp</h2>
      <p className="ki-lede">Paste messages or an exported chat. Kaju prepares each report, checks your register for the animal and for an open case, and you confirm. Sender names are dropped, and phone numbers and email addresses in the text are masked before anything is saved.</p>
      <label htmlFor="ki-text" className="ki-sr">Reports to prepare</label>
      <textarea id="ki-text" className="textarea ki-text" rows={5} maxLength={12000} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={"Injured dog near Gandhipuram bus stand, bleeding from leg. Photo attached\n\nReleased after ABC at Saibaba Colony, female, ear notched"} />
      <div className="ki-bar">
        <button type="button" className="btn is-ink" disabled={busy || text.trim().length < 8} onClick={() => void prepare()}><ClipboardPaste size={14} aria-hidden /> {busy && !plans ? "Preparing…" : "Prepare with Kaju"}</button>
        {(process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" || process.env.NODE_ENV === "development") && <button type="button" className="btn" disabled={busy} onClick={() => void prepare(true)}>Simulate incoming WhatsApp (test only)</button>}
        {clear.length > 1 && <button type="button" className="btn" disabled={busy} onClick={() => void confirmClear()}><Check size={14} aria-hidden /> Confirm all {clear.length} clear reports</button>}
      </div>
      {error && <p className="ki-err" role="alert">{error} Nothing was saved.</p>}

      {plans && simulated && <p className="ki-miss" role="status">Simulated WhatsApp messages from the test fixture. Confirm only in a test workspace.</p>}
      {plans && partial && <p className="ki-miss" role="status">Duplicates were checked against your 800 most recent open cases only.</p>}
      {plans && <ol className="ki-list" aria-label="Prepared reports">{plans.map((p, i) => {
        const done = savedFor(p);
        const pickedOpt = p.options.find((o) => o.key === choice[i]);
        const st = pickedOpt ? saved[pickedOpt.proposal.id] : undefined;
        const x = p.extracted;
        return <li key={i} className={`ki-item${done ? " is-done" : ""}`}>
          <p className="ki-quote">{p.text}</p>
          <p className="ki-facts"><b className={`ki-sev s-${x.severity}`}>{SEV[x.severity]}</b> {CAT[x.category]}{x.place ? ` · ${x.place}` : ""}{x.city ? ` · ${x.city}${p.cityFrom === "organisation" ? " (your organisation’s city)" : ""}` : ""}{x.sex ? ` · ${x.sex}` : ""}{x.age ? ` · ${x.age}` : ""}{x.earNotch ? " · ear notched" : ""}</p>
          {p.missing.length > 0 && <p className="ki-miss">Not in the message: {p.missing.join(", ")}</p>}
          {p.blockers.length > 0 && <p className="ki-err">{p.blockers.join(". ")}: no city in the message or on your organisation profile. Add it to the message and prepare again.</p>}
          {done ? <p className="ki-done" role="status"><Check size={14} aria-hidden /> Saved and verified{done.href ? <> · Next: <Link href={done.href}>{x.severity === "critical" || x.severity === "high" ? "assign someone now" : "open the case to assign it"}</Link></> : null}</p>
            : p.options.length > 0 && <fieldset className="ki-opts">
              <legend className="ki-sr">What should this report become?</legend>
              {p.options.map((o) => <label key={o.key} className={`ki-opt${choice[i] === o.key ? " is-on" : ""}`}>
                <input type="radio" name={`ki-${i}`} checked={choice[i] === o.key} onChange={() => setChoice((c) => ({ ...c, [i]: o.key }))} />
                <span><b>{o.label}</b>{o.recommended && <em> Kaju suggests</em>}<small>{o.detail}</small></span>
              </label>)}
              <div className="ki-bar">
                <button type="button" className="btn is-ink is-s" disabled={!pickedOpt || st?.state === "saving" || busy} onClick={() => void confirm(i)}>{st?.state === "saving" ? "Saving…" : "Confirm"}</button>
                {st?.state === "failed" && <small className="ki-err" role="alert">{st.error}</small>}
              </div>
            </fieldset>}
        </li>;
      })}</ol>}
    </section>
  );
}
