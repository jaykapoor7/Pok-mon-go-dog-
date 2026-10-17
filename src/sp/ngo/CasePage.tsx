"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · one case, at full depth (decisions 021, 025, 033, 008C).

   The same record the Work inspector shows, given a page of its own: the
   condition and the place at the precision recorded, who holds it, the
   one next step the member's role allows, follow-ups, the whole
   chronology (updates and care, each with who recorded it), and the
   other cases on the same animal or in the same area. Read under the
   member's session; every action waits for the database's answer.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { loadCaseFile, type CaseFile, type Neighbour } from "@/lib/case-file";
import { isHistoricalCase, isStale } from "@/lib/ops";
import { STATUS_META, type StatusClass } from "@/lib/register/taxonomy";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { State, day } from "../ui";
import { FollowupList, NextStep } from "./NextStep";
import { NgoGate } from "./Gate";
import "./ngo.css";

const realName = (s: string | null | undefined) => { const t = (s ?? "").trim(); return t && !/·/.test(t) ? t : null; };

export function CasePage({ id }: { id: string }) {
  const mem = useMembership();
  const [file, setFile] = useState<CaseFile | null | "loading" | "error">("loading");
  const read = useCallback(async () => { try { setFile(await loadCaseFile(id)); } catch { setFile("error"); } }, [id]);
  useEffect(() => { if (mem.member) void read(); }, [mem.member, read]);

  return (
    <NgoGate title="Case file" lede="One case your organisation holds, with its history and its next step.">
      {file === "loading" ? <div className="ngo-page"><div className="skel" style={{ height: 320, margin: 28 }} /></div>
        : file === "error" ? <div className="ngo-page"><State kind="error" title="Not read" action={<button type="button" className="btn" onClick={() => void read()}>Try again</button>}>This case could not be read just now. Nothing was changed.</State></div>
        : !file ? <div className="ngo-page"><State kind="forbidden" title="Not available" action={<Link className="btn" href="/ngo">Back to Work</Link>}>This case is not readable with your organisation&rsquo;s access. It may belong to another organisation; cross-organisation access needs an accepted grant.</State></div>
        : <Body file={file} onChanged={read} />}
    </NgoGate>
  );
}

