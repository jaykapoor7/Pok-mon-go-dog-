"use client";

/* Settings → Connections. The tools an organisation uses, connected to
   Kaju per person: connect, see what Kaju may do, share with the
   organisation where its lead allows, disconnect. Status comes from the
   server; nothing is shown as connected unless it is. */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, FileText, Lock, Plug, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { CAPABILITY, type Capability, type ConnectionView, type Provider, type ProviderId } from "@/lib/connections/providers";
import { Reading } from "../ui/Reading";
import "../ngo/ngo.css";
import "./connections.css";

type Row = Omit<Provider, "scopes" | "env"> & { view?: ConnectionView; policy: { allowed: boolean; allow_org_sharing: boolean } };
type Data = { me: { org: boolean; admin: boolean }; providers: Row[]; native: { name: string; line: string; read: string[]; create: string[] }; planned: readonly { name: string; line: string }[] };

async function api(path: string, init: RequestInit = {}) {
  const t = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
  const r = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Something went wrong");
  return j;
}

const STATE: Record<ConnectionView["status"], { label: string; tone: string }> = {
  connected: { label: "Connected", tone: "ok" }, available: { label: "Not connected", tone: "idle" }, expired: { label: "Reconnect needed", tone: "warn" },
  error: { label: "Reconnect needed", tone: "warn" }, blocked: { label: "Off for your organisation", tone: "off" }, unavailable: { label: "Not available yet", tone: "off" },
};

