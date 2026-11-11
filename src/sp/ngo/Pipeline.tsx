"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Pipeline.

   One board for the whole line of work, left to right: a report arrives,
   a case is in care, the vet signs the procedure, the release evidence is
   completed, the record is reviewed and goes to the report. Every card is
   one record and opens it; every column opens its full working view
   (Cases, Intake, Sign-off & evidence), which are views of this page.

   Nothing here is a new source of truth: reports come from the intake
   read, cases from the open-case read and the last three columns from the
   verification queue's own flags (stageOf). A read that fails says so; it
   never shows zero. Imported historical rows stay out of today's line.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Camera, FileCheck2, HeartPulse, Inbox, Stethoscope, Upload } from "lucide-react";
import { shortCode } from "@/lib/caseCode";
import { orgIncoming, type Incoming } from "@/lib/campaigns";
import { stageOf, verificationQueue, type QueueRow } from "@/lib/abc";
import { isHistoricalCase, isStale, openCases, type OpenCase } from "@/lib/ops";
import { DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import { useMembership } from "../shell/Shell";
import { NgoGate, useOrgOpen } from "./Gate";
import "./pipeline.css";

type Card = { key: string; href: string; code: string; title: string; meta: string; age: number | null; tag?: { label: string; tone: "flame" | "amber" | "blue" | "green" | "plain" }; who?: string | null; hot?: boolean };
type Col = { id: "new" | "care" | "vet" | "evidence" | "report"; title: string; hint: string; href: string; all: string; icon: typeof Inbox; cards: Card[] | null; mine: boolean; empty: string };

const SHOW = 6;
const days = (iso: string | null | undefined) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)) : null);
const ago = (d: number | null) => (d === null ? "" : d === 0 ? "today" : `${d}d`);
const critical = (c: { condition_class: string | null }) => DEFAULT_TRIAGE[(c.condition_class ?? "Not recorded") as Condition] === "Critical";
const MISSING: Record<string, string> = { surgery_record: "surgery record", ear_notch_photo: "ear-notch photo", release_photo: "release photo", release_location: "release place", capture_photo: "capture photo" };

function fromQueue(r: QueueRow): Card {
  const st = stageOf(r);
  const gap = r.missing.map((k) => MISSING[k] ?? k.replace(/_/g, " "));
  return {
    key: `q-${r.case_id}`, href: `/ngo/verification/${r.case_id}`, code: shortCode(r.case_code), title: r.title || "Procedure record",
    meta: st === "returned" ? (r.returned_note ?? "Returned for a correction") : st === "evidence" ? `Missing ${gap.slice(0, 2).join(", ") || "evidence"}${gap.length > 2 ? ` +${gap.length - 2}` : ""}` : st === "vet" ? (r.city ?? "Waiting for the vet") : st === "review" ? `Signed by ${r.vet_name ?? "the vet"}` : `Reviewed by ${r.reviewer_name ?? "a coordinator"}`,
    age: days(r.created_at),
    tag: st === "returned" ? { label: "Returned", tone: "flame" } : st === "evidence" ? { label: `${r.evidence_count} of 5`, tone: "amber" } : st === "vet" ? { label: "Sign-off", tone: "blue" } : st === "review" ? { label: "Review", tone: "blue" } : { label: "Approved", tone: "green" },
    hot: st === "returned",
  };
}

