"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Keyboard, Mic, Sparkles, Trash2 } from "lucide-react";
import { Shell } from "../Shell";
import { KajuVoice } from "@/kaju/voice/KajuVoice";
import { VOICE_OFFERED } from "@/kaju/voice/availability";
import { Chip, Sample } from "../ui";
import { toast } from "../kit";
import { CONNECTED, MISSIONS } from "../fixtures";
import { useLive } from "../live";
import { Composer } from "../kaju/Composer";
import { PlanCard, Thread } from "../kaju/Thread";
import { useKajuPrefs, useKajuVocab, useMissionList } from "../kaju/data";
import { useKaju, type Planned } from "../kaju/state";

/* Full Kaju: the same conversation as the compact panel, with room for plans, answers and the work waiting on you. */

const STATE_WORD: Record<string, [string, "ok" | "warn" | "bad" | "accent" | "plain"]> = {
  ready: ["Ready", "accent"], running: ["Running", "accent"], retrying: ["Retrying", "warn"], waiting_person: ["Waiting for you", "warn"],
  waiting_partner: ["Waiting for a partner", "warn"], blocked: ["Blocked", "bad"], completed: ["Completed", "ok"], cancelled: ["Cancelled", "plain"], draft: ["Draft", "plain"],
};
export const missionState = (s: string) => STATE_WORD[s] ?? [s, "plain" as const];