export function Connections({ back }: { back: string }) {
  const { user, ready } = useAuth();
  const params = useSearchParams();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => { try { setD(await api("/api/connections")); setErr(null); } catch (e) { setErr((e as Error).message); } }, []);
  useEffect(() => { if (ready && user) void load(); }, [ready, user, load]);
  useEffect(() => {
    const s = params?.get("connection"), p = params?.get("provider");
    if (!s) return;
    const name = p === "google" ? "Google Workspace" : p === "microsoft" ? "Microsoft 365" : "The account";
    setMsg(s === "connected" ? { ok: true, text: `${name} connected.` } : s === "cancelled" ? { ok: false, text: "Connection cancelled. Nothing was changed." } : { ok: false, text: `${name} could not be connected. Try again.` });
  }, [params]);

  const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); if (done) setMsg({ ok: true, text: done }); await load(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  };
  const connect = (p: ProviderId) => act(`c:${p}`, async () => { const j = await api(`/api/connections/${p}/start?back=${encodeURIComponent(back)}`, { method: "POST" }); window.location.assign(j.url); });

  if (ready && !user) return <div className="ngo-page"><header className="ngo-head"><div><h1>Connections</h1></div><p className="ngo-sum">Sign in to connect your tools with Kaju.</p></header><Link className="btn is-s" href="/sign-in">Sign in</Link></div>;

  return (
    <div className="ngo-page cx">
      <header className="ngo-head">
        <div><h1>Connections</h1></div>
        <p className="ngo-sum">Connect the tools your organisation uses with Kaju.</p>
      </header>
      {msg && <p className={msg.ok ? "cx-ok" : "cx-err"} role={msg.ok ? "status" : "alert"}>{msg.ok ? <Check size={14} aria-hidden /> : <TriangleAlert size={14} aria-hidden />}{msg.text}</p>}
      {err ? <p className="cx-err" role="alert">{err}</p> : !d ? <div className="cx-card"><Reading>Reading your connections</Reading></div> : (
        <>
          <ul className="cx-list">
            {d.providers.map((p) => {
              const v = p.view, st = STATE[v?.status ?? "unavailable"];
              const on = v?.status === "connected", stale = v?.status === "expired" || v?.status === "error";
              return (
                <li key={p.id} className="cx-card">
                  <div className="cx-top">
                    <div className="cx-id"><span className={`cx-logo is-${p.id}`} aria-hidden>{p.id === "google" ? "G" : "M"}</span><div><b>{p.name}</b><small>{p.apps.join(" · ")}</small></div></div>
                    <span className={`cx-state is-${st.tone}`}>{st.label}</span>
                  </div>
                  <p className="cx-line">{p.line}</p>
                  {on && v?.account_email && <p className="cx-acct">Connected as <b>{v.account_email}</b>{v.last_used_at ? ` · last used ${new Date(v.last_used_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</p>}
                  {stale && <p className="cx-note"><TriangleAlert size={13} aria-hidden /> {v?.last_error ?? "Access expired"}. Reconnect to keep using it.</p>}
                  {v?.status === "unavailable" && <p className="cx-note"><Lock size={13} aria-hidden /> An administrator needs to finish setting this up before anyone can connect.</p>}
                  <details className="cx-perm">
                    <summary>What Kaju can do</summary>
                    <ul>{p.capabilities.map((c: Capability) => <li key={c}>{CAPABILITY[c].label}{CAPABILITY[c].writes ? <em>asks you first</em> : null}</li>)}</ul>
                    <p>Kaju uses your own access, so it sees only what you can see in {p.name}. Sending, creating and saving always wait for your confirmation.</p>
                  </details>
                  <div className="cx-act">
                    {on ? (
                      <>
                        <button type="button" className="btn is-s" disabled={!!busy} onClick={() => act(`d:${p.id}`, () => api(`/api/connections/${p.id}`, { method: "DELETE" }), `${p.name} disconnected.`)}>Disconnect</button>
                        {d.me.org && p.policy.allow_org_sharing && (
                          <label className="cx-share"><input type="checkbox" checked={!!v?.share_with_org} disabled={!!busy} onChange={(e) => act(`s:${p.id}`, () => api(`/api/connections/${p.id}`, { method: "PATCH", body: JSON.stringify({ share: e.target.checked }) }))} /> Visible to my organisation</label>
                        )}
                      </>
                    ) : stale ? (
                      <><button type="button" className="btn is-ink is-s" disabled={!!busy} onClick={() => connect(p.id)}>Reconnect</button><button type="button" className="btn is-s" disabled={!!busy} onClick={() => act(`d:${p.id}`, () => api(`/api/connections/${p.id}`, { method: "DELETE" }), `${p.name} disconnected.`)}>Disconnect</button></>
                    ) : v?.status === "available" ? (
                      <button type="button" className="btn is-ink is-s" disabled={!!busy} onClick={() => connect(p.id)}>{busy === `c:${p.id}` ? "Opening…" : "Connect"}</button>
                    ) : <button type="button" className="btn is-s" disabled>Connect</button>}
                  </div>
                  {d.me.admin && (
                    <div className="cx-policy">
                      <p>Organisation settings</p>
                      <label><input type="checkbox" checked={p.policy.allowed} disabled={!!busy} onChange={(e) => act(`p:${p.id}`, () => api("/api/connections/policy", { method: "POST", body: JSON.stringify({ provider: p.id, allowed: e.target.checked, allow_org_sharing: e.target.checked && p.policy.allow_org_sharing }) }))} /> Members may connect {p.name}</label>
                      <label><input type="checkbox" checked={p.policy.allow_org_sharing} disabled={!!busy || !p.policy.allowed} onChange={(e) => act(`p:${p.id}`, () => api("/api/connections/policy", { method: "POST", body: JSON.stringify({ provider: p.id, allowed: true, allow_org_sharing: e.target.checked }) }))} /> Members may make their connection visible to the organisation</label>
                    </div>
                  )}
                </li>
              );
            })}
            <li className="cx-card">
              <div className="cx-top"><div className="cx-id"><span className="cx-logo is-files" aria-hidden><FileText size={16} /></span><div><b>{d.native.name}</b><small>{d.native.read.join(" · ")}</small></div></div><span className="cx-state is-ok">Ready</span></div>
              <p className="cx-line">{d.native.line}</p>
            </li>
          </ul>
          <section className="cx-planned" aria-labelledby="cx-planned-h">
            <h2 id="cx-planned-h"><Plug size={14} aria-hidden /> Coming later</h2>
            <ul>{d.planned.map((x) => <li key={x.name}><b>{x.name}</b><span>{x.line}</span></li>)}</ul>
          </section>
        </>
      )}
    </div>
  );
}
