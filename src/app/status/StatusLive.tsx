"use client";

import { useEffect, useState } from "react";

type Health = { status?: string; database?: string; databaseMs?: number; sha?: string };
type Row = { name: string; what: string; state: "checking" | "ok" | "down" | "unknown"; note?: string };

/* A live check from the visitor's own browser: the application answers, and the application can read the
   database. It reports what is true at this moment; no history is kept or implied. */
export function StatusLive() {
  const [h, setH] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState<Date | null>(null);
  const check = () => { setFailed(false); setH(null);
    fetch("/api/health?deep=1", { cache: "no-store" }).then(async (r) => { setH((await r.json()) as Health); setAt(new Date()); }).catch(() => { setFailed(true); setAt(new Date()); }); };
  useEffect(check, []);
  const app: Row["state"] = failed ? "down" : h ? "ok" : "checking";
  const db: Row["state"] = failed ? "unknown" : !h ? "checking" : h.database === "ok" ? "ok" : h.database === "unreachable" ? "down" : "unknown";
  const rows: Row[] = [
    { name: "Website and application", what: "Pages, sign-in and workspaces", state: app },
    { name: "Database", what: "Records, files and permissions", state: db, note: h?.databaseMs != null && db === "ok" ? `answered in ${h.databaseMs} ms` : undefined },
  ];
  const all = rows.every((r) => r.state === "ok"), any = rows.some((r) => r.state === "down");
  const label = (s: Row["state"]) => (s === "ok" ? "Working" : s === "down" ? "Not responding" : s === "checking" ? "Checking" : "Not known");
  return (
    <div className="st-live">
      <p className={`st-banner is-${any ? "down" : all ? "ok" : "wait"}`} role="status">{any ? "Something is not responding right now." : all ? "All systems are working." : "Checking now…"}</p>
      <ul className="st-rows">{rows.map((r) => <li key={r.name}><span className={`st-dot is-${r.state}`} aria-hidden /><span><b>{r.name}</b><small>{r.what}{r.note ? ` · ${r.note}` : ""}</small></span><em className={`is-${r.state}`}>{label(r.state)}</em></li>)}</ul>
      <p className="st-meta">{at ? `Checked from your browser at ${at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.` : "Checking…"} <button type="button" onClick={check}>Check again</button>{h?.sha ? <> · Release <code>{h.sha.slice(0, 7)}</code></> : null}</p>
    </div>
  );
}
