"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Pipeline.

   One board for the whole line of work, left to right: a report arrives,
   a case is in care, the vet signs the procedure, the release evidence is
   completed, the record is reviewed and goes to the report. Every card is
   one record and opens it; every column opens its full working view
   (Queue, Intake, Sign-off & evidence), which are views of this page.

   The stages, their names and their reads live in ./pipeline.ts and are
   shared with Today's strip and the rail on every record. Arriving with
   ?stage= (from Today, or from a record's rail) brings that column into
   view and marks it, so the click lands where it pointed.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, FileCheck2, HeartPulse, Inbox, Stethoscope, Upload } from "lucide-react";
import { useMembership } from "../shell/Shell";
import { NgoGate, useOrgOpen } from "./Gate";
import { STAGES, usePipeline, type StageId } from "./pipeline";
import "./pipeline.css";

const ICON: Record<StageId, typeof Inbox> = { new: Inbox, care: HeartPulse, vet: Stethoscope, evidence: Camera, report: FileCheck2 };
const SHOW = 6;
const ago = (d: number | null) => (d === null ? "" : d === 0 ? "today" : `${d}d`);

export function Pipeline() {
  const mem = useMembership();
  const open = useOrgOpen();
  const { cols, ready, total, hot } = usePipeline(open, mem.role);
  const lead = mem.role === "admin" || mem.role === "coordinator";

  /* The stage a click pointed at (Today's strip, a record's rail). */
  const [focus, setFocus] = useState<StageId | null>(null);
  const board = useRef<HTMLOListElement>(null);
  useEffect(() => { const s = new URLSearchParams(window.location.search).get("stage"); setFocus(STAGES.some((x) => x.id === s) ? (s as StageId) : null); }, []);
  useEffect(() => {
    if (!focus || !ready) return;
    const el = board.current?.querySelector<HTMLElement>(`[data-stage="${focus}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [focus, ready]);
  /* On a phone the board shows one stage at a time: open it on the first stage that has work, not on an empty one. */
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || focus || !ready || !board.current || window.innerWidth > 860) return;
    opened.current = true;
    const first = cols.find((c) => (c.cards?.length ?? 0) > 0);
    const el = first ? board.current.querySelector<HTMLElement>(`[data-stage="${first.id}"]`) : null;
    if (el && el !== board.current.firstElementChild) board.current.scrollTo({ left: el.offsetLeft - board.current.offsetLeft - 16, behavior: "auto" });
  }, [focus, ready, cols]);

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

        <ol ref={board} className="pl-board" aria-label="The line of work, by stage">
          {cols.map((c, i) => {
            const Icon = ICON[c.id], n = c.cards?.length ?? 0, shown = (c.cards ?? []).slice(0, SHOW);
            return (
              <li key={c.id} className={`pl-col${c.mine ? " is-mine" : ""}${focus === c.id ? " is-focus" : ""}`} data-stage={c.id} style={{ ["--i" as string]: i }} aria-current={focus === c.id ? "true" : undefined}>
                <header className="pl-col-head">
                  <span className="pl-ic" aria-hidden><Icon size={15} /></span>
                  <h2>{c.title}</h2>
                  <span className={`pl-n${n > 0 ? " is-on" : ""}`} aria-label={c.state === "loading" ? "loading" : c.state === "failed" ? "not read" : `${n} records`}>{c.state === "loading" ? "…" : c.state === "failed" ? "–" : n}</span>
                  {c.mine ? <span className="pl-you">Your step</span> : null}
                  <p>{c.hint}</p>
                </header>
                <div className="pl-stack">
                  {c.state === "loading" ? <><i className="pl-skel" /><i className="pl-skel" /><i className="pl-skel" /></>
                    : c.state === "failed" ? <p className="pl-none is-err" role="alert">Could not be read. Check the connection and reload.</p>
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
                {c.state === "ready" ? <Link href={c.href} className="pl-all">{n > SHOW ? `All ${n}` : c.all}<ArrowRight size={13} aria-hidden /></Link> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </NgoGate>
  );
}