export function Kaju() {
  const k = useKaju();
  const live = useLive();
  const router = useRouter();
  const calm = useReducedMotion();
  const org = live.org;
  const vocab = useKajuVocab(org?.org_id ?? null, org?.workspace ?? null);
  const missions = useMissionList(org?.org_id ?? null);
  const { prefs } = useKajuPrefs();
  const [planned, setPlanned] = useState<Planned | null>(null);
  /* Words handed over from the command bar (?q=) are placed in the composer, not sent. */
  useEffect(() => { try { const q = new URLSearchParams(window.location.search).get("q"); if (q) window.dispatchEvent(new CustomEvent("sp:kaju-ask", { detail: { q } })); } catch {} }, []);
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false);
  const waiting = (missions.rows ?? []).filter((m) => m.state === "waiting_person" || m.state === "blocked");
  const recent = (missions.rows ?? []).slice(0, 5);

  const plan = async (text: string, intent: Parameters<typeof k.plan>[2]) => {
    if (!org) return;
    setBusy(true); const r = await k.plan(org.org_id, text, intent); setBusy(false);
    if (r.ok) setPlanned(r.planned); else toast({ text: r.error, tone: "bad" });
  };
  const start = async () => {
    if (!org || !planned) return;
    setBusy(true); const r = await k.start(org.org_id, planned); setBusy(false);
    if (r.id) { setPlanned(null); missions.reload(); router.push(`/kaju/missions?m=${r.id}`); }
    else toast({ text: r.error ?? "Not started.", tone: "bad" });
  };
  const quick = org?.workspace === "ngo"
    ? [`Prepare next week's follow-ups${vocab.places[0] ? ` for ${vocab.places[0]}` : ""}${vocab.channels[0] ? ` and tell #${vocab.channels[0]}` : ""}`, "Which cases are overdue?", "What needs attention today?"]
    : ["What needs attention today?", "Explain how coverage is counted", "Which referrals are waiting?"];

  return (
    <Shell ws="kaju" crumb={["Kaju"]}>
      <div className="nx-kj">
        <div className="nx-head">
          <div><p className="nx-eyebrow">{org ? `Works inside ${org.name}, with your permissions` : "Answers from public records until you sign in"}{!live.signedIn && live.ready ? <Sample /> : null}</p><h1 className="nx-h1">What should we get done?</h1><p className="nx-sub">Ask a question, or hand over an outcome. Kaju shows its plan first; anything that changes several records or leaves StrayPaw waits for you.</p></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{VOICE_OFFERED ? <button type="button" className="nx-btn is-quiet is-keep" aria-pressed={voice} onClick={() => setVoice((v) => !v)}>{voice ? <><Keyboard size={15} aria-hidden />Type instead</> : <><Mic size={15} aria-hidden />Talk to Kaju</>}</button> : null}{waiting.length ? <Link href="/kaju/approvals" className="nx-btn is-quiet is-keep"><Chip tone="warn">{waiting.length}</Chip>waiting for you</Link> : null}</div>
        </div>
        <div className="nx-kj-cols">
          <div>
            <motion.div layoutId={calm ? undefined : "kaju-surface"} className="nx-kj-surface">
              {voice ? <div className="nx-kj-voice"><KajuVoice /></div> : <>
                <Thread />
                {planned ? <PlanCard planned={planned} busy={busy} onStart={start} onDiscard={() => setPlanned(null)} /> : null}
                <Composer vocab={vocab} predictive={prefs.predictive} busy={busy || k.busy} disabled={k.expired} autoFocus onAsk={(t) => void k.ask(t)} onPlan={(t, i) => void plan(t, i)} canPlan={!!org} />
                {k.turns.length ? <p className="nx-foot"><button type="button" className="nx-thread" onClick={k.clear}><Trash2 size={12} /> Clear this conversation</button> · It stays in this browser tab only.</p> : null}
              </>}
            </motion.div>
            {!k.turns.length ? <section className="nx-sec" style={{ marginTop: 22 }} aria-labelledby="kj-q"><div className="nx-sec-h"><h2 id="kj-q">From where you are</h2></div>
              <div className="nx-quick">{quick.map((q) => <button key={q} type="button" onClick={() => window.dispatchEvent(new CustomEvent("sp:kaju-ask", { detail: { q } }))}><ArrowUpRight size={13} style={{ flex: "none" }} /><span>{q}</span></button>)}</div></section> : null}
          </div>
          <aside>
            <section className="nx-sec" aria-labelledby="kj-m"><div className="nx-sec-h"><h2 id="kj-m">Missions</h2>{org ? <Link href="/kaju/missions">All</Link> : null}</div>
              {org ? (recent.length ? <ul className="nx-feed">{recent.map((m) => { const [w, t] = missionState(m.state); return <li key={m.id}><span className="nx-feed-i is-kaju"><Sparkles size={12} /></span><div><Link href={`/kaju/missions?m=${m.id}`}><b>{m.title}</b></Link><p><Chip tone={t}>{w}</Chip></p></div></li>; })}</ul> : <p className="nx-foot" style={{ marginTop: 0 }}>{missions.rows ? "No missions yet. Hand over work above." : "Reading…"}</p>)
                : <ul className="nx-feed">{MISSIONS.slice(0, 2).map((m) => <li key={m.id}><span className="nx-feed-i is-kaju"><Sparkles size={12} /></span><div><b>{m.title}</b><p><Chip tone={m.tone}>{m.state}</Chip> <Sample /></p></div></li>)}</ul>}
            </section>
            <section className="nx-sec" aria-labelledby="kj-c"><div className="nx-sec-h"><h2 id="kj-c">What Kaju can use</h2></div>
              <ul className="nx-conn">{CONNECTED.map(([n, s, t]) => <li key={n}>{n}<Chip tone={t}>{s}</Chip></li>)}</ul>
              <p className="nx-foot">Email, calendar, WhatsApp and SMS work only through an account connected in settings. Until then Kaju prepares them and says they are not connected.</p></section>
            <section className="nx-sec" aria-labelledby="kj-r"><div className="nx-sec-h"><h2 id="kj-r">Rules</h2></div>
              <p className="nx-foot" style={{ marginTop: 0 }}>Kaju reads only what you can see. It never makes clinical, laboratory, verification, payment or data-access decisions. <Link href="/kaju/rules">Your organisation&apos;s rules and memory</Link></p></section>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
