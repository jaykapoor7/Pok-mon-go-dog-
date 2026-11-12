"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · one case (decisions 021, 025, 033, 008C).

   Read top to bottom as the case happened: where it is in the line (the
   rail), what it is and who holds it (the head), the one next step the
   member's role allows, then the story so far (follow-ups, then every
   update and care event, newest first, with who recorded it), photos and
   care and movements. Beside it: the animal, what else is on the record,
   and the other cases on the same animal or in the same area.

   Read under the member's session; every action waits for the database's
   answer. Nothing here changes how a case is read or written.
   ════════════════════════════════════════════════════════════════════ */

import { shortCode } from "@/lib/caseCode";
import {OperationsPanel} from "./OperationsPanel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, CalendarClock, CalendarDays, ChevronDown, MapPin, Sparkles } from "lucide-react";
import { useAi } from "@/sp3/ai/AiPanel";
import { loadCaseFile, type CaseFile, type Neighbour } from "@/lib/case-file";
import { isHistoricalCase, isStale } from "@/lib/ops";
import { STATUS_META, type StatusClass } from "@/lib/register/taxonomy";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { State, day } from "../ui";
import { FollowupList, NextStep } from "./NextStep";
import { NgoGate } from "./Gate";
import "./ngo.css";
import "./record.css";
import { DeleteRecord } from "../ui/DeleteRecord";
import { careNote } from "@/lib/care-note";
import { StageRail } from "./StageRail";

const realName = (s: string | null | undefined) => { const t = (s ?? "").trim(); return t && !/·/.test(t) ? t : null; };

export function CasePage({ id }: { id: string }) {
  const mem = useMembership();
  const [file, setFile] = useState<CaseFile | null | "loading" | "error">("loading");
  const read = useCallback(async () => { try { setFile(await loadCaseFile(id)); } catch { setFile("error"); } }, [id]);
  useEffect(() => { if (mem.member) void read(); }, [mem.member, read]);

  return (
    <NgoGate title="Case file" lede="One case your organisation holds, with its history and its next step.">
      {file === "loading" ? <div className="kr" aria-busy="true"><i className="kr-skel is-head" /><div className="kr-grid"><i className="kr-skel" /><i className="kr-skel" /></div></div>
        : file === "error" ? <div className="ngo-page"><State kind="error" title="Didn't load" action={<button type="button" className="btn" onClick={() => void read()}>Try again</button>}>This case could not be read just now. Nothing was changed.</State></div>
        : !file ? <div className="ngo-page"><State kind="forbidden" title="Not available" action={<Link className="btn" href="/ngo">Back to Work</Link>}>This case belongs to another organisation.</State></div>
        : <Body file={file} onChanged={read} />}
    </NgoGate>
  );
}