export function Pipeline() {
  const mem = useMembership();
  const open = useOrgOpen();
  const [incoming, setIncoming] = useState<Incoming[] | null | undefined>(undefined);
  const [cases, setCases] = useState<OpenCase[] | null | undefined>(undefined);
  const [queue, setQueue] = useState<QueueRow[] | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.allSettled([orgIncoming("ours"), orgIncoming("community")]).then(([a, b]) => { if (live) setIncoming(a.status === "fulfilled" && b.status === "fulfilled" ? [...a.value, ...b.value] : null); });
    openCases().then((r) => { if (live) setCases(r); }).catch(() => { if (live) setCases(null); });
    verificationQueue(500).then((r) => { if (live) setQueue(r.filter((x) => x.provenance !== "imported_historical_record")); }).catch(() => { if (live) setQueue(null); });
    return () => { live = false; };
  }, [open]);

  const role = mem.role;
  const lead = role === "admin" || role === "coordinator";
  const cols: Col[] = useMemo(() => {
    const now = Date.now();
    const inQueue = new Set((queue ?? []).map((r) => r.case_id));
    const care = cases === undefined ? undefined : cases === null ? null : cases.filter((c) => !isHistoricalCase(c) && !isStale(c, now) && !inQueue.has(c.id));
    const stage = (...s: string[]) => (queue === undefined ? undefined : queue === null ? null : queue.filter((r) => s.includes(stageOf(r))));
    const q = (rows: QueueRow[] | null | undefined) => (rows ? rows.map(fromQueue).sort((a, b) => Number(!!b.hot) - Number(!!a.hot) || (b.age ?? 0) - (a.age ?? 0)) : rows === null ? null : null);
    return [
      { id: "new", title: "New", hint: "Reports to prepare", href: "/ngo/inbox", all: "Open intake", icon: Inbox, mine: role === "member", empty: "No report is waiting.",
        cards: incoming === undefined ? null : incoming === null ? null : incoming.map((r) => ({ key: `i-${r.id}`, href: "/ngo/inbox", code: "Report", title: r.nickname || (r.mood_tags?.[0] ? r.mood_tags[0].replace(/_/g, " ") : "Animal reported"), meta: r.zone || "Place not given", age: days(r.created_at), tag: { label: "To prepare", tone: "plain" as const } })) },
      { id: "care", title: "In care", hint: "Open cases, most urgent first", href: "/ngo/work", all: "Open cases", icon: HeartPulse, mine: role === "member", empty: "No case is open.",
        cards: !care ? null : care.map((c) => ({ key: `c-${c.id}`, href: `/ngo/cases/${c.id}`, code: shortCode(c.case_code), title: c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Open case", meta: [c.animal_name, c.zone ?? c.city].filter(Boolean).join(" · ") || "Place not recorded", age: days(c.occurred_at), who: c.assignee_name, hot: critical(c),
          tag: critical(c) ? { label: "Critical", tone: "flame" as const } : (c.followups_missed ?? 0) > 0 ? { label: "Follow-up overdue", tone: "amber" as const } : c.status_class === "in_progress" ? { label: "In progress", tone: "blue" as const } : { label: "Open", tone: "plain" as const } }))
          .sort((a, b) => Number(!!b.hot) - Number(!!a.hot) || (b.age ?? 0) - (a.age ?? 0)) },
      { id: "vet", title: "With the vet", hint: "Procedures to sign off", href: "/ngo/verification?stage=vet", all: "Open sign-off", icon: Stethoscope, mine: role === "veterinarian", empty: "Nothing is waiting for the vet.", cards: q(stage("vet")) },
      { id: "evidence", title: "Evidence", hint: "Release photo or place missing", href: "/ngo/verification?stage=evidence", all: "Open evidence", icon: Camera, mine: role === "member", empty: "Every record has its evidence.", cards: q(stage("evidence", "returned")) },
      { id: "report", title: "To report", hint: "Review, then into the package", href: lead ? "/ngo/packages" : "/ngo/verification?stage=review", all: lead ? "Open reports" : "Open review", icon: FileCheck2, mine: lead, empty: "Nothing is waiting to be reported.", cards: q(stage("review", "ready")) },
    ];
  }, [incoming, cases, queue, role, lead]);

  const failed = { new: incoming === null, care: cases === null, vet: queue === null, evidence: queue === null, report: queue === null } as const;
  const loading = { new: incoming === undefined, care: cases === undefined, vet: queue === undefined, evidence: queue === undefined, report: queue === undefined } as const;
  const total = cols.reduce((s, c) => s + (c.cards?.length ?? 0), 0);
  const hot = cols.reduce((s, c) => s + (c.cards?.filter((k) => k.hot).length ?? 0), 0);
  const ready = !Object.values(loading).some(Boolean);

  return (
    <NgoGate title="Pipeline" lede="Every record your team is working on, from the first report to the report you send.">
      <div className="pl">
        <header className="pl-head">
          <div>
            <h1 className="pl-title">Pipeline</h1>
            <p className="pl-sum" aria-live="polite">{!ready ? "Reading the line of work…" : total === 0 ? "Nothing is in the line right now." : <><b>{total}</b> {total === 1 ? "record" : "records"} in the line{hot ? <> · <b className="is-hot">{hot}</b> need{hot === 1 ? "s" : ""} attention first</> : null}</>}</p>
          </div>
          {lead ? <Link href="/ngo/import" className="btn is-s"><Upload size={14} aria-hidden />Import register</Link> : null}
        </header>

        <ol className="pl-board" aria-label="The line of work, by stage">
          {cols.map((c, i) => {
            const Icon = c.icon, n = c.cards?.length ?? 0, shown = (c.cards ?? []).slice(0, SHOW);
            return (
              <li key={c.id} className={`pl-col${c.mine ? " is-mine" : ""}`} data-stage={c.id} style={{ ["--i" as string]: i }}>
                <header className="pl-col-head">
                  <span className="pl-ic" aria-hidden><Icon size={15} /></span>
                  <h2>{c.title}</h2>
                  <span className={`pl-n${n > 0 ? " is-on" : ""}`} aria-label={loading[c.id] ? "loading" : failed[c.id] ? "not read" : `${n} records`}>{loading[c.id] ? "…" : failed[c.id] ? "–" : n}</span>
                  {c.mine ? <span className="pl-you">Your step</span> : null}
                  <p>{c.hint}</p>
                </header>
                <div className="pl-stack">
                  {loading[c.id] ? <><i className="pl-skel" /><i className="pl-skel" /><i className="pl-skel" /></>
                    : failed[c.id] ? <p className="pl-none is-err" role="alert">Could not be read. Check the connection and reload.</p>
                    : n === 0 ? <p className="pl-none">{c.empty}</p>
                    : shown.map((k, j) => (
                      <Link key={k.key} href={k.href} className={`pl-card${k.hot ? " is-hot" : ""}`} style={{ ["--j" as string]: j }}>
                        <span className="pl-card-top"><span className="pl-code">{k.code}</span>{k.age !== null ? <span className="pl-age">{ago(k.age)}</span> : null}</span>
                        <b>{k.title}</b>
                        <span className="pl-meta">{k.meta}</span>
                        <span className="pl-card-foot">{k.tag ? <span className="pl-tag" data-tone={k.tag.tone}>{k.tag.label}</span> : <span />}{k.who ? <span className="pl-who" title={`Assigned to ${k.who}`}>{k.who.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span> : null}</span>
                      </Link>
                    ))}
                </div>
                {!loading[c.id] && !failed[c.id] ? <Link href={c.href} className="pl-all">{n > SHOW ? `All ${n}` : c.all}<ArrowRight size={13} aria-hidden /></Link> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </NgoGate>
  );
}
