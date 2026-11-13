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
import { ArrowRight, Upload } from "lucide-react";
import { Board, Btn, Card, Column, Head, Page, Tag } from "@/ws/kit";
import { useMembership } from "../shell/Shell";
import { NgoGate, useOrgOpen } from "./Gate";
import { STAGES, usePipeline, type StageId } from "./pipeline";
import "./pipeline.css";

const TONE: Record<string, "flame" | "amber" | "green" | "blue" | "violet" | "plain"> = { flame: "flame", amber: "amber", green: "green", blue: "blue", violet: "violet" };
/* At most four cards per stage; the rest are one click away ("All 9"), so no column runs long. */
const SHOW = 4;
const ago = (d: number | null) => (d === null ? "" : d === 0 ? "today" : `${d}d`);

export function Pipeline() {
  const mem = useMembership();
  const open = useOrgOpen();
  const { cols, ready, total, hot } = usePipeline(open, mem.role);
  const lead = mem.role === "admin" || mem.role === "coordinator";

  /* The stage a click pointed at (Today's strip, a record's rail). */
  const [focus, setFocus] = useState<StageId | null>(null);
  const board = useRef<HTMLDivElement>(null);
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
    const scroller = board.current.querySelector<HTMLElement>(".k-board");
    if (el && scroller && el !== scroller.firstElementChild) scroller.scrollTo({ left: el.offsetLeft - scroller.offsetLeft, behavior: "auto" });
  }, [focus, ready, cols]);

  /* One page: the sentence says how much is in the line and what is urgent; the board is the line, a column a stage.
     A card opens its record over the board; a column's footer opens that stage's own view. */
  return (
    <NgoGate title="Cases" lede="Every record your team is working on, from the first report to the report you send.">
      <Page width="wide">
        <Head title="Cases"
          sum={!ready ? "Reading the line of work…" : total === 0 ? "Nothing is in the line right now." : <><b>{total}</b> {total === 1 ? "record" : "records"} in the line{hot ? <>, <span className="is-hot">{hot} need{hot === 1 ? "s" : ""} attention first</span></> : null}.</>}
          actions={lead ? <Btn href="/ngo/import" icon={<Upload size={14} />}>Import a register</Btn> : undefined} />
        <div ref={board}>
          <Board label="The line of work, by stage">
            {cols.map((c) => {
              const n = c.cards?.length ?? 0, shown = (c.cards ?? []).slice(0, SHOW);
              return (
                <div key={c.id} data-stage={c.id} className={focus === c.id ? "pl2-focus" : undefined}>
                  <Column title={c.title} count={c.state === "ready" ? n : null} note={c.hint} mine={c.mine}
                    footer={c.state === "ready" ? <Link href={c.href} className="pl2-all">{n > SHOW ? `All ${n}` : c.all}<ArrowRight size={13} aria-hidden /></Link> : undefined}>
                    {c.state === "loading" ? <><i className="pl2-skel" /><i className="pl2-skel" /></>
                      : c.state === "failed" ? <p className="pl2-none is-err" role="alert">Could not be read. Check the connection and reload.</p>
                      : n === 0 ? <p className="pl2-none">{c.empty}</p>
                      : shown.map((k) => (
                        <Card key={k.key} href={k.href} hot={k.hot} title={k.title} meta={k.meta}
                          code={<span className="pl2-top"><span>{k.code}</span>{k.age !== null ? <span>{ago(k.age)}</span> : null}</span>}
                          end={k.tag || k.who ? <>{k.tag ? <Tag tone={TONE[k.tag.tone ?? ""] ?? "plain"}>{k.tag.label}</Tag> : <span />}{k.who ? <span className="pl2-who" title={`Assigned to ${k.who}`}>{k.who.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span> : null}</> : undefined} />
                      ))}
                  </Column>
                </div>
              );
            })}
          </Board>
        </div>
      </Page>
    </NgoGate>
  );
}
