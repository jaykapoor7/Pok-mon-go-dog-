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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { MapPin, PawPrint, Sparkles } from "lucide-react";
import { Btn, Empty, Head, More, Page, Panel, Props, Row, Rows, Section, Split, Tag } from "@/ws/kit";
import { useAi } from "@/sp3/ai/AiPanel";
import { loadCaseFile, type CaseFile, type Neighbour } from "@/lib/case-file";
import { isHistoricalCase, isStale } from "@/lib/ops";
import { STATUS_META, type StatusClass } from "@/lib/register/taxonomy";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { day } from "../ui";
import { FollowupList, NextStep } from "./NextStep";
import { NgoGate } from "./Gate";
import "./ngo.css";
import "./cases.k.css";
import "./CasePage.k.css";
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
      {file === "loading" ? <Page><div aria-busy="true"><i className="kc-skel is-tall" /><i className="kc-skel is-tall" /><i className="kc-skel is-tall" /></div></Page>
        : file === "error" ? <Page><Empty title="Didn't load" action={<Btn onClick={() => void read()}>Try again</Btn>}>This case could not be read just now. Nothing was changed.</Empty></Page>
        : !file ? <Page><Empty title="Not available" action={<Btn href="/ngo">Back to Work</Btn>}>This case belongs to another organisation.</Empty></Page>
        : <Body file={file} onChanged={read} />}
    </NgoGate>
  );
}

const TONE: Record<string, string> = { open: "blue", in_progress: "amber", closed: "green", other_ngo: "plain", no_action: "plain", not_attended: "flame", unknown: "plain" };
type KTone = "flame" | "amber" | "green" | "blue" | "plain";

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
  const props = ([
    ["Place", <>{place || "Not recorded"} <small className="kc-hint">{reg.location_precision ? reg.location_precision.replace(/_/g, " ") : reg.h3_r8 ? "recorded area" : "no location"}</small></>],
    ["Recorded", <>{day(reg.occurred_at)}{reg.intake_channel ? <small className="kc-hint"> via {reg.intake_channel.replace(/_/g, " ")}</small> : null}</>],
    ["Held by", c.assignee_name ?? "Nobody yet"],
    reg.hospital ? ["Clinic", reg.hospital] : null,
    reg.next_action ? ["Next action noted", reg.next_action] : null,
    reg.first_action_at ? ["First action", day(reg.first_action_at)] : null,
    c.informer_contact ? ["Informer", <>{c.informer_contact} <small className="kc-hint">private to your organisation</small></>] : null,
    c.resolution ? ["Outcome", `${c.resolution.replace(/_/g, " ")}${c.outcome_note ? ` · ${c.outcome_note}` : ""}`] : null,
  ].filter(Boolean) as [string, ReactNode][]).map(([label, value]) => ({ label, value }));

  const tone = (TONE[status] ?? "plain") as KTone;
  return (
    <Page className="cp kc-scope">
      {/* Where this case is in the line. A case that needs no procedure ends when it is closed. */}
      {cohort !== "history" && <div className="cp-rail"><StageRail stages={["new", "care"]} at="care" end="Closed" ended={!["open", "in_progress"].includes(reg.status_class ?? "open")} /></div>}

      <Head
        eyebrow={<span className="cp-id"><span className="kc-code" title={reg.case_code ?? undefined}>{shortCode(reg.case_code)}</span><Tag tone={tone} dot>{STATUS_META[status]?.label ?? "Status not recorded"}</Tag>{imported ? <Tag>Imported historical record</Tag> : null}{cohort === "decide" ? <Tag tone="amber">Waiting on a decision</Tag> : null}</span>}
        title={title}
        sum={<>{place || "Place not recorded"} · recorded {day(reg.occurred_at)} · {c.assignee_name ? <>held by <b>{c.assignee_name}</b></> : <span className="is-hot">nobody holds it yet</span>}</>}
        actions={<><AskAbout draft={`Add a note to ${reg.case_code ? shortCode(reg.case_code) : c.title ?? ""}: `} /><DeleteRecord kind="case" id={c.id} what="this case" compact={false} onDone={() => router.push("/ngo/work")} onRestored={() => router.push(`/ngo/cases/${c.id}`)} /></>} />
      {reg.condition_text ? <p className="kc-quiet cp-lede">{reg.condition_text}</p> : null}

      <Split side={<>
        <Section title="The animal">
          <Panel>{c.dog_id ? <Rows><Row href={`/ngo/animals/${c.dog_id}`} icon={<PawPrint size={12} />} title={realName(animal?.name) ?? "Unnamed animal"} meta={<span title={animal?.straypaw_id ?? undefined}>{animal?.straypaw_id ? shortCode(animal.straypaw_id) : "ID pending"}</span>} /></Rows> : <p className="kc-quiet is-pad">Not linked to an animal yet.</p>}</Panel>
        </Section>
        <Section title="Properties">
          <Props items={props} />
          {reg.h3_r8 && <p className="cp-map"><Btn small variant="quiet" icon={<MapPin size={14} />} href={`/ngo/map?area=${reg.h3_r8}${reg.city ? `&city=${encodeURIComponent(reg.city)}` : ""}`}>See the area on the map</Btn></p>}
        </Section>
        {sameAnimal.length > 0 && <Related title="Other cases on this animal" rows={sameAnimal} />}
        {neighbours.length > 0 && <Related title="Other cases in this area" rows={neighbours} />}
      </>}>
        <Section title="Next step"><Panel pad><NextStep file={file} cohort={cohort} onChanged={onChanged} /></Panel></Section>

        {followups.length > 0 ? <Section title="Follow-ups" count={followups.length}><Panel><FollowupList file={file} onChanged={onChanged} /></Panel></Section> : null}

        <Section title="The story so far" count={history.length}>
          <Panel><Chronology history={history} onChanged={onChanged} /></Panel>
        </Section>

        {photos.length > 0 ? (
          <Section title="Photographs" count={photos.length}>
            <div className="cp-strip">{photos.map((u, i) => <Portrait key={i} src={u} tag={`Photo ${i + 1}`} sensitive size="m" />)}</div>
          </Section>
        ) : null}

        <OperationsPanel caseId={c.id} />
      </Split>
    </Page>
  );
}

