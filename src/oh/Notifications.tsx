"use client";

/* ════════════════════════════════════════════════════════════════════
   Notifications: everything that needs this person, across every place
   they work, in one list behind the bell in the top bar.

   It reads the same live sources as each place's Today, so it never says
   more than the records do:
     · each place's own counts (oh_my_today, via usePlaces): doses due or
       overdue, completion calls, notices from the public, samples waiting,
       requests from partners, service confirmations that have lapsed;
     · the alerts of the programmes this person oversees (oh_alerts):
       confirmed cases, PEP readiness, overdue doses across facilities,
       coverage below target, courses completed, revaccination due.
   An alert can be acknowledged here (oh_ack_alert, recorded with the
   person's name for every partner to see). What this device has already
   shown is remembered on this device only, so the badge counts what is new.

   It does not message patients: reminder and completion calls are made by
   the facility and logged there. SMS and WhatsApp are not connected.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { usePlaces, oversees } from "./places";
import { call, KIND_LABEL, type Alert, type Place } from "./data";
import "./notifications.css";

type Tone = "flame" | "amber" | "blue" | "green";
type Note = { id: string; tone: Tone; title: string; meta: string; href: string; group: "now" | "today" | "updates"; alert?: { programme: string; key: string; n: number } };

const SEEN = "sp.notes.seen.v1";
const readSeen = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(SEEN) ?? "[]") as string[]); } catch { return new Set(); } };
const writeSeen = (s: Set<string>) => { try { localStorage.setItem(SEEN, JSON.stringify([...s].slice(-400))); } catch { /* storage blocked: the badge resets with the page */ } };

const short = (p: Place) => p.short_name ?? p.name;

/* What each place's own counts mean, and where each one is dealt with. */
function placeNotes(p: Place): Note[] {
  const w = `/workspace/${p.organisation_id}`;
  const prog = p.programmes[0];
  const where = `${short(p)} · ${KIND_LABEL[p.kind]}`;
  const out: Note[] = [];
  const add = (key: string, n: number | null | undefined, tone: Tone, one: string, many: string, href: string, group: Note["group"]) => {
    if (n) out.push({ id: `${p.organisation_id}:${key}:${n}`, tone, title: `${n} ${n === 1 ? one : many}`, meta: where, href, group });
  };
  add("doses", p.doses_due, "flame", "dose due today or overdue", "doses due today or overdue", w, "now");
  add("notices", p.notices_new, "flame", "notice from the public", "notices from the public", w, "now");
  add("overdue", p.handoffs_overdue, "flame", "request from a partner is overdue", "requests from partners are overdue", oversees(p.kind) && prog ? `/programme/${prog.slug}/work` : w, "now");
  const fresh = p.handoffs_open - p.handoffs_overdue;
  add("requests", fresh > 0 ? fresh : 0, "blue", "open request from a partner", "open requests from partners", oversees(p.kind) && prog ? `/programme/${prog.slug}/work` : p.kind === "ngo" ? w : w, "today");
  add("samples", p.samples_waiting, "blue", "sample waiting in the laboratory", "samples waiting in the laboratory", w, "today");
  add("services", p.services_stale, "amber", "service confirmation has lapsed", "service confirmations have lapsed", `${w}/services`, "today");
  return out;
}

/* Urgent alerts of one kind in one area are one line (two positive results in HSR Layout: "(2)");
   everything else of one kind is one line naming the places, as the programme overview groups them. */
const MANY: Record<string, (n: number) => string> = {
  doses_overdue: (n) => `Doses past the date set at ${n} facilities`,
  coverage_below_target: (n) => `Dog vaccination below target in ${n} areas`,
  followups_overdue: (n) => `Follow-ups overdue at ${n} partners`,
  courses_completed: (n) => `Courses completed at ${n} facilities`,
  pep_readiness: (n) => `Vaccine or immunoglobulin not confirmed at ${n} facilities`,
  revaccination_due: (n) => `Dogs due for revaccination with ${n} partners`,
  samples_waiting: (n) => `${n} samples waiting at the laboratory`,
};
const placeOf = (a: Alert) => a.area ?? a.title.split(":")[0];
function alertNotes(alerts: (Alert & { programme: { id: string; slug: string; name: string } })[]): Note[] {
  const groups = new Map<string, (typeof alerts)[number][]>();
  for (const a of alerts) { const k = a.severity === "urgent" ? `${a.programme.id}|${a.kind}|${a.area ?? ""}|${a.title}` : `${a.programme.id}|${a.kind}`; groups.set(k, [...(groups.get(k) ?? []), a]); }
  return [...groups.values()].map((g) => {
    const a = g[0];
    const tone: Tone = a.severity === "urgent" ? "flame" : a.severity === "attention" ? "amber" : a.kind === "courses_completed" ? "green" : "blue";
    const many = g.length > 1 && a.severity !== "urgent";
    return {
      id: `a:${g.map((x) => x.key).sort().join(",")}`, tone, title: many ? (MANY[a.kind]?.(g.length) ?? `${a.title} and ${g.length - 1} more`) : g.length > 1 ? `${a.title} (${g.length})` : a.title,
      meta: many ? [g.map(placeOf).slice(0, 3).join(", ") + (g.length > 3 ? ` and ${g.length - 3} more` : ""), a.programme.name].join(" · ") : [a.detail, a.programme.name].filter(Boolean).join(" · "), href: `/programme/${a.programme.slug}`,
      group: a.severity === "urgent" ? "now" : a.severity === "attention" ? "today" : "updates",
      alert: { programme: a.programme.id, key: a.key, n: g.length },
    } satisfies Note;
  });
}

