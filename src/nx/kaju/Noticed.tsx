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

/* Two quiet panels for Kaju's home. What Kaju noticed, from real sources only, each with the next step it can prepare;
   and what Kaju can use here, saying plainly what works now and what waits for the owner's setup. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const ICON: Record<Notice["icon"], React.ReactNode> = {
  approval: <Hand size={14} />, person: <UserRound size={14} />, blocked: <AlertTriangle size={14} />, deadline: <CalendarClock size={14} />,
  tasks: <ListChecks size={14} />, automation: <Zap size={14} />, due: <CalendarClock size={14} />, check: <ClipboardCheck size={14} />,
};

export const SAMPLE_NOTICES: Notice[] = [
  { id: "s1", tone: "warn", icon: "approval", title: "Waiting for your approval: Create a follow-up task for each", detail: "Prepare follow-ups in Ward 12 due next week. It creates 6 tasks at once, so you approve it first.", source: "Your missions", action: { kind: "link", label: "Review", href: "/kaju/approvals" } },
  { id: "s2", tone: "accent", icon: "due", title: "4 open cases are due a follow-up this week with no task yet", detail: "Kaju can find them, create a task for each once you approve, and skip any that already have one.", source: "Your cases", action: { kind: "link", label: "Prepare follow-ups due this week", href: "/try" } },
  { id: "s3", tone: "warn", icon: "check", title: "5 ABC records are missing evidence", detail: "Records missing one or more of the five required evidence kinds.", source: "Kaju's daily checks", action: { kind: "link", label: "See the checks", href: "/kaju/insights" } },
];

export function Noticed({ items, sample, busy, onAct }: { items: Notice[] | null; sample?: boolean; busy?: string | null; onAct: (n: Notice) => void }) {
  const [all, setAll] = useState(false);
  const calm = useReducedMotion();
  const list = sample ? SAMPLE_NOTICES : items;
  const shown = all ? list ?? [] : (list ?? []).slice(0, 5);
  return (
    <section className="kj-panel" aria-labelledby="kj-n">
      <div className="kj-panel-h"><h2 id="kj-n">Kaju noticed</h2>{list && list.length ? <span className="kj-count">{list.length}</span> : null}{sample ? <Sample /> : null}</div>
      {list === null ? <div className="kj-skel" aria-label="Reading" /> : !list.length ? (
        <p className="kj-quiet">Nothing needs you right now. Kaju watches your missions, overdue tasks, automations and its daily checks, and lists here what needs a person.</p>
      ) : (
        <ul className="kj-notices">{shown.map((n, i) => (
          <motion.li key={n.id} className={`kj-notice t-${n.tone}`} initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, ease: EASE, delay: calm ? 0 : Math.min(i, 6) * .045 }}>
            <span className="kj-notice-i" aria-hidden>{ICON[n.icon]}</span>
            <div className="kj-notice-b">
              <b>{n.title}</b>
              {n.detail ? <p>{n.detail}</p> : null}
              <small>{n.source}</small>
              <div className="kj-notice-a">
                {n.action.kind === "link" ? <Link href={n.action.href} className="kj-act">{n.action.label}<ArrowRight size={13} /></Link>
                  : <button type="button" className="kj-act is-plan" disabled={!!busy} onClick={() => onAct(n)}>{busy === n.id ? <Loader2 size={13} className="nx-spin" /> : null}{n.action.label}<ArrowRight size={13} /></button>}
              </div>
            </div>
          </motion.li>))}</ul>
      )}
      {list && list.length > 5 ? <button type="button" className="kj-link" onClick={() => setAll((a) => !a)}>{all ? "Show fewer" : `Show all ${list.length}`}</button> : null}
    </section>
  );
}

const SAMPLE_CAPS: CapItem[] = [
  { id: "records", name: "Your organisation's records", state: "live", label: "Live", detail: "Reads only what you can open yourself." },
  { id: "missions", name: "Missions, tasks and channels", state: "live", label: "Live", detail: "Steps run as you, and keep going when the page is closed." },
  { id: "model", name: "Planning from your own words", state: "setup", label: "Needs setup by the owner", detail: "Until a model is connected, Kaju plans from its fixed jobs." },
  { id: "mission_email", name: "Email from missions", state: "setup", label: "Needs setup by the owner", detail: "Kaju prepares the email; sending needs a connected account." },
  { id: "whatsapp", name: "WhatsApp", state: "none", label: "Not connected", detail: "Nothing is sent on WhatsApp." },
];
const CAP_TONE: Record<CapItem["state"], "ok" | "warn" | "plain" | "accent"> = { live: "ok", setup: "warn", you: "accent", none: "plain", unknown: "plain" };

export function Capabilities({ items, failed, orgId }: { items: CapItem[] | null; failed?: boolean; orgId: string | null }) {
  const sample = !orgId;
  const list = sample ? SAMPLE_CAPS : items;
  const [levels, setLevels] = useState<Record<string, number> | null>(null);
  const [opened, setOpened] = useState(false);
  return (
    <section className="kj-panel" aria-labelledby="kj-c">
      <div className="kj-panel-h"><h2 id="kj-c">What Kaju can use</h2>{sample ? <Sample /> : null}</div>
      {failed && !list ? <p className="kj-quiet">What is connected could not be checked just now.</p> : !list ? <div className="kj-skel" aria-label="Reading" /> : (
        <ul className="kj-caps">{list.map((c) => <li key={c.id} className={`c-${c.state}`}><div><b>{c.name}</b><small>{c.detail}</small></div><Chip tone={CAP_TONE[c.state]}>{c.label}</Chip></li>)}</ul>
      )}
      <details className="kj-limits" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open && !opened) { setOpened(true); if (orgId) void toolLevels(orgId).then(setLevels); } }}>
        <summary>What Kaju may do here</summary>
        <ul>{GROUPS.map((g) => (
          <li key={g.id}><b>{g.name}</b><small>{g.line}</small>
            <span className="kj-limits-t">{g.tools.map((t) => { const l = orgId ? (levels ? levelOf(t as ToolName, levels) : null) : TOOLS[t].level; return <span key={t}>{TOOLS[t].label}<em>{l === null ? "…" : LEVEL_WORD[l as Level | 9]}</em></span>; })}</span>
          </li>))}</ul>
        {orgId ? <Link href="/kaju/rules" className="kj-link">Your organisation&apos;s rules and memory<ArrowRight size={13} /></Link> : null}
      </details>
    </section>
  );
}
