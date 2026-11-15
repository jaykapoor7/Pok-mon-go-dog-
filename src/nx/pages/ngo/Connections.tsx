"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FileText, Lock, MapPin, MessageCircle, MessageSquare } from "lucide-react";
import { CAPABILITY, PROVIDERS, type Capability } from "@/lib/connections/providers";
import { connectStart, connectionReturn, disconnect, readConnections, setConnectionPolicy, shareConnection, type ConnStatus, type Connections } from "../../data/ngo-setup";
import { Confirm, Failed, Skeleton, errText, toast, useAct } from "../../kit";
import { Chip } from "../../ui";
import type { Tone } from "../../fixtures";
import { TryLink } from "./frame";

/* Connections: the tools a person uses, connected to Kaju one person at a time. Connect (the provider's own sign-in,
   then back here), see what Kaju may do, share with the organisation where its lead allows, disconnect. Leads set
   the organisation's policy, SMS included. Status comes from the server; nothing is shown connected unless it is. */

const STATE: Record<ConnStatus, { label: string; tone: Tone }> = { connected: { label: "Connected", tone: "ok" }, available: { label: "Not connected", tone: "plain" }, expired: { label: "Reconnect needed", tone: "warn" }, error: { label: "Reconnect needed", tone: "warn" }, blocked: { label: "Off for your organisation", tone: "plain" }, unavailable: { label: "Not available yet", tone: "plain" } };
const LOGO: Record<string, string> = { google: "G", microsoft: "M", slack: "S", zoho: "Z" };
const NAME: Record<string, string> = { google: "Google Workspace", microsoft: "Microsoft 365", slack: "Slack", zoho: "Zoho Workplace" };
const SAMPLE: Connections = {
  me: { org: true, admin: true },
  providers: (["google", "microsoft", "slack", "zoho"] as const).map((id, i) => ({ id, name: NAME[id], apps: PROVIDERS[id].apps, line: PROVIDERS[id].line, capabilities: PROVIDERS[id].capabilities, view: { status: i === 0 ? "connected" : i === 3 ? "unavailable" : "available", account_email: i === 0 ? "priya@example.org" : null, capabilities: i === 0 ? PROVIDERS[id].capabilities.slice(0, 3) : [] }, policy: { allowed: i !== 3, allow_org_sharing: i === 0 } })),
  native: { name: "StrayPaw records", line: "Cases, animals, care and packages your organisation keeps here.", read: [], create: [] },
  services: { maps: { name: "Maps", line: "Places and routes for field work.", status: "configured" }, sms: { name: "SMS", line: "Text messages to residents and volunteers, sent only when a lead allows it.", status: "configured", policy: { allowed: false } } },
  planned: [{ name: "Municipal case systems", line: "Hand over cases to a city's own system." }],
};