export function useNotifications() {
  const { places, ready } = usePlaces();
  const progs = useMemo(() => [...new Map(places.filter((p) => oversees(p.kind)).flatMap((p) => p.programmes).map((x) => [x.id, x])).values()], [places]);
  const [alerts, setAlerts] = useState<(Alert & { programme: { id: string; slug: string; name: string } })[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!progs.length) { setAlerts([]); return; }
    let live = true;
    void Promise.all(progs.map((x) => call<Alert[]>("oh_alerts", { p_programme: x.id }).then((r) => (r.data ?? []).filter((a) => !a.ack).map((a) => ({ ...a, programme: x })))))
      .then((all) => { if (live) setAlerts(all.flat()); });
    return () => { live = false; };
  }, [progs, tick]);
  const notes = useMemo(() => [...alertNotes(alerts), ...places.flatMap(placeNotes)], [alerts, places]);
  return { notes, ready, any: places.length > 0, reload: useCallback(() => setTick((t) => t + 1), []), facility: places.some((p) => p.kind === "hospital" || p.kind === "clinic") };
}

const GROUPS: [Note["group"], string][] = [["now", "Needs you now"], ["today", "Today"], ["updates", "Updates"]];

export function NotificationsButton() {
  const { notes, ready, any, reload, facility } = useNotifications();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { setSeen(readSeen()); }, []);
  const shown = notes.filter((n) => !gone.has(n.id));
  const fresh = shown.filter((n) => !seen.has(n.id)).length;
  const shownRef = useRef(shown); shownRef.current = shown;

  /* Opening shows what is new, then counts it as seen. */
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => { const s = new Set([...readSeen(), ...shownRef.current.map((n) => n.id)]); writeSeen(s); setSeen(s); }, 1200);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const out = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key); document.addEventListener("pointerdown", out);
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("a, button")?.focus());
    return () => { window.clearTimeout(t); document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", out); };
  }, [open]);

  const ack = async (n: Note) => {
    if (!n.alert) return;
    setBusy(n.id);
    const keys = n.id.slice(2).split(",");
    const results = await Promise.all(keys.map((k) => call("oh_ack_alert", { p_programme: n.alert!.programme, p_key: k, p_note: null })));
    setBusy(null);
    if (!results.some((r) => r.error)) { setGone((g) => new Set(g).add(n.id)); reload(); }
  };

  if (!ready || !any) return null;
  return (
    <div className="sp-bell">
      <button ref={btn} type="button" className={`sp-bell-btn${open ? " is-on" : ""}`} aria-expanded={open} aria-controls="sp-bell-panel" aria-label={fresh ? `Notifications, ${fresh} new` : "Notifications"} onClick={() => { const r = btn.current?.getBoundingClientRect(); if (r) setAt({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right - 8) }); setOpen((v) => !v); }}>
        <Bell size={16} aria-hidden />
        {fresh ? <b className="sp-bell-badge" aria-hidden>{fresh > 9 ? "9+" : fresh}</b> : null}
      </button>
      {open ? (
        <div ref={panel} id="sp-bell-panel" className="sp-bell-panel" role="dialog" aria-label="Notifications" style={at ? { top: at.top, right: at.right } : undefined}>
          <div className="sp-bell-head"><b>Notifications</b><button type="button" className="sp-bell-x" aria-label="Close notifications" onClick={() => { setOpen(false); btn.current?.focus(); }}><X size={15} aria-hidden /></button></div>
          {!shown.length ? (
            <div className="sp-bell-empty"><span aria-hidden><Check size={16} /></span><b>Nothing needs you right now</b><small>Doses due, requests, results and alerts from your places appear here.</small></div>
          ) : (
            <div className="sp-bell-body">
              {GROUPS.map(([g, label]) => {
                const rows = shown.filter((n) => n.group === g);
                if (!rows.length) return null;
                return (
                  <section key={g} className="sp-bell-sec" aria-label={label}>
                    <h3>{label}</h3>
                    <ul>
                      {rows.map((n, i) => (
                        <li key={n.id} className={seen.has(n.id) ? undefined : "is-new"} style={{ ["--i" as string]: i }}>
                          <Link href={n.href} onClick={() => setOpen(false)}>
                            <i className="sp-bell-dot" data-tone={n.tone} aria-hidden />
                            <span><b>{n.title}</b><small>{n.meta}</small></span>
                          </Link>
                          {n.alert ? <button type="button" className="sp-bell-ack" disabled={busy === n.id} onClick={() => void ack(n)}>{busy === n.id ? "Saving…" : "Seen"}</button> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
          {facility ? <p className="sp-bell-foot">Reminder and completion calls are made by the facility and logged on its Today. SMS and WhatsApp are not connected.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
