"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · the two lines of work, each on its own plain page.

   What organisations actually keep is two things: animals someone asked
   them to help (rescues and treatment), and sterilisation procedures they
   must prove to the municipality. Each gets one page. A page is a short
   list of steps in the order the work happens; under each step are the
   records waiting at it, in plain words, each opening its record. There
   are no boards, sub-tabs or counters to decode.

   The reads are the same ones the rest of the product uses (./pipeline).
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Btn, Head, Page, Tag } from "@/ws/kit";
import { useMembership } from "../shell/Shell";
import { NgoGate, useOrgOpen } from "./Gate";
import { usePipeline, type Card, type Column, type StageId } from "./pipeline";
import "./lines.k.css";

type Step = { id: StageId; title: string; says: string; none: string; all: string; href: string };
const TONE: Record<string, "flame" | "amber" | "green" | "blue" | "plain"> = { flame: "flame", amber: "amber", green: "green", blue: "blue", plain: "plain" };
const since = (d: number | null) => (d === null ? "" : d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`);

function Steps({ steps, cols, ready }: { steps: Step[]; cols: Column[]; ready: boolean }) {
  return (
    <ol className="ln">
      {steps.map((s, i) => {
        const col = cols.find((c) => c.id === s.id); const cards: Card[] = col?.cards ?? []; const n = cards.length;
        return (
          <li key={s.id} id={s.id} className="ln-step" data-stage={s.id}>
            <header className="ln-h">
              <span className="ln-n" aria-hidden>{i + 1}</span>
              <div><h2>{s.title}{ready && col?.state === "ready" ? <b>{n}</b> : null}</h2><p>{s.says}</p></div>
            </header>
            {!ready || col?.state === "loading" ? <div className="ln-list" aria-hidden><i className="ln-skel" /><i className="ln-skel" /></div>
              : col?.state === "failed" ? <p className="ln-none is-err" role="alert">This list could not be read. Check the connection and reload.</p>
              : n === 0 ? <p className="ln-none">{s.none}</p>
              : <ul className="ln-list">
                {cards.slice(0, 6).map((k) => (
                  <li key={k.key}><Link href={k.href} className={`ln-row${k.hot ? " is-hot" : ""}`}>
                    <span className="ln-t"><b>{k.title}</b><small>{[k.meta, since(k.age), k.who ? `with ${k.who}` : ""].filter(Boolean).join(" · ")}</small></span>
                    {k.tag ? <Tag tone={TONE[k.tag.tone ?? "plain"] ?? "plain"}>{k.tag.label}</Tag> : null}
                    <ArrowRight size={16} aria-hidden />
                  </Link></li>
                ))}
                {n > 6 ? <li><Link href={s.href} className="ln-all">See all {n}<ArrowRight size={14} aria-hidden /></Link></li> : null}
              </ul>}
          </li>
        );
      })}
    </ol>
  );
}

/** The line drawn as it runs: each step a node with how many are waiting at it, joined left to right. A node takes you to its step. */
export function Flow({ steps, cols, ready, base = "", label }: { steps: Pick<Step, "id" | "title">[]; cols: Column[]; ready: boolean; base?: string; label: string }) {
  const counts = steps.map((s) => cols.find((c) => c.id === s.id)?.cards?.length ?? 0);
  const max = Math.max(1, ...counts);
  return (
    <nav className="fl" aria-label={label}>
      {steps.map((s, i) => (
        <Link key={s.id} href={`${base}#${s.id}`} className={`fl-node${counts[i] ? " has" : ""}`}>
          <span className="fl-bar" aria-hidden><i style={{ ["--v" as string]: ready ? counts[i] / max : 0 }} /></span>
          <b>{ready ? counts[i] : "–"}</b>
          <span>{s.title}</span>
        </Link>
      ))}
    </nav>
  );
}
export const RESCUE_STEPS: Pick<Step, "id" | "title">[] = [{ id: "new", title: "New" }, { id: "care", title: "In care" }];
export const ABC_STEPS: Pick<Step, "id" | "title">[] = [{ id: "vet", title: "Vet sign-off" }, { id: "evidence", title: "Evidence" }, { id: "report", title: "Ready to send" }];

const RESCUE: Step[] = [
  { id: "new", title: "New", says: "Read, then accept or pass on", none: "No new report is waiting.", all: "See all reports", href: "/ngo/inbox" },
  { id: "care", title: "In care", says: "Most urgent first", none: "No animal is in your care right now.", all: "See all open cases", href: "/ngo/work" },
];
const ABC: Step[] = [
  { id: "vet", title: "Vet sign-off", says: "Needs a veterinarian's signature", none: "Nothing is waiting for the vet.", all: "See all", href: "/ngo/verification?stage=vet" },
  { id: "evidence", title: "Evidence", says: "Release photo or place", none: "Every record has what it needs.", all: "See all", href: "/ngo/verification?stage=evidence" },
  { id: "report", title: "Ready to send", says: "Goes into this month's report", none: "Nothing is waiting to be sent.", all: "See all", href: "/ngo/verification?stage=review" },
];

export function Rescues() {
  const mem = useMembership(); const open = useOrgOpen();
  const { cols, ready } = usePipeline(open, mem.role);
  return (
    <NgoGate title="Rescues" lede="Animals someone asked you to help, from the first report until the case is closed.">
      <Page>
        <Head title="Rescues" />
        <Flow steps={RESCUE} cols={cols} ready={ready} label="Rescues, step by step" />
        <Steps steps={RESCUE} cols={cols} ready={ready} />
      </Page>
    </NgoGate>
  );
}

export function Sterilisation() {
  const mem = useMembership(); const open = useOrgOpen();
  const { cols, ready } = usePipeline(open, mem.role);
  const lead = mem.role === "admin" || mem.role === "coordinator";
  return (
    <NgoGate title="Sterilisation" lede="Each procedure, from the operation to the report the municipality accepts.">
      <Page>
        <Head title="Sterilisation" actions={lead ? <Btn href="/ngo/packages">Monthly report</Btn> : undefined} />
        <Flow steps={ABC} cols={cols} ready={ready} label="Sterilisation, step by step" />
        <Steps steps={ABC} cols={cols} ready={ready} />
      </Page>
    </NgoGate>
  );
}
