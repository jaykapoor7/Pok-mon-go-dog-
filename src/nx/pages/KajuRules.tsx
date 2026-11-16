"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { Empty, Field, Modal, Section, Skeleton, TabBar, dayTime, useAct } from "../kit";
import { useLive } from "../live";
import { getSupabase } from "@/lib/supabase";
import { LEVEL_WORD, TOOLS, type Level, type ToolName } from "@/lib/kaju/registry";
import { useKajuPrefs } from "../kaju/data";
import { KajuPlaces } from "../kaju/Places";

/* What Kaju may do here. The registry sets each tool's level; an organisation's leads can only make a tool stricter
   or switch it off; each person can hold Kaju to asking first. Memory is how the organisation works, written down,
   used only after a lead approves it, and removable at any time. */

type Policy = { tool: string; level: number; enabled: boolean; updated_at: string };
type Memory = { id: string; scope: "org" | "personal"; kind: string; title: string; body: string; created_by: string; approved_at: string | null; revoked_at: string | null; created_at: string };

function useRows<T>(read: () => PromiseLike<{ data: unknown; error: { message: string } | null }>, key: string | null) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { if (!key) return; let alive = true; void read().then(({ data, error }) => { if (alive) setRows(error ? [] : (data as T[]) ?? []); }); return () => { alive = false; }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  return { rows, reload: useCallback(() => setTick((n) => n + 1), []) };
}

