"use client";

/* Settings → Connections. The tools an organisation uses, connected to
   Kaju per person: connect, see what Kaju may do, share with the
   organisation where its lead allows, disconnect. Status comes from the
   server; nothing is shown as connected unless it is. */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FileText, Lock, MapPin, MessageCircle, MessageSquare } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { CAPABILITY, PROVIDERS, type Capability, type ConnectionView, type Provider, type ProviderId } from "@/lib/connections/providers";
import { Btn, Head, Note, Page, Panel, Row, Rows, Section, Tag } from "@/ws/kit";
import { Reading } from "../ui/Reading";
import "../ngo/org.k.css";
import "./connections.css";

type Row = Omit<Provider, "scopes" | "env" | "oauth"> & { view?: ConnectionView; policy: { allowed: boolean; allow_org_sharing: boolean } };
type Svc = { name: string; line: string; status: string; policy?: { allowed: boolean } };
type Data = { me: { org: boolean; admin: boolean }; providers: Row[]; native: { name: string; line: string; read: string[]; create: string[] }; services: { maps: Svc; sms: Svc }; planned: readonly { name: string; line: string }[] };

async function api(path: string, init: RequestInit = {}) {
  const t = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
  const r = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Something went wrong");
  return j;
}

type Tone = "green" | "amber" | "plain";
const STATE: Record<ConnectionView["status"], { label: string; tone: Tone }> = {
  connected: { label: "Connected", tone: "green" }, available: { label: "Not connected", tone: "plain" }, expired: { label: "Reconnect needed", tone: "amber" },
  error: { label: "Reconnect needed", tone: "amber" }, blocked: { label: "Off for your organisation", tone: "plain" }, unavailable: { label: "Not available yet", tone: "plain" },
};