export function ConnectionsPanel({ back, sample }: { back: string; sample: boolean }) {
  const [d, setD] = useState<Connections | null>(sample ? SAMPLE : null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<{ id: string; name: string } | null>(null);
  const { busy, run } = useAct();
  const load = useCallback(async () => { if (sample) return; try { setD(await readConnections()); setErr(null); } catch (e) { setErr(errText(e)); } }, [sample]);
  useEffect(() => { void load(); }, [load]);
  /* Coming back from a provider: say what happened once, then clean the address. */
  useEffect(() => {
    const { state, provider } = connectionReturn(window.location.search);
    if (!state) return;
    const name = NAME[provider ?? ""] ?? "The account";
    toast(state === "connected" ? { text: `${name} connected.`, tone: "ok" } : state === "cancelled" ? { text: "Connection cancelled. Nothing was changed.", tone: "plain" } : { text: `${name} could not be connected. Try again.`, tone: "bad" });
    try { const u = new URL(window.location.href); u.search = back.includes("?") ? back.slice(back.indexOf("?")) : ""; window.history.replaceState(window.history.state, "", u.pathname + u.search); } catch {}
  }, [back]);
  const connect = (id: string, caps: Capability[] = []) => void run(`c:${id}`, () => connectStart(id, back, caps), { quiet: true });
  const act = (key: string, fn: () => Promise<unknown>, ok?: string) => void run(key, fn, { ok }).then((x) => { if (x.ok) void load(); });
  if (err && !d) return <Failed error={`Your connections could not be read. ${err}`} retry={() => void load()} />;
  if (!d) return <Skeleton rows={5} label="Reading your connections" />;
  const linked = d.providers.filter((p) => p.view?.status === "connected").length;
  return (
    <>
      <p className="ns-sum" style={{ margin: "16px 0 8px" }}>The tools you use with Kaju. {linked ? <><b>{linked}</b> of your accounts {linked === 1 ? "is" : "are"} connected.</> : "None of your accounts is connected."} Kaju sees only what you can see there, and anything it would send or save waits for your confirmation.</p>
      <div className="nx-sec-h"><h2>Your accounts</h2></div>
      <ul className="ns-conn" aria-label="Your accounts">
        {d.providers.map((p) => {
          const v = p.view, st = STATE[v?.status ?? "unavailable"], on = v?.status === "connected", stale = v?.status === "expired" || v?.status === "error", shown = open === p.id;
          return (
            <li key={p.id}>
              <div className="ns-conn-h">
                <span className="ns-conn-l" aria-hidden>{LOGO[p.id]}</span>
                <span className="ns-conn-t"><b>{p.name}</b><small>{on && v?.account_email ? `Connected as ${v.account_email}${v.last_used_at ? ` · last used ${new Date(v.last_used_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}` : stale ? `${v?.last_error ?? "Access expired"}. Reconnect to keep using it.` : p.apps.join(" · ")}</small></span>
                <span className="ns-conn-e">
                  <Chip tone={st.tone}>{st.label}</Chip>
                  {sample ? <TryLink quiet small>{on ? "Disconnect" : "Connect"}</TryLink>
                    : on ? <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => setLeaving({ id: p.id, name: p.name })}>Disconnect</button>
                    : stale ? <><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => connect(p.id)}>Reconnect</button><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => setLeaving({ id: p.id, name: p.name })}>Disconnect</button></>
                    : v?.status === "available" ? <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => connect(p.id)}>{busy === `c:${p.id}` ? "Opening…" : "Connect"}</button>
                    : <span className="ns-lock"><Lock size={12} />Set up by an administrator</span>}
                  <button type="button" className="nx-ib" aria-expanded={shown} aria-label={`What Kaju can do with ${p.name}`} onClick={() => setOpen(shown ? null : p.id)}><ChevronRight size={14} style={{ transform: shown ? "rotate(90deg)" : undefined, transition: "transform .14s" }} /></button>
                </span>
              </div>
              {shown ? <div className="ns-conn-x">
                <p className="nx-sub">{p.line}</p>
                <ul className="ns-caps">{(p.capabilities as Capability[]).map((c) => {
                  const granted = !on || (v?.capabilities ?? []).includes(c);
                  const opt = (PROVIDERS[p.id].optional ?? {})[c];
                  return <li key={c} className={granted ? undefined : "is-off"}>{CAPABILITY[c]?.label ?? c}{CAPABILITY[c]?.writes ? <em>asks you first</em> : null}{on && !granted ? <em>{opt ? "not allowed yet" : "not granted"}</em> : null}{!on && opt ? <em>only if you allow it</em> : null}{on && !granted && opt && !sample ? <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => connect(p.id, [c])}>Allow</button> : null}</li>;
                })}</ul>
                {on && d.me.org && p.policy.allow_org_sharing ? <label className="ns-check"><input type="checkbox" checked={!!v?.share_with_org} disabled={!!busy || sample} onChange={(e) => act(`s:${p.id}`, () => shareConnection(p.id, e.target.checked), e.target.checked ? `${p.name} is visible to your organisation.` : `${p.name} is private to you again.`)} />Visible to my organisation</label> : null}
                {d.me.admin ? <div className="ns-stack" style={{ gap: 6 }}><b style={{ fontWeight: 600, fontSize: 12 }}>Organisation settings</b>
                  <label className="ns-check"><input type="checkbox" checked={p.policy.allowed} disabled={!!busy || sample} onChange={(e) => act(`p:${p.id}`, () => setConnectionPolicy(p.id, e.target.checked, e.target.checked && p.policy.allow_org_sharing), "Organisation setting saved.")} />Members may connect {p.name}</label>
                  <label className="ns-check"><input type="checkbox" checked={p.policy.allow_org_sharing} disabled={!!busy || !p.policy.allowed || sample} onChange={(e) => act(`p:${p.id}`, () => setConnectionPolicy(p.id, true, e.target.checked), "Organisation setting saved.")} />Members may make their connection visible to the organisation</label>
                </div> : null}
              </div> : null}
            </li>
          );
        })}
      </ul>
      <div className="nx-sec-h" style={{ marginTop: 24 }}><h2>For the whole organisation</h2></div>
      <ul className="ns-conn" aria-label="For the whole organisation">
        <li><div className="ns-conn-h"><span className="ns-conn-l" aria-hidden><FileText size={13} /></span><span className="ns-conn-t"><b>{d.native.name}</b><small>{d.native.line}</small></span><span className="ns-conn-e"><Chip tone="ok">Ready</Chip></span></div></li>
        <li><div className="ns-conn-h"><span className="ns-conn-l" aria-hidden><MapPin size={13} /></span><span className="ns-conn-t"><b>{d.services.maps.name}</b><small>{d.services.maps.line}</small></span><span className="ns-conn-e"><Chip tone="ok">Ready</Chip></span></div></li>
        <li><div className="ns-conn-h"><span className="ns-conn-l" aria-hidden><MessageCircle size={13} /></span><span className="ns-conn-t"><b>WhatsApp Business</b><small>Field and resident reports arrive in the Inbox with photos, voice notes and location.</small></span><span className="ns-conn-e"><Chip>Not linked</Chip>{d.me.admin ? <Link className="nx-btn is-quiet is-sm" href="/contact">Link a number</Link> : <span className="ns-lock">An administrator links the number.</span>}</span></div></li>
        <li><div className="ns-conn-h"><span className="ns-conn-l" aria-hidden><MessageSquare size={13} /></span><span className="ns-conn-t"><b>{d.services.sms.name}</b><small>{d.services.sms.line}</small></span><span className="ns-conn-e"><Chip tone={d.services.sms.status === "configured" && d.services.sms.policy?.allowed ? "ok" : "plain"}>{d.services.sms.status !== "configured" ? "Not set up" : d.services.sms.policy?.allowed ? "On" : "Off"}</Chip>{d.services.sms.status !== "configured" ? <span className="ns-lock"><Lock size={12} />Set up by an administrator</span> : !d.me.admin ? <span className="ns-lock">Your organisation lead decides whether SMS is used.</span> : null}</span></div>
          {d.services.sms.status === "configured" && d.me.admin ? <div className="ns-conn-x"><label className="ns-check"><input type="checkbox" checked={!!d.services.sms.policy?.allowed} disabled={!!busy || sample} onChange={(e) => act("p:sms", () => setConnectionPolicy("sms", e.target.checked, false), e.target.checked ? "SMS is on for leads and coordinators." : "SMS is off.")} />Leads and coordinators may send SMS with Kaju</label></div> : null}
        </li>
      </ul>
      {d.planned.length ? <details className="ns-details" style={{ marginTop: 16 }}><summary>More integrations ({d.planned.length})</summary><ul className="nx-feed">{d.planned.map((x) => <li key={x.name}><span className="nx-feed-i"><ChevronRight size={12} /></span><div><b>{x.name}</b><p>{x.line}</p></div></li>)}</ul><p className="nx-foot">These are not connected. <Link className="ns-link" href="/contact">Ask about one</Link>.</p></details> : null}
      {leaving ? <Confirm danger title={`Disconnect ${leaving.name}`} confirm="Disconnect" busy={busy === `d:${leaving.id}`} onClose={() => setLeaving(null)} onConfirm={() => { const l = leaving; setLeaving(null); act(`d:${l.id}`, () => disconnect(l.id), `${l.name} disconnected.`); }}><p>Kaju stops using {leaving.name} for you at once. You can connect it again later.</p></Confirm> : null}
    </>
  );
}
