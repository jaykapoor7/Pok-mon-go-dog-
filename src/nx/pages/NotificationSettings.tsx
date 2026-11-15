"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "../Shell";
import { Chip } from "../ui";
import { Empty, Field, Section, Skeleton, dayTime, useAct } from "../kit";
import { useLive } from "../live";
import { getSupabase } from "@/lib/supabase";

/* A person's own notification choices. In StrayPaw they always see their notifications. Outside it, nothing is sent
   unless they turn a channel on here and the deployment has that channel set up; every attempt is listed below. */

type S = { email: boolean; push: boolean; quiet_from: string | null; quiet_to: string | null; time_zone: string; muted_kinds: string[] };
type D = { id: string; channel: string; status: string; attempts: number; last_error: string | null; updated_at: string; nx_notifications: { title: string } | null };
const KINDS: [string, string][] = [["mention", "Mentions"], ["task", "Tasks for you"], ["approval", "Approvals"], ["handoff", "Handoffs from partners"], ["reminder", "Reminders"], ["system", "System notices"]];
const STATUS: Record<string, ["ok" | "warn" | "bad" | "plain", string]> = { sent: ["ok", "Sent"], queued: ["plain", "Waiting to send"], held_quiet: ["plain", "Held for quiet hours"], failed: ["bad", "Failed"], not_connected: ["warn", "Not connected"], cancelled: ["plain", "Cancelled"] };
const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };

export function NotificationSettings() {
  const live = useLive();
  const db = getSupabase();
  const [s, setS] = useState<S | null>(null);
  const [cap, setCap] = useState<{ email: boolean; push: boolean; pushKey: string | null } | null>(null);
  const [log, setLog] = useState<D[] | null>(null);
  const [tick, setTick] = useState(0);
  const { busy, run } = useAct();
  useEffect(() => { void fetch("/api/notifications/status").then((r) => r.json()).then(setCap).catch(() => setCap({ email: false, push: false, pushKey: null })); }, []);
  useEffect(() => {
    if (!db || !live.signedIn) return;
    void db.from("nx_notification_settings").select("email,push,quiet_from,quiet_to,time_zone,muted_kinds").maybeSingle().then(({ data }) => setS((data as S | null) ?? { email: false, push: false, quiet_from: null, quiet_to: null, time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata", muted_kinds: [] }));
    void db.from("nx_deliveries").select("id,channel,status,attempts,last_error,updated_at,nx_notifications(title)").order("updated_at", { ascending: false }).limit(30).then(({ data, error }) => setLog(error ? [] : (data ?? []) as unknown as D[]));
  }, [db, live.signedIn, tick]);
  const save = (next: S, ok: string) => run("save", async () => { const r = await db!.from("nx_notification_settings").upsert({ user_id: live.userId, ...next, updated_at: new Date().toISOString() }); if (!r.error) setS(next); return r; }, { ok });
  const pushOn = async () => {
    if (!cap?.pushKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return { error: "This browser cannot receive push notifications." };
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { error: "Notifications are blocked for this site in the browser's settings." };
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await (await navigator.serviceWorker.ready).pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cap.pushKey) });
    const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    void reg;
    const r = await db!.from("nx_push_subscriptions").upsert({ endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, user_id: live.userId }, { onConflict: "endpoint" });
    if (r.error) return r;
    return await db!.from("nx_notification_settings").upsert({ user_id: live.userId, ...s!, push: true, updated_at: new Date().toISOString() });
  };

  if (!live.ready) return <Shell crumb={["Settings", "Notifications"]}><div className="nx-page"><Skeleton /></div></Shell>;
  if (!live.signedIn) return <Shell crumb={["Settings", "Notifications"]}><div className="nx-page"><h1 className="nx-h1">Notifications</h1><p className="nx-sub">Sign in to choose how StrayPaw tells you about mentions, approvals and work for you. <Link href="/sign-in?next=/next/settings/notifications">Sign in</Link></p></div></Shell>;
  return (
    <Shell crumb={["Settings", "Notifications"]}>
      <div className="nx-page" style={{ maxWidth: 820 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">Your settings</p><h1 className="nx-h1">Notifications</h1><p className="nx-sub">Inside StrayPaw you always see them under the bell. Outside it, only what you turn on here, with a title and a link and never the message itself.</p></div></div>
        {!s ? <Skeleton rows={5} /> : <>
          <Section title="Outside StrayPaw">
            <div className="nx-checks">
              <label className="nx-chk"><div className="nx-chk-h"><input type="checkbox" checked={s.email} disabled={!!busy} onChange={(e) => void save({ ...s, email: e.target.checked }, e.target.checked ? "Email is on." : "Email is off.")} /><span>Email</span>{cap && !cap.email ? <Chip tone="warn">Not connected on this site</Chip> : null}</div><p className="nx-chk-m">{cap && !cap.email ? "This site has no email provider set up yet, so nothing is emailed even when this is on. Attempts are listed below as not connected." : "To the address you sign in with."}</p></label>
              <div className="nx-chk"><div className="nx-chk-h"><span>Browser push</span>{cap && !cap.push ? <Chip tone="warn">Not connected on this site</Chip> : s.push ? <Chip tone="ok">On</Chip> : null}</div><p className="nx-chk-m">{cap && !cap.push ? "Push needs keys this site does not have yet." : "On this browser, even when StrayPaw is closed."}</p>
                {cap?.push ? <div className="nx-chk-a">{s.push ? <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void save({ ...s, push: false }, "Push is off.")}>Turn off</button> : <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void run("push", pushOn, { ok: "Push is on for this browser." }).then(() => setTick((n) => n + 1))}>Turn on in this browser</button>}</div> : null}</div>
              <div className="nx-chk"><div className="nx-chk-h"><span>SMS and WhatsApp</span><Chip tone="warn">Not connected</Chip></div><p className="nx-chk-m">Team notifications stay inside StrayPaw. Messages to people outside it need an approved provider account.</p></div>
            </div>
          </Section>
          <Section title="Quiet hours">
            <div className="nx-fields" style={{ maxWidth: 520 }}>
              <Field label="From"><input type="time" value={s.quiet_from ?? ""} onChange={(e) => setS({ ...s, quiet_from: e.target.value || null })} /></Field>
              <Field label="Until"><input type="time" value={s.quiet_to ?? ""} onChange={(e) => setS({ ...s, quiet_to: e.target.value || null })} /></Field>
              <Field label="Time zone" wide><input value={s.time_zone} onChange={(e) => setS({ ...s, time_zone: e.target.value.slice(0, 60) })} /></Field>
            </div>
            <p style={{ marginTop: 8 }}><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void save(s, s.quiet_from && s.quiet_to ? `Quiet from ${s.quiet_from} to ${s.quiet_to}. Approvals still come through.` : "No quiet hours.")}>Save quiet hours</button></p>
            <p className="nx-foot">Approvals are never held back: something waiting for your decision reaches you.</p>
          </Section>
          <Section title="What to send outside StrayPaw">
            <div className="nx-checks">{KINDS.map(([k, label]) => <label key={k} className="nx-chk"><div className="nx-chk-h"><input type="checkbox" checked={!s.muted_kinds.includes(k)} disabled={!!busy} onChange={(e) => void save({ ...s, muted_kinds: e.target.checked ? s.muted_kinds.filter((x) => x !== k) : [...s.muted_kinds, k] }, e.target.checked ? `${label} will be sent.` : `${label} stay inside StrayPaw.`)} /><span>{label}</span></div></label>)}</div>
          </Section>
        </>}
        <Section title="Recent deliveries" count={log?.length}>
          {log === null ? <Skeleton rows={3} /> : !log.length ? <Empty title="Nothing sent outside StrayPaw yet" /> : <table className="nx-rtable"><thead><tr><th>When</th><th>What</th><th>How</th><th>Result</th></tr></thead><tbody>{log.map((d) => { const [t, w] = STATUS[d.status] ?? ["plain", d.status]; return <tr key={d.id}><td>{dayTime(d.updated_at)}</td><td>{d.nx_notifications?.title ?? "Notification"}</td><td>{d.channel === "push" ? "Push" : d.channel === "email" ? "Email" : d.channel}</td><td><Chip tone={t}>{w}</Chip>{d.last_error ? <small className="nx-t3"> {d.last_error}</small> : null}</td></tr>; })}</tbody></table>}
        </Section>
      </div>
    </Shell>
  );
}
