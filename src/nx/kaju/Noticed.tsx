"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarClock, ClipboardCheck, Hand, ListChecks, Loader2, UserRound, Zap } from "lucide-react";
import { LEVEL_WORD, TOOLS, type Level, type ToolName } from "@/lib/kaju/registry";
import { GROUPS, levelOf } from "@/lib/kaju/capabilities";
import { Chip, Sample } from "../ui";
import type { CapItem, Notice } from "./work";
import { toolLevels } from "./work";
import { DEMO_SITE } from "@/lib/demo-site";

/* Kaju's home, under the request: what Kaju noticed, from real sources only, as a strip of three cards with the rest
   one click away (it never grows into a column); and what Kaju can use here, as one line that opens to the detail.
   Signed out, both are labelled sample and drawn from the first paint, so nothing moves when the page settles. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const CAP = 3;
const ICON: Record<Notice["icon"], React.ReactNode> = {
  approval: <Hand size={16} />, person: <UserRound size={16} />, blocked: <AlertTriangle size={16} />, deadline: <CalendarClock size={16} />,
  tasks: <ListChecks size={16} />, automation: <Zap size={16} />, due: <CalendarClock size={16} />, check: <ClipboardCheck size={16} />,
};

export const SAMPLE_NOTICES: Notice[] = [
  { id: "s1", tone: "warn", icon: "approval", title: "Waiting for your approval: Create a follow-up task for each", detail: "Prepare follow-ups in Ward 12 due next week. It creates 6 tasks at once, so you approve it first.", source: "Kaju's work", action: { kind: "link", label: "Review", href: "/try" } },
  { id: "s2", tone: "accent", icon: "due", title: "4 open cases are due a follow-up this week with no task yet", detail: "Kaju can find them, create a task for each once you approve, and skip any that already have one.", source: "Your cases", action: { kind: "link", label: "Prepare follow-ups due this week", href: "/try" } },
  { id: "s3", tone: "warn", icon: "check", title: "5 ABC records are missing evidence", detail: "Records missing one or more of the five required evidence kinds.", source: "Kaju's daily checks", action: { kind: "link", label: "See the checks", href: "/kaju/insights" } },
];

export function Noticed({ items, sample, busy, onAct }: { items: Notice[] | null; sample?: boolean; busy?: string | null; onAct: (n: Notice) => void }) {
  const [all, setAll] = useState(false);
  const calm = useReducedMotion();
  const list = sample ? SAMPLE_NOTICES : items;
  const shown = all ? list ?? [] : (list ?? []).slice(0, CAP);
  const more = (list?.length ?? 0) - CAP;
  return (
    <section className="kj-noticed" aria-labelledby="kj-n">
      <div className="kj-noticed-h">
        <h2 id="kj-n">Kaju noticed</h2>{list && list.length ? <span className="kj-count">{list.length}</span> : null}{sample ? <Sample /> : null}
        {more > 0 ? <button type="button" className="kj-link kj-noticed-more" aria-expanded={all} aria-controls="kj-n-list" onClick={() => setAll((a) => !a)}>{all ? "Show fewer" : `${more} more`}</button> : null}
      </div>
      {list === null ? <div className="kj-noticed-l" aria-label="Reading">{[0, 1, 2].map((i) => <div key={i} className="kj-skel kj-notice-skel" />)}</div> : !list.length ? (
        <p className="kj-noticed-none">Nothing needs you right now. Kaju watches overdue tasks, automations, open cases and its daily checks, and lists here what needs a person. Its own work that waits for you is listed under Kaju&apos;s work.</p>
      ) : (
        <ul className={`kj-noticed-l ${all ? "is-all" : ""}`} id="kj-n-list">{shown.map((n, i) => (
          <motion.li key={n.id} className={`kj-notice t-${n.tone}`} initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, ease: EASE, delay: calm ? 0 : Math.min(i, 6) * .045 }}>
            <span className="kj-notice-i" aria-hidden>{ICON[n.icon]}</span>
            <div className="kj-notice-b">
              <b>{n.title}</b>
              {n.detail ? <p>{n.detail}</p> : null}
              <small>{n.source}</small>
              <div className="kj-notice-a">
                {n.action.kind === "link" ? <Link href={n.action.href} className="kj-act">{n.action.label}<ArrowRight size={14} /></Link>
                  : <button type="button" className="kj-act is-plan" disabled={!!busy} onClick={() => onAct(n)}>{busy === n.id ? <Loader2 size={14} className="nx-spin" /> : null}{n.action.label}<ArrowRight size={14} /></button>}
              </div>
            </div>
          </motion.li>))}</ul>
      )}
    </section>
  );
}

const SAMPLE_CAPS: CapItem[] = [
  { id: "records", name: "Your organisation's records", state: "live", label: "Live", detail: "Reads only what you can open yourself." },
  { id: "missions", name: "Work in several steps: tasks and channels", state: "live", label: "Live", detail: "Steps run as you, and keep going when the page is closed." },
  { id: "model", name: "Planning from your own words", state: "setup", label: "Needs setup by the owner", detail: "Until a model is connected, Kaju plans from its fixed jobs." },
  { id: "mission_email", name: "Email from Kaju", state: "setup", label: "Needs setup by the owner", detail: "Kaju prepares the email; sending needs a connected account." },
  { id: "whatsapp", name: "WhatsApp", state: "none", label: "Not connected", detail: "Nothing is sent on WhatsApp." },
];
const CAP_TONE: Record<CapItem["state"], "ok" | "warn" | "plain" | "accent"> = { live: "ok", setup: "warn", you: "accent", none: "plain", unknown: "plain" };
const CAP_WORD: Record<CapItem["state"], string> = { live: "live", setup: "need setup", you: "need you to connect", none: "not connected", unknown: "not checked" };
const CAP_ORDER: CapItem["state"][] = ["live", "setup", "you", "none", "unknown"];

/** What Kaju can use here, as one line ("2 live · 2 need setup · 1 not connected") that opens to the list. */
export function Capabilities({ items, failed, orgId }: { items: CapItem[] | null; failed?: boolean; orgId: string | null }) {
  const sample = !orgId;
  /* The demonstration site shows Kaju as it runs in a connected organisation: what is live, WhatsApp included. */
  const list = sample ? SAMPLE_CAPS : items && DEMO_SITE ? [...items.filter((c) => c.state === "live" || c.state === "you"), { id: "whatsapp", name: "WhatsApp", state: "live" as const, label: "Live", detail: "Reports from residents and field teams arrive in the Inbox." }] : items;
  const [levels, setLevels] = useState<Record<string, number> | null>(null);
  const [opened, setOpened] = useState(false);
  const counts = CAP_ORDER.map((s) => [s, (list ?? []).filter((c) => c.state === s).length] as const).filter(([, n]) => n > 0);
  return (
    <details className="kj-capsum">
      <summary>
        <span className="kj-capsum-t">What Kaju can use</span>
        {failed && !list ? <span className="kj-capsum-s">Could not be checked just now</span> : !list ? <span className="kj-capsum-s">Checking…</span>
          : <span className="kj-capsum-s">{counts.map(([s, n], i) => <span key={s} className={`c-${s}`}>{i ? " · " : ""}<b>{n}</b> {CAP_WORD[s]}</span>)}</span>}
        {sample ? <Sample /> : null}
      </summary>
      <div className="kj-capsum-b">
        {list ? <ul className="kj-caps">{list.map((c) => <li key={c.id} className={`c-${c.state}`}><div><b>{c.name}</b><small>{c.detail}</small></div><Chip tone={CAP_TONE[c.state]}>{c.label}</Chip></li>)}</ul> : null}
        <details className="kj-limits" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open && !opened) { setOpened(true); if (orgId) void toolLevels(orgId).then(setLevels); } }}>
          <summary>What Kaju may do here</summary>
          <ul>{GROUPS.map((g) => (
            <li key={g.id}><b>{g.name}</b><small>{g.line}</small>
              <span className="kj-limits-t">{g.tools.map((t) => { const l = orgId ? (levels ? levelOf(t as ToolName, levels) : null) : TOOLS[t].level; return <span key={t}>{TOOLS[t].label}<em>{l === null ? "…" : LEVEL_WORD[l as Level | 9]}</em></span>; })}</span>
            </li>))}</ul>
          {orgId ? <Link href="/kaju/rules" className="kj-link">Your organisation&apos;s rules and memory<ArrowRight size={14} /></Link> : null}
        </details>
      </div>
    </details>
  );
}