export function KajuRules() {
  const live = useLive();
  const org = live.org;
  const [tab, setTab] = useState<"Tools" | "Memory" | "Your limits">("Tools");
  const lead = !!org && ["admin", "lead"].includes(org.role);
  const db = getSupabase();
  const policies = useRows<Policy>(() => db!.from("nx_kaju_policies").select("tool,level,enabled,updated_at").eq("org_id", org!.org_id), org ? `p${org.org_id}` : null);
  const memory = useRows<Memory>(() => db!.from("nx_kaju_memory").select("id,scope,kind,title,body,created_by,approved_at,revoked_at,created_at").eq("org_id", org!.org_id).is("revoked_at", null).order("created_at", { ascending: false }), org ? `m${org.org_id}` : null);
  const { prefs, save } = useKajuPrefs(live.signedIn);
  const { busy, run } = useAct();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", kind: "procedure", scope: "org" as "org" | "personal" });

  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju", "Rules and memory"]}><div className="nx-page"><Skeleton /></div></Shell>;
  if (!org) return (
    <Shell ws="kaju" crumb={["Kaju", "Rules and memory"]}>
      <div className="nx-page"><KajuPlaces /><p className="nx-eyebrow">How Kaju is held<Sample /></p><h1 className="nx-h1">Rules and memory</h1><p className="nx-sub">Each organisation decides how far Kaju goes on its own, and writes down how it works so Kaju can follow it.</p>
        <table className="nx-rtable"><tbody>{(Object.keys(TOOLS) as ToolName[]).map((t) => <tr key={t}><td>{TOOLS[t].label}</td><td><Chip tone={TOOLS[t].level >= 3 ? "warn" : "plain"}>{LEVEL_WORD[TOOLS[t].level as Level]}</Chip></td></tr>)}</tbody></table>
        <p style={{ marginTop: 16 }}><Link href="/try" className="nx-btn" title="Opens the live demo, where this works">Set rules in the live demo</Link></p></div>
    </Shell>
  );

  const pol = (t: string) => policies.rows?.find((p) => p.tool === t);
  const setPolicy = (t: ToolName, level: number, enabled: boolean) => run(`p${t}`, async () => {
    const base = TOOLS[t].level;
    if (enabled && level <= base) return await db!.from("nx_kaju_policies").delete().eq("org_id", org.org_id).eq("tool", t);
    return await db!.from("nx_kaju_policies").upsert({ org_id: org.org_id, tool: t, level: Math.max(level, base), enabled, updated_by: live.userId, updated_at: new Date().toISOString() });
  }, { ok: enabled ? `${TOOLS[t].label}: ${LEVEL_WORD[Math.max(level, TOOLS[t].level) as Level].toLowerCase()}.` : `${TOOLS[t].label} is switched off.` }).then(policies.reload);

  return (
    <Shell ws="kaju" crumb={["Kaju", "Rules and memory"]}>
      <div className="nx-page"><KajuPlaces />
        <div className="nx-head"><div><p className="nx-eyebrow">{org.name}</p><h1 className="nx-h1">Rules and memory</h1><p className="nx-sub">The database applies these when each step runs. A rule can make Kaju stricter than the defaults, never looser.</p></div></div>
        <TabBar id="kr" tabs={["Tools", ["Memory", memory.rows?.length], "Your limits"]} value={tab} onChange={setTab} />
        {tab === "Tools" ? <Section title="What each tool may do here">
          {policies.rows === null ? <Skeleton rows={6} /> : <table className="nx-rtable">
            <thead><tr><th>Tool</th><th>Default</th><th>In {org.short_name ?? org.name}</th></tr></thead>
            <tbody>{(Object.keys(TOOLS) as ToolName[]).map((t) => { const base = TOOLS[t].level as Level; const p = pol(t); const cur = p ? (p.enabled ? Math.max(p.level, base) : 9) : base; return (
              <tr key={t}><td><b>{TOOLS[t].label}</b>{TOOLS[t].external ? <small className="nx-t3"> · reaches outside StrayPaw</small> : null}</td><td><Chip tone={base >= 3 ? "warn" : "plain"}>{LEVEL_WORD[base]}</Chip></td>
                <td>{base === 4 ? <span className="nx-t3">Always a person</span> : lead ? <select aria-label={`${TOOLS[t].label} in this organisation`} value={cur} disabled={!!busy} onChange={(e) => { const v = Number(e.target.value); void setPolicy(t, v === 9 ? base : v, v !== 9); }}>
                  {[0, 1, 2, 3].filter((l) => l >= base).map((l) => <option key={l} value={l}>{LEVEL_WORD[l as Level]}</option>)}<option value={9}>Switched off</option></select> : <Chip tone={cur >= 3 ? "warn" : "plain"}>{LEVEL_WORD[cur as Level | 9]}</Chip>}</td></tr>); })}</tbody>
          </table>}
          {!lead ? <p className="nx-foot">Only leads and admins change these.</p> : <p className="nx-foot">Decisions on verification, laboratory results, clinical care and access to restricted data are always a person&apos;s, whatever is set here.</p>}
        </Section> : null}

        {tab === "Memory" ? <Section title="How we work" action={<button type="button" className="nx-btn is-sm" onClick={() => setAdding(true)}>Write one down</button>}>
          {memory.rows === null ? <Skeleton rows={4} /> : !memory.rows.length ? <Empty title="Nothing written down yet" hint="Add how your organisation does recurring work, such as preparing ABC evidence for the municipality. Kaju uses an entry once a lead approves it." /> : (
            <ul className="nx-mem">{memory.rows.map((m) => (
              <li key={m.id}><div className="nx-mem-h"><b>{m.title}</b><Chip tone={m.scope === "personal" ? "plain" : m.approved_at ? "ok" : "warn"}>{m.scope === "personal" ? "Only you" : m.approved_at ? "In use" : "Waiting for a lead"}</Chip><small className="nx-t3">{m.kind} · {dayTime(m.created_at)}</small></div>
                <p>{m.body}</p>
                <div className="nx-run-act">{lead && m.scope === "org" && !m.approved_at ? <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void run(`a${m.id}`, async () => await db!.rpc("nx_memory_decide", { p_id: m.id, p_action: "approve" }), { ok: "Approved. Kaju can use it now." }).then(memory.reload)}>Approve</button> : null}
                  {lead || m.created_by === live.userId ? <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void run(`r${m.id}`, async () => await db!.rpc("nx_memory_decide", { p_id: m.id, p_action: "revoke" }), { ok: "Removed. Kaju no longer uses it." }).then(memory.reload)}>Remove</button> : null}</div>
              </li>))}</ul>)}
        </Section> : null}

        {tab === "Your limits" ? <Section title="For you only">
          <div className="nx-checks">
            <label className="nx-chk"><div className="nx-chk-h"><input type="checkbox" checked={prefs.autonomy_cap < 2} onChange={(e) => void run("cap", () => save({ ...prefs, autonomy_cap: e.target.checked ? 1 : 2 }), { ok: e.target.checked ? "Kaju will ask you before every step that changes something." : "Low-risk internal steps run on their own again." })} /><span>Always ask me before Kaju changes anything</span></div><p className="nx-chk-m">Steps that would run on their own (a task, a post in an internal channel, a notification) wait for your approval too.</p></label>
            <label className="nx-chk"><div className="nx-chk-h"><input type="checkbox" checked={prefs.predictive} onChange={(e) => void run("pred", () => save({ ...prefs, predictive: e.target.checked }), { ok: e.target.checked ? "Kaju underlines what it understands as you type." : "The composer is a plain box now." })} /><span>Understand while I type</span></div><p className="nx-chk-m">Kaju underlines places, people, dates and channels it recognises, from names you can already see. It sends nothing until you press the button.</p></label>
          </div>
        </Section> : null}
      </div>
      {adding ? <Modal title="Write down how you work" onClose={() => setAdding(false)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setAdding(false)}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || draft.title.trim().length < 2 || draft.body.trim().length < 2} onClick={() => void run("add", async () => await db!.from("nx_kaju_memory").insert({ org_id: org.org_id, scope: draft.scope, kind: draft.scope === "personal" ? "preference" : draft.kind, title: draft.title.trim(), body: draft.body.trim() }), { ok: draft.scope === "personal" ? "Saved for you." : "Saved. A lead approves it before Kaju uses it." }).then((r) => { if (r.ok) { setAdding(false); setDraft({ title: "", body: "", kind: "procedure", scope: "org" }); memory.reload(); } })}>Save</button></>}>
        <div className="nx-fields">
          <Field label="For"><select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as "org" | "personal" })}><option value="org">The organisation (a lead approves it)</option><option value="personal">Only me (a preference)</option></select></Field>
          {draft.scope === "org" ? <Field label="Kind"><select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}><option value="procedure">How we do something</option><option value="template">A template we use</option><option value="decision">A decision we made</option><option value="fact">A fact about us</option></select></Field> : null}
          <Field label="Title" wide><input value={draft.title} maxLength={160} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="How we prepare ABC evidence for the municipality" autoFocus /></Field>
          <Field label="What to know" wide hint="Plain words. No patient details or personal contact information."><textarea rows={5} value={draft.body} maxLength={4000} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
        </div>
      </Modal> : null}
    </Shell>
  );
}