function Body({ file, onChanged }: { file: CaseFile; onChanged: () => Promise<void> }) {
  const { c, reg, animal, updates, medical, neighbours, sameAnimal, followups } = file;
  const imported = reg.provenance === "imported_historical_record";
  const facts = { ...c, occurred_at: reg.occurred_at, status_class: reg.status_class, provenance: reg.provenance, reviewed_at: reg.status_reviewed_at, last_activity_at: c.last_activity_at ?? c.updated_at } as never;
  const cohort = isHistoricalCase(facts) ? "history" : isStale(facts, Date.now()) ? "decide" : "live";
  const history = [
    ...updates.map((u) => ({ at: u.created_at, k: u.type === "note" ? "note" : "update", t: u.note || (u.to_status ? `Status → ${u.to_status.replace(/_/g, " ")}` : u.type.replace(/_/g, " ")), who: u.actor_name })),
    ...medical.map((m) => ({ at: m.event_date, k: "care", t: `${m.kind.replace(/_/g, " ")}${m.notes ? `: ${m.notes}` : ""}`, who: m.performed_by })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const title = reg.condition_class && reg.condition_class !== "Not recorded" ? reg.condition_class : c.title;

  return (
    <article className="cs">
      <header className="cs-head">
        <div className="cs-crumb"><Link href="/ngo" className="link"><ArrowLeft size={14} aria-hidden /> Work</Link><span className="mono small">{reg.case_code ?? "Case"}</span></div>
        <div className="cs-title">
          <p className="k">{STATUS_META[(reg.status_class ?? "unknown") as StatusClass]?.label ?? "Status not recorded"}{imported ? " · imported historical record" : ""}{cohort === "decide" ? " · waiting on a decision" : ""}</p>
          <h1 className="display">{title}</h1>
          {reg.condition_text && <p className="lede">{reg.condition_text}</p>}
        </div>
        <dl className="ledger cs-ledger">
          <div><dt>Held by</dt><dd>{c.assignee_name ?? <b className="is-flame">Nobody yet</b>}</dd></div>
          <div><dt>Place</dt><dd>{[c.zone, reg.city].filter(Boolean).join(", ") || "not recorded"} <small>· {reg.location_precision ? reg.location_precision.replace(/_/g, " ") : reg.h3_r8 ? "recorded area" : "no location"}</small></dd></div>
          <div><dt>Recorded</dt><dd>{day(reg.occurred_at)}{reg.intake_channel ? <small> · via {reg.intake_channel.replace(/_/g, " ")}</small> : null}</dd></div>
          {reg.first_action_at && <div><dt>First action</dt><dd>{day(reg.first_action_at)}</dd></div>}
          {reg.hospital && <div><dt>Clinic</dt><dd>{reg.hospital}</dd></div>}
          {reg.next_action && <div><dt>Next action</dt><dd>{reg.next_action}</dd></div>}
          {c.informer_contact && <div><dt>Informer</dt><dd>{c.informer_contact} <small>· private to your organisation</small></dd></div>}
          {c.resolution && <div><dt>Outcome</dt><dd>{c.resolution.replace(/_/g, " ")}{c.outcome_note ? ` · ${c.outcome_note}` : ""}</dd></div>}
        </dl>
      </header>

      <div className="cs-body">
        <div className="cs-main">
          <section className="cs-step"><NextStep file={file} cohort={cohort} onChanged={onChanged} /></section>
          <section className="cf-sec">
            <h2 className="h2">Chronology <span className="mono small">{history.length}</span></h2>
            {history.length ? <ol className="chrono">{history.map((h, i) => <li key={i} className={`is-${h.k === "care" ? "care" : h.k === "note" ? "sight" : "report"}`}><time className="mono">{day(h.at)}</time><span><b>{h.t}</b></span><small>{h.k === "care" ? "Care, recorded by an organisation" : h.k === "note" ? "Note" : "Status"}{h.who ? ` · ${h.who}` : ""}</small></li>)}</ol> : <p className="small">Nothing recorded on this case since it was opened.</p>}
          </section>
          {(c.before_url || c.after_url || (c.photos ?? []).length > 0) && (
            <section className="cf-sec">
              <h2 className="h2">Photographs</h2>
              <div className="cs-photos">{[c.before_url, ...(c.photos ?? []), c.after_url].filter(Boolean).slice(0, 8).map((u, i) => <Portrait key={i} src={u as string} tag={`Photo ${i + 1}`} sensitive size="m" />)}</div>
              <p className="small">Case photographs start covered; they may show injury.</p>
            </section>
          )}
        </div>
        <aside className="cf-side">
          <section className="cf-card">
            <h3 className="h3">The animal</h3>
            {c.dog_id ? (
              <Link className="cs-animal" href={`/ngo/animals/${c.dog_id}`}><Portrait src={animal?.photo ?? null} tag={animal?.straypaw_id ?? "Animal"} sensitive size="s" /><span><b>{realName(animal?.name) ?? animal?.straypaw_id ?? "Animal record"}</b><small className="mono">{animal?.straypaw_id ?? "ID pending"}</small></span><ArrowUpRight size={14} aria-hidden /></Link>
            ) : <p className="small">Not linked to an animal record. A person links it once the animal is identified; nothing is matched automatically.</p>}
          </section>
          <section className="cf-card">
            <h3 className="h3">Follow-ups <span className="mono small">{followups.length}</span></h3>
            <FollowupList file={file} onChanged={onChanged} />
          </section>
          {sameAnimal.length > 0 && <Related title="Other cases on this animal" rows={sameAnimal} />}
          {neighbours.length > 0 && <Related title="Other cases in this area" note="An area that keeps producing requests is itself something to act on." rows={neighbours} />}
          {reg.h3_r8 && <Link className="btn is-s" href={`/ngo/map?area=${reg.h3_r8}${reg.city ? `&city=${encodeURIComponent(reg.city)}` : ""}`}>See the area on the map</Link>}
        </aside>
      </div>
    </article>
  );
}

function Related({ title, note, rows }: { title: string; note?: string; rows: Neighbour[] }) {
  return (
    <section className="cf-card">
      <h3 className="h3">{title} <span className="mono small">{rows.length}</span></h3>
      {note && <p className="small">{note}</p>}
      <ul className="cs-rel">{rows.slice(0, 8).map((r) => <li key={r.id}><Link href={`/ngo/cases/${r.id}`}><span className="mono">{r.case_code ?? "Case"}</span><b>{r.condition_class ?? r.title ?? "Request"}</b><small>{STATUS_META[(r.status_class ?? "unknown") as StatusClass]?.short ?? "—"} · {day(r.occurred_at)}</small></Link></li>)}</ul>
    </section>
  );
}