export function Connections({ back }: { back: string }) {
  const { user, ready } = useAuth();
  const params = useSearchParams();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(async () => { try { setD(await api("/api/connections")); setErr(null); } catch (e) { setErr((e as Error).message); } }, []);
  useEffect(() => { if (ready && user) void load(); }, [ready, user, load]);
  useEffect(() => {
    const s = params?.get("connection"), p = params?.get("provider");
    if (!s) return;
    const name = ({ google: "Google Workspace", microsoft: "Microsoft 365", slack: "Slack", zoho: "Zoho Workplace" } as Record<string, string>)[p ?? ""] ?? "The account";
    setMsg(s === "connected" ? { ok: true, text: `${name} connected.` } : s === "cancelled" ? { ok: false, text: "Connection cancelled. Nothing was changed." } : { ok: false, text: `${name} could not be connected. Try again.` });
  }, [params]);

  const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); if (done) setMsg({ ok: true, text: done }); await load(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  };
  const connect = (p: ProviderId, caps: Capability[] = []) => act(`c:${p}`, async () => { const j = await api(`/api/connections/${p}/start?back=${encodeURIComponent(back)}${caps.length ? `&caps=${caps.join(",")}` : ""}`, { method: "POST" }); window.location.assign(j.url); });

  const title = back.startsWith("/city") ? "Connections" : "Settings";
  if (ready && !user) return <Page width="narrow"><Head title="Connections" sum="Sign in to connect your tools with Kaju." actions={<Btn href="/sign-in">Sign in</Btn>} /></Page>;
  const linked = d ? d.providers.filter((p) => p.view?.status === "connected").length : 0;

  return (
    <Page width="narrow" className="cx">
      <Head title={title} sum={!d ? (err ? "Your connections could not be read." : <Reading>Reading your connections</Reading>) : <>The tools your organisation uses with Kaju. {linked ? <><b>{linked}</b> of your accounts {linked === 1 ? "is" : "are"} connected.</> : "None of your accounts is connected."}</>} />
      {msg && <Note tone={msg.ok ? "plain" : "flame"}><span role={msg.ok ? "status" : undefined}>{msg.text}</span></Note>}
      {err ? <Note tone="flame">{err}</Note> : !d ? <div className="og-skel" aria-busy="true"><i /><i /><i /></div> : (
        <>
          <Section title="Your accounts">
            <Panel>
              <ul className="k-rows" aria-label="Your accounts">
                {d.providers.map((p) => {
                  const v = p.view, st = STATE[v?.status ?? "unavailable"];
                  const on = v?.status === "connected", stale = v?.status === "expired" || v?.status === "error", shown = open === p.id;
                  return (
                    <li key={p.id}>
                      <div className="k-row og-wrap">
                        <button type="button" className="og-x-btn" aria-expanded={shown} aria-label={`What Kaju can do with ${p.name}`} onClick={() => setOpen(shown ? null : p.id)}><ChevronRight size={14} aria-hidden /></button>
                        <span className={`cx-logo is-${p.id}`} aria-hidden>{({ google: "G", microsoft: "M", slack: "S", zoho: "Z" } as Record<string, string>)[p.id]}</span>
                        <span className="k-row-t"><b>{p.name}</b><small>{on && v?.account_email ? `Connected as ${v.account_email}${v.last_used_at ? ` · last used ${new Date(v.last_used_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}` : stale ? `${v?.last_error ?? "Access expired"}. Reconnect to keep using it.` : p.apps.join(" · ")}</small></span>
                        <span className="k-row-e">
                          <Tag tone={st.tone}>{st.label}</Tag>
                          {on ? <Btn small disabled={!!busy} onClick={() => act(`d:${p.id}`, () => api(`/api/connections/${p.id}`, { method: "DELETE" }), `${p.name} disconnected.`)}>Disconnect</Btn>
                            : stale ? <><Btn small variant="primary" disabled={!!busy} onClick={() => connect(p.id)}>Reconnect</Btn><Btn small disabled={!!busy} onClick={() => act(`d:${p.id}`, () => api(`/api/connections/${p.id}`, { method: "DELETE" }), `${p.name} disconnected.`)}>Disconnect</Btn></>
                            : v?.status === "available" ? <Btn small disabled={!!busy} onClick={() => connect(p.id)}>{busy === `c:${p.id}` ? "Opening…" : "Connect"}</Btn>
                            : <span className="cx-lock"><Lock size={12} aria-hidden /> Set up by an administrator</span>}
                        </span>
                      </div>
                      {shown && (
                        <div className="og-x cx-x">
                          <p className="og-p">{p.line}</p>
                          <div><h3>{d.me.admin ? "What Kaju can do · settings" : "What Kaju can do"}</h3>
                            <ul className="og-list cx-caps">{p.capabilities.map((c: Capability) => {
                              const granted = !on || (v?.capabilities ?? []).includes(c);
                              const opt = (PROVIDERS[p.id].optional ?? {})[c];
                              return <li key={c} className={granted ? undefined : "is-off"}>{CAPABILITY[c].label}{CAPABILITY[c].writes ? <em>asks you first</em> : null}
                                {on && !granted && <em>{opt ? "not allowed yet" : "not granted"}</em>}
                                {!on && opt && <em>only if you allow it</em>}
                                {on && !granted && opt && <button type="button" className="og-a cx-allow" disabled={!!busy} onClick={() => connect(p.id, [c])}>Allow</button>}
                              </li>;
                            })}</ul></div>
                          <p className="og-hint">Kaju sees only what you can see in {p.name}. Sending and saving wait for your confirmation.</p>
                          {on && d.me.org && p.policy.allow_org_sharing && (
                            <label className="og-check"><input type="checkbox" checked={!!v?.share_with_org} disabled={!!busy} onChange={(e) => act(`s:${p.id}`, () => api(`/api/connections/${p.id}`, { method: "PATCH", body: JSON.stringify({ share: e.target.checked }) }))} /> Visible to my organisation</label>
                          )}
                          {d.me.admin && (
                            <div><h3>Organisation settings</h3>
                              <label className="og-check"><input type="checkbox" checked={p.policy.allowed} disabled={!!busy} onChange={(e) => act(`p:${p.id}`, () => api("/api/connections/policy", { method: "POST", body: JSON.stringify({ provider: p.id, allowed: e.target.checked, allow_org_sharing: e.target.checked && p.policy.allow_org_sharing }) }))} /> Members may connect {p.name}</label>
                              <label className="og-check"><input type="checkbox" checked={p.policy.allow_org_sharing} disabled={!!busy || !p.policy.allowed} onChange={(e) => act(`p:${p.id}`, () => api("/api/connections/policy", { method: "POST", body: JSON.stringify({ provider: p.id, allowed: true, allow_org_sharing: e.target.checked }) }))} /> Members may make their connection visible to the organisation</label>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </Section>
          <Section title="For the whole organisation">
            <Panel>
              <ul className="k-rows" aria-label="For the whole organisation">
                <li><div className="k-row og-wrap"><span className="k-row-i" aria-hidden><FileText size={14} /></span><span className="k-row-t" title={d.native.line}><b>{d.native.name}</b><small>{d.native.line}</small></span><span className="k-row-e"><Tag tone="green">Ready</Tag></span></div></li>
                <li><div className="k-row og-wrap"><span className="k-row-i" aria-hidden><MapPin size={14} /></span><span className="k-row-t" title={d.services.maps.line}><b>{d.services.maps.name}</b><small>{d.services.maps.line}</small></span><span className="k-row-e"><Tag tone="green">Ready</Tag></span></div></li>
                <li><div className="k-row og-wrap"><span className="k-row-i" aria-hidden><MessageCircle size={14} /></span><span className="k-row-t" title="Field and resident reports arrive in Intake with photos, voice notes and location."><b>WhatsApp Business</b><small>Field and resident reports arrive in Intake with photos, voice notes and location.</small></span><span className="k-row-e"><Tag>Not linked</Tag>{d.me.admin ? <Btn small href="/contact">Link number</Btn> : <span className="cx-lock">An administrator links the number.</span>}</span></div></li>
                <li>
                  <div className="k-row og-wrap"><span className="k-row-i" aria-hidden><MessageSquare size={14} /></span><span className="k-row-t" title={d.services.sms.line}><b>{d.services.sms.name}</b><small>{d.services.sms.line}</small></span>
                    <span className="k-row-e"><Tag tone={d.services.sms.status === "configured" && d.services.sms.policy?.allowed ? "green" : "plain"}>{d.services.sms.status !== "configured" ? "Not set up" : d.services.sms.policy?.allowed ? "On" : "Off"}</Tag>{d.services.sms.status !== "configured" ? <span className="cx-lock"><Lock size={12} aria-hidden /> Set up by an administrator</span> : !d.me.admin ? <span className="cx-lock">Your organisation lead decides whether SMS is used.</span> : null}</span></div>
                  {d.services.sms.status === "configured" && d.me.admin && <div className="og-x cx-x"><label className="og-check"><input type="checkbox" checked={!!d.services.sms.policy?.allowed} disabled={!!busy} onChange={(e) => act("p:sms", () => api("/api/connections/policy", { method: "POST", body: JSON.stringify({ provider: "sms", allowed: e.target.checked, allow_org_sharing: false }) }))} /> Leads and coordinators may send SMS with Kaju</label></div>}
                </li>
              </ul>
            </Panel>
          </Section>
          <Section title="More integrations" fold="planned" open={false} count={d.planned.length}>
            <Panel><Rows label="More integrations">{d.planned.map((x) => <Row key={x.name} href="/contact" title={x.name} meta={x.line} end="Set up" />)}</Rows></Panel>
          </Section>
        </>
      )}
    </Page>
  );
}
