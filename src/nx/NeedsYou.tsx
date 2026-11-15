"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import { packages } from "@/lib/abc";
import { getSupabase } from "@/lib/supabase";
import { useLive } from "./live";
import { appPath, useNotices } from "./collab";

/* The bell. Not a feed of everything that happened: a short list of what is waiting on this person, read live
   from records they can already open. Nothing is stored or sent; nothing is marked read here. */

type Item = { id: string; kind: "kaju" | "task" | "review"; title: string; detail: string; href: string; tone: "warn" | "bad" | "accent" };
const SAMPLE: Item[] = [
  { id: "s1", kind: "kaju", title: "Prepare the weekly ABC submission", detail: "Kaju is waiting for your approval", href: "/kaju", tone: "warn" },
  { id: "s2", kind: "task", title: "Injured street dog near the flower market", detail: "Needs assignment · due today", href: "/ngo/today", tone: "bad" },
];

function useNeeds(): Item[] | null {
  const live = useLive();
  const ngo = live.orgFor("ngo"), gov = live.orgFor("government");
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    if (!live.ready) return;
    if (!live.org) { setItems(SAMPLE); return; }
    const db = getSupabase(); if (!db) { setItems([]); return; }
    let alive = true;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const out: Item[] = [];
      if (ngo) {
        const [m, t] = await Promise.all([
          db.from("nx_missions").select("id,title").eq("org_id", ngo.org_id).eq("state", "waiting_person").limit(10),
          db.from("nx_tasks").select("id,title,due_on").eq("org_id", ngo.org_id).eq("state", "open").not("due_on", "is", null).lte("due_on", today).order("due_on").limit(10),
        ]);
        for (const x of (m.data ?? []) as { id: string; title: string }[]) out.push({ id: `m${x.id}`, kind: "kaju", title: x.title, detail: "Kaju is waiting for your approval", href: "/kaju", tone: "warn" });
        for (const x of (t.data ?? []) as { id: string; title: string; due_on: string }[]) out.push({ id: `t${x.id}`, kind: "task", title: x.title, detail: x.due_on < today ? `Overdue since ${new Date(x.due_on).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Due today", href: "/ngo/today", tone: x.due_on < today ? "bad" : "accent" });
      }
      if (gov?.source === "review_office") {
        const ps = await packages().catch(() => []);
        const waiting = ps.filter((p) => p.office_id === gov.org_id && p.status === "submitted");
        if (waiting.length) out.push({ id: "review", kind: "review", title: `${waiting.length} ${waiting.length === 1 ? "package waits" : "packages wait"} for a decision`, detail: gov.name, href: "/gov/verification", tone: "warn" });
      }
      if (alive) setItems(out);
    })();
    return () => { alive = false; };
  }, [live.ready, live.org, ngo, gov]);
  return items;
}

export function NeedsYou() {
  const items = useNeeds();
  const live = useLive();
  const notes = useNotices(!!live.org);
  const unread = (notes.rows ?? []).filter((x) => !x.read_at);
  const [open, setOpen] = useState(false);
  const calm = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const n = (items?.length ?? 0) + unread.length;
  const icon = (k: Item["kind"]) => (k === "kaju" ? <Sparkles size={13} /> : k === "review" ? <ShieldCheck size={13} /> : <CalendarClock size={13} />);
  return (
    <div className="nx-needs" ref={wrap}>
      <button type="button" className={`nx-ib ${n ? "has-n" : ""}`} aria-label={n ? `${n} ${n === 1 ? "thing needs" : "things need"} you` : "Nothing needs you"} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)} data-n={n || undefined}><Bell size={16} /></button>
      <AnimatePresence>
        {open ? (
          <motion.div role="dialog" aria-label="Needs you" className="nx-needs-p" initial={calm ? false : { opacity: 0, y: -6, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={calm ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={{ type: "spring", stiffness: 520, damping: 40, mass: .7 }}>
            <p className="nx-needs-h">Needs you <span className="nx-count">{items === null ? "" : n}</span></p>
            {items === null ? <p className="nx-needs-e">Reading…</p> : !n ? <p className="nx-needs-e">Nothing is waiting on you.</p> : (
              <ul>{items.map((i) => <li key={i.id}><Link href={i.href} onClick={() => setOpen(false)}><span className={`nx-needs-i t-${i.tone}`}>{icon(i.kind)}</span><span><b>{i.title}</b><small>{i.detail}</small></span></Link></li>)}</ul>
            )}
            {live.org ? <>
              <p className="nx-needs-h">Notifications {unread.length ? <><span className="nx-count">{unread.length}</span><button type="button" className="nx-thread" style={{ marginLeft: "auto" }} onClick={() => void notes.markRead(null)}>Mark all read</button></> : null}</p>
              {notes.rows === null ? <p className="nx-needs-e">Reading…</p> : !notes.rows.length ? <p className="nx-needs-e">No notifications yet. Mentions, approvals and shared work appear here.</p> : (
                <ul>{notes.rows.slice(0, 12).map((x) => { const href = appPath(x.href); const body = <><span className={`nx-needs-i t-${x.kind === "approval" ? "warn" : x.kind === "mention" ? "accent" : "accent"}`}>{x.kind === "approval" ? <ShieldCheck size={13} /> : <Bell size={13} />}</span><span><b style={{ fontWeight: x.read_at ? 500 : 650 }}>{x.title}</b><small>{x.body ? `${x.body} · ` : ""}{new Date(x.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small></span></>;
                  return <li key={x.id}>{href ? <Link href={href} onClick={() => { setOpen(false); void notes.markRead([x.id]); }}>{body}</Link> : <button type="button" className="nx-needs-btn" onClick={() => void notes.markRead([x.id])}>{body}</button>}</li>; })}</ul>
              )}
              <p className="nx-needs-f"><Link href="/settings/notifications" onClick={() => setOpen(false)}>Notification settings</Link> · Email and push only if you turn them on.</p>
            </> : <p className="nx-needs-f">Read live from records you can open. Kaju missions, tasks due, and decisions waiting.</p>}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