/* Kaju on this record: the words already started in Kaju's line ("Add a note to SPC-…: "); the person finishes
   them, Kaju prepares the note, and the person confirms it. Three steps, nothing saved without them. */
function AskAbout({ draft }: { draft: string }) {
  const ai = useAi();
  return <Btn icon={<Sparkles size={14} />} onClick={() => ai.prefill(draft)} disabled={ai.busy}>Note with Kaju</Btn>;
}

function Related({ title, rows }: { title: string; rows: Neighbour[] }) {
  return (
    <Section title={title} count={rows.length} fold={title} open={false}>
      <Panel><Rows>{rows.slice(0, 8).map((r) => <Row key={r.id} href={`/ngo/cases/${r.id}`} title={r.condition_class ?? r.title ?? "Request"} meta={`${shortCode(r.case_code)} · ${day(r.occurred_at)}`} end={<Tag tone={(TONE[r.status_class ?? "unknown"] ?? "plain") as KTone}>{STATUS_META[(r.status_class ?? "unknown") as StatusClass]?.short ?? "Not recorded"}</Tag>} go={false} />)}</Rows></Panel>
    </Section>
  );
}

type HistoryRow = { id: string; kind: "update" | "care"; at: string; k: string; t: string; who: string | null | undefined };
/* The case as rows, newest first, six at a time, each with who recorded it. */
function Chronology({ history, onChanged }: { history: HistoryRow[]; onChanged: () => Promise<void> }) {
  if (!history.length) return <p className="kc-quiet is-pad">Nothing recorded yet. A note, a status change or care recorded on this case appears here, with who recorded it.</p>;
  return (
    <More items={history} cap={6}>{(rows) => (
      <ol className="kc-items">{rows.map((h, i) => (
        <li key={`${h.kind}${h.id ?? i}`} className="kc-item">
          <span className="kc-item-t"><b>{h.t}</b><small><time>{day(h.at)}</time>{h.who ? ` · ${h.who.includes("@") ? h.who.split("@")[0].replace(/^demo-/, "") : h.who}` : ""}</small></span>
          <span className="kc-item-e">{/* Most rows are notes; only care and status changes are named. */}{h.k !== "note" ? <Tag tone={h.k === "care" ? "green" : "plain"}>{h.k === "care" ? "Care" : "Status"}</Tag> : null}
            {h.id && <DeleteRecord kind={h.kind} id={h.id} what={h.k === "care" ? "this care record" : h.k === "note" ? "this note" : "this update"} onDone={() => void onChanged()} />}</span>
        </li>
      ))}</ol>
    )}</More>
  );
}