const TONE: Record<string, string> = { open: "blue", in_progress: "amber", closed: "green", other_ngo: "plain", no_action: "plain", not_attended: "flame", unknown: "plain" };
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function Body({ file, onChanged }: { file: CaseFile; onChanged: () => Promise<void> }) {
  const router = useRouter();
  const { c, reg, animal, updates, medical, neighbours, sameAnimal, followups } = file;
  const imported = reg.provenance === "imported_historical_record";
  const facts = { ...c, occurred_at: reg.occurred_at, status_class: reg.status_class, provenance: reg.provenance, reviewed_at: reg.status_reviewed_at, last_activity_at: c.last_activity_at ?? c.updated_at } as never;
  const cohort = isHistoricalCase(facts) ? "history" : isStale(facts, Date.now()) ? "decide" : "live";
  const history = [
    ...updates.map((u) => ({ id: u.id, kind: "update" as const, at: u.created_at, k: u.type === "note" ? "note" : "update", t: u.note || (u.to_status ? `Status → ${u.to_status.replace(/_/g, " ")}` : u.type.replace(/_/g, " ")), who: u.actor_name })),
    ...medical.map((m) => ({ id: m.id, kind: "care" as const, at: m.event_date, k: "care", t: `${m.kind.replace(/_/g, " ")}${careNote(m.notes) ? `: ${careNote(m.notes)}` : ""}`, who: m.performed_by })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const title = reg.condition_class && reg.condition_class !== "Not recorded" ? reg.condition_class : c.title;
  const status = (reg.status_class ?? "unknown") as StatusClass;
  const photos = [c.before_url, ...(c.photos ?? []), c.after_url].filter(Boolean).slice(0, 8) as string[];
  const place = [c.zone, reg.city].filter(Boolean).join(", ");
  const more = [
    reg.hospital ? ["Clinic", reg.hospital] : null,
    reg.next_action ? ["Next action noted", reg.next_action] : null,
    reg.first_action_at ? ["First action", day(reg.first_action_at)] : null,
    c.informer_contact ? ["Informer", <>{c.informer_contact} <small>private to your organisation</small></>] : null,
    c.resolution ? ["Outcome", `${c.resolution.replace(/_/g, " ")}${c.outcome_note ? ` · ${c.outcome_note}` : ""}`] : null,
  ].filter(Boolean) as [string, ReactNode][];

  return (
    <article className="kr">
      {/* Where this case is in the line. A case that needs no procedure ends when it is closed. */}
      {cohort !== "history" && <div className="kr-rail"><StageRail stages={["new", "care"]} at="care" end="Closed" ended={!["open", "in_progress"].includes(reg.status_class ?? "open")} /></div>}

      <header className="kr-head">
        <div className="kr-id">
          <span className="kr-code" title={reg.case_code ?? undefined}>{shortCode(reg.case_code)}</span>
          <span className="kr-chip" data-tone={TONE[status] ?? "plain"}><i aria-hidden />{STATUS_META[status]?.label ?? "Status not recorded"}</span>
          {imported ? <span className="kr-chip" data-tone="plain">Imported historical record</span> : null}
          {cohort === "decide" ? <span className="kr-chip" data-tone="amber">Waiting on a decision</span> : null}
          <span className="kr-tools"><AskAbout draft={`Add a note to ${reg.case_code ? shortCode(reg.case_code) : c.title ?? ""}: `} /><DeleteRecord kind="case" id={c.id} what="this case" compact={false} onDone={() => router.push("/ngo/work")} onRestored={() => router.push(`/ngo/cases/${c.id}`)} /></span>
        </div>
        <h1 className="kr-title">{title}</h1>
        {reg.condition_text ? <p className="kr-lede">{reg.condition_text}</p> : null}
        <ul className="kr-meta">
          <li><MapPin size={15} aria-hidden /><span>{place || "Place not recorded"}<small>{reg.location_precision ? reg.location_precision.replace(/_/g, " ") : reg.h3_r8 ? "recorded area" : "no location"}</small></span></li>
          <li><CalendarDays size={15} aria-hidden /><span>Recorded {day(reg.occurred_at)}{reg.intake_channel ? <small>via {reg.intake_channel.replace(/_/g, " ")}</small> : null}</span></li>
          <li className="kr-holder">{c.assignee_name ? <><span className="kr-av" aria-hidden>{initials(c.assignee_name)}</span><span>Held by <b>{c.assignee_name}</b></span></> : <><span className="kr-av is-none" aria-hidden>?</span><span><b className="is-flame">Nobody holds it yet</b></span></>}</li>
        </ul>
      </header>

      <div className="kr-grid">
        <div className="kr-main">
          <section className="kr-now"><NextStep file={file} cohort={cohort} onChanged={onChanged} /></section>

          <section className="kr-story" aria-labelledby="kr-story-h">
            <div className="kr-sec-head"><h2 id="kr-story-h">The story so far</h2><b className="kr-n">{history.length}</b></div>
            {followups.length > 0 ? <div className="kr-fus"><h3><CalendarClock size={14} aria-hidden />Follow-ups</h3><FollowupList file={file} onChanged={onChanged} /></div> : null}
            <Chronology history={history} onChanged={onChanged} />
          </section>

          {photos.length > 0 ? (
            <section className="kr-photos" aria-labelledby="kr-ph-h">
              <div className="kr-sec-head"><h2 id="kr-ph-h">Photographs</h2><b className="kr-n">{photos.length}</b></div>
              <div className="kr-strip">{photos.map((u, i) => <Portrait key={i} src={u} tag={`Photo ${i + 1}`} sensitive size="m" />)}</div>
            </section>
          ) : null}

          <div className="kr-ops"><OperationsPanel caseId={c.id} /></div>
        </div>

        <aside className="kr-side" aria-label="About this case">
          <section className="kr-card kr-animal">
            <h2 className="kr-card-k">The animal</h2>
            {c.dog_id ? (
              <Link className="kr-pet" href={`/ngo/animals/${c.dog_id}`}>
                <Portrait src={animal?.photo ?? null} tag={animal?.straypaw_id ? shortCode(animal.straypaw_id) : "Animal"} sensitive size="s" />
                <span><b>{realName(animal?.name) ?? "Unnamed animal"}</b><small className="mono" title={animal?.straypaw_id ?? undefined}>{animal?.straypaw_id ? shortCode(animal.straypaw_id) : "ID pending"}</small></span>
                <ArrowUpRight size={16} aria-hidden className="kr-go" />
              </Link>
            ) : <p className="kr-quiet">Not linked to an animal yet.</p>}
          </section>

          {more.length > 0 ? (
            <section className="kr-card">
              <h2 className="kr-card-k">On the record</h2>
              <dl className="kr-dl">{more.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            </section>
          ) : null}

          {sameAnimal.length > 0 && <Related title="Other cases on this animal" rows={sameAnimal} />}
          {neighbours.length > 0 && <Related title="Other cases in this area" rows={neighbours} />}
          {reg.h3_r8 && <Link className="kr-map" href={`/ngo/map?area=${reg.h3_r8}${reg.city ? `&city=${encodeURIComponent(reg.city)}` : ""}`}><MapPin size={15} aria-hidden />See the area on the map<ArrowUpRight size={14} aria-hidden /></Link>}
        </aside>
      </div>
    </article>
  );
}

/* Kaju on this record: the words already started in Kaju's line ("Add a note to SPC-…: "); the person finishes
   them, Kaju prepares the note, and the person confirms it. Three steps, nothing saved without them. */
function AskAbout({ draft }: { draft: string }) {
  const ai = useAi();
  return <button type="button" className="kr-ask" onClick={() => ai.prefill(draft)} disabled={ai.busy}><Sparkles size={13} aria-hidden />Note with Kaju</button>;
}

function Related({ title, rows }: { title: string; rows: Neighbour[] }) {
  return (
    <section className="kr-card">
      <h2 className="kr-card-k">{title}<b className="kr-n">{rows.length}</b></h2>
      <ul className="kr-rel">{rows.slice(0, 8).map((r) => <li key={r.id}><Link href={`/ngo/cases/${r.id}`}><i data-tone={TONE[r.status_class ?? "unknown"] ?? "plain"} aria-hidden /><span><b>{r.condition_class ?? r.title ?? "Request"}</b><small><span className="mono">{shortCode(r.case_code)}</span> · {STATUS_META[(r.status_class ?? "unknown") as StatusClass]?.short ?? "Not recorded"} · {day(r.occurred_at)}</small></span><ArrowUpRight size={14} aria-hidden /></Link></li>)}</ul>
    </section>
  );
}

type HistoryRow = { id: string; kind: "update" | "care"; at: string; k: string; t: string; who: string | null | undefined };
/* The case as a line down the page: newest first, six at a time, each with who recorded it. */
function Chronology({ history, onChanged }: { history: HistoryRow[]; onChanged: () => Promise<void> }) {
  const [all, setAll] = useState(false);
  const rows = all ? history : history.slice(0, 6);
  if (!history.length) return <p className="kr-quiet">Nothing recorded yet. A note, a status change or care recorded on this case appears here, with who recorded it.</p>;
  return (
    <>
      <ol className="kr-line">{rows.map((h, i) => (
        <li key={`${h.kind}${h.id ?? i}`} data-k={h.k} style={{ ["--j" as string]: i }}>
          <i className="kr-dot" aria-hidden />
          <div className="kr-ev">
            <p className="kr-ev-t">{h.t.charAt(0).toUpperCase() + h.t.slice(1)}</p>
            <p className="kr-ev-m"><span className="kr-ev-k">{h.k === "care" ? "Care" : h.k === "note" ? "Note" : "Status"}</span><time>{day(h.at)}</time>{h.who ? <span>{h.who.includes("@") ? h.who.split("@")[0].replace(/^demo-/, "") : h.who}</span> : null}</p>
          </div>
          {h.id && <DeleteRecord kind={h.kind} id={h.id} what={h.k === "care" ? "this care record" : h.k === "note" ? "this note" : "this update"} onDone={() => void onChanged()} />}
        </li>
      ))}</ol>
      {history.length > 6 && <button type="button" className="kr-more" aria-expanded={all} onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${history.length}`}<ChevronDown size={14} aria-hidden /></button>}
    </>
  );
}
