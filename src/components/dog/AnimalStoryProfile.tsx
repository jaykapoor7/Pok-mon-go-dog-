import Link from "next/link";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { FollowButton } from "@/components/dog/FollowButton";
import { ShareDog } from "@/components/dog/ShareDog";
import { RecordExportActions } from "@/components/dog/RecordExportActions";
import { AddComment } from "@/components/dog/AddComment";
import type { Case, DogProfile } from "@/lib/types";
import type { ProfileOperationalRecord, StandardAnimalRecord } from "@/lib/animal-profile-record";
import type { PublicAnimalIdentity } from "@/lib/animal-identity";
import { isClosedStatus, rescueCategory } from "@/lib/rescue-taxonomy";
import { dogLabel, formatDate, timeAgo } from "@/lib/utils";

const LABELS: Record<string, string> = {
  rescue: "Rescue",
  injury: "Rescue",
  treatment: "Treatment",
  wound: "Wound care",
  wound_care: "Wound care",
  chemotherapy: "TVT / chemotherapy",
  surgery: "Surgery",
  diagnostic: "Diagnostics",
  checkup: "Check-up",
  rehabilitation: "Rehabilitation",
  follow_up: "Follow-up",
  review: "Follow-up",
  sterilisation: "ABC / sterilisation",
  vaccination: "Rabies / vaccination",
  adoption: "Adoption",
  foster: "Foster",
  outcome: "Outcome",
  release: "Released",
  death: "Outcome",
  transfer: "Transfer",
  observation: "Sighting",
};
const label = (value: string) => LABELS[value] ?? value.replace(/^import:/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const when = (value: string | null | undefined) => value ? formatDate(value) : "Date not recorded";
function firstValue<T>(rows: StandardAnimalRecord[], pick: (row: StandardAnimalRecord) => T | null | undefined) { for (const row of rows) { const v = pick(row); if (v !== null && v !== undefined && String(v).trim()) return v; } return null; }
function sourceDetail(row: StandardAnimalRecord) { return [row.condition, row.caseDetail, row.treatmentUpdate, row.rescuePlan, row.review].filter((v): v is string => Boolean(v?.trim())).join(" · "); }

type JourneyEvent = { id: string; date: string | null; type: string; title: string; detail: string | null; href?: string | null };

export function AnimalStoryProfile({ profile, cases, operational, identity }: { profile: DogProfile; cases: Case[]; operational: ProfileOperationalRecord; identity: PublicAnimalIdentity | null }) {
  const { dog, sightings, comments } = profile;
  const imported = operational.imported;
  const sourceName = dog.ngo_name || (dog.ngo_id ? "NGO record" : "Community record");
  const locality = firstValue(imported, (row) => row.locality) || dog.zone;
  const sex = firstValue(imported, (row) => row.sex);
  const colour = firstValue(imported, (row) => row.colour) || dog.color;
  const sourceCode = identity?.source_code || firstValue(imported, (row) => row.animalCode) || dog.code;
  const straypawId = identity?.straypaw_id || null;
  const activeCases = cases.filter((row) => !isClosedStatus(row.status));
  const completedCases = cases.filter((row) => isClosedStatus(row.status));
  const latestOutcomeCase = [...completedCases].sort((a, b) => +new Date(b.resolved_at || b.created_at) - +new Date(a.resolved_at || a.created_at))[0];
  const outcome = latestOutcomeCase?.outcome_note || latestOutcomeCase?.resolution || null;
  const category = rescueCategory({ title: cases[0]?.title, detail: cases[0]?.condition_text || cases[0]?.description, subtype: cases[0]?.category });
  const state = String(dog.status ?? "").toLowerCase();
  const photoTone = dog.needs_help ? "urgent" as const : activeCases.length ? "active" as const : ["resolved", "released", "adopted", "safe"].includes(state) || completedCases.length ? "resolved" as const : "neutral" as const;

  const journey: JourneyEvent[] = [
    ...cases.map((row) => ({ id: `case-${row.id}`, date: row.source_event_at || row.created_at, type: "rescue", title: row.title || row.condition_text || "Rescue case", detail: row.description || row.condition_text || null, href: `/cases/${row.id}` })),
    ...operational.medical.map((row) => ({ id: `medical-${row.id}`, date: row.eventDate, type: row.kind, title: label(row.kind), detail: row.notes })),
    ...operational.followUps.map((row) => ({ id: `follow-${row.id}`, date: row.dueAt, type: "follow_up", title: label(row.kind || "follow_up"), detail: row.note })),
    ...operational.timeline.map((row) => ({ id: `timeline-${row.id}`, date: row.occurredAt, type: row.eventType, title: row.title, detail: row.details })),
  ].filter((row) => row.date).sort((a, b) => +new Date(a.date || 0) - +new Date(b.date || 0));

  const exportRows = journey.map((row) => ({ date: row.date, type: row.type, title: row.title, detail: row.detail }));
  const firstStory = journey[0];
  const lastStory = journey[journey.length - 1];
  const statusLabel = activeCases.length ? "Rescue in progress" : completedCases.length ? "Completed journey" : dog.needs_help ? "Needs attention" : "Recorded animal";

  return <main className="min-h-screen bg-[#f7f5ef] text-[#0b1e3d]"><div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
    <header className="grid overflow-hidden rounded-2xl border border-black/[.08] bg-white md:grid-cols-[340px_1fr]">
      <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} tone={photoTone} className="h-[310px] w-full md:h-full md:min-h-[410px]" />
      <div className="flex flex-col justify-between p-6 sm:p-8">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] opacity-55"><Building2 size={13}/>{sourceName}</span><FollowButton dogId={dog.id}/></div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${activeCases.length ? "bg-[#f05b40]/10 text-[#c94732]" : "bg-[#3e8473]/10 text-[#2f6d5e]"}`}>{statusLabel}</span>{cases.length > 0 && <span className="rounded-full bg-black/[.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] opacity-60">{category}</span>}</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em]">{dogLabel(dog)}</h1>
          {straypawId && <p className="mt-2 font-mono text-xs font-semibold tracking-wide text-[#2457ce]">{straypawId}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm opacity-70"><MapPin size={14}/>{locality || "Location not recorded"}<span>·</span><span className="capitalize">{dog.species || "animal"}</span>{sex && <><span>·</span><span>{sex}</span></>}</p>
          <p className="mt-6 max-w-2xl text-sm leading-6 opacity-80">{firstStory?.detail || dog.intake_notes || firstValue(imported, (row) => row.caseDetail) || firstValue(imported, (row) => row.condition) || "The first field record did not include a narrative."}</p>
          {outcome && <p className="mt-4 border-l-2 border-[#3e8473] pl-3 text-sm leading-6"><b>Outcome:</b> {String(outcome).replace(/_/g, " ")}</p>}
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-black/[.08] pt-5"><ShareDog dogId={dog.id} label={dogLabel(dog)} zone={dog.zone}/><RecordExportActions name={dogLabel(dog)} animalId={straypawId || dog.id} locality={locality || null} rows={exportRows}/></div>
      </div>
    </header>

    <section className="mt-8 grid gap-3 sm:grid-cols-4" aria-label="Journey at a glance">
      <Stat label="First record" value={firstStory ? when(firstStory.date) : when(dog.first_seen)} />
      <Stat label="Rescue cases" value={String(cases.length)} />
      <Stat label="Care events" value={String(operational.medical.length)} />
      <Stat label="Follow-ups" value={String(operational.followUps.length)} />
    </section>

    <section className="mt-10">
      <div className="flex items-end justify-between gap-4"><div><span className="text-[11px] font-semibold uppercase tracking-[.14em] opacity-50">Journey</span><h2 className="mt-1 text-2xl font-semibold tracking-tight">What happened</h2><p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">Rescue, treatment, reviews and outcomes are one story. The oldest record is first.</p></div><span className="text-xs tabular-nums opacity-50">{journey.length} events</span></div>
      <div className="mt-5 border-t border-black/[.1]">
        {journey.length ? journey.map((item, index) => <div key={item.id} className="grid gap-3 border-b border-black/[.08] py-5 sm:grid-cols-[110px_26px_150px_minmax(0,1fr)_20px] sm:items-start">
          <time className="text-xs tabular-nums opacity-55">{when(item.date)}</time>
          <span className="relative flex h-6 items-start justify-center"><i className={`mt-1.5 size-2.5 rounded-full ${index === journey.length - 1 ? "bg-[#2457ce]" : "bg-[#9ca7b6]"}`}/>{index < journey.length - 1 && <i className="absolute left-1/2 top-4 h-[calc(100%+22px)] w-px -translate-x-1/2 bg-black/[.09]"/>}</span>
          <b className="text-xs">{label(item.type)}</b>
          <span><strong className="block text-sm font-semibold">{item.title}</strong>{item.detail && item.detail !== item.title && <small className="mt-1 block whitespace-pre-line text-xs leading-5 opacity-65">{item.detail}</small>}</span>
          {item.href ? <Link href={item.href} aria-label="Open source record"><ArrowUpRight size={15}/></Link> : <span/>}
        </div>) : <p className="py-7 text-sm opacity-60">No longitudinal events have been recorded yet.</p>}
      </div>
    </section>

    <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_.9fr]">
      <div><span className="text-[11px] font-semibold uppercase tracking-[.14em] opacity-50">Animal record</span><h2 className="mt-1 text-xl font-semibold">Identity and context</h2><div className="mt-3 border-t border-black/[.1]"><Field label="StrayPaw ID" value={straypawId || "Not loaded"}/><Field label="Source / NGO ID" value={sourceCode || "None recorded"}/><Field label="Colour / markings" value={colour || "Not recorded"}/><Field label="Locality" value={locality || "Not recorded"}/><Field label="Latest record" value={lastStory ? when(lastStory.date) : when(dog.last_seen)}/></div></div>
      <div><span className="text-[11px] font-semibold uppercase tracking-[.14em] opacity-50">Evidence</span><h2 className="mt-1 text-xl font-semibold">What can be established</h2><div className="mt-3 border-t border-black/[.1]"><Field label="Rabies / vaccination" value={dog.vaccinated || operational.medical.some((r) => /vaccin|rabies|arv/i.test(r.kind)) ? "Recorded" : "Unknown"}/><Field label="ABC / sterilisation" value={dog.sterilised || operational.medical.some((r) => /sterili|abc|spay|neuter/i.test(r.kind)) ? "Recorded" : "Unknown"}/><Field label="Source register rows" value={String(imported.length)}/><Field label="Community sightings" value={String(sightings.filter((s) => s.source_kind !== "historic_ngo_record").length)}/></div></div>
    </section>

    {imported.length > 0 && <section className="mt-10"><span className="text-[11px] font-semibold uppercase tracking-[.14em] opacity-50">Provenance</span><h2 className="mt-1 text-xl font-semibold">Source register</h2><p className="mt-2 max-w-3xl text-sm leading-6 opacity-65">The story above is the working record. These source rows remain attached so an NGO can trace a claim back to the workbook it came from.</p><div className="mt-3 border-t border-black/[.1]">{imported.slice(0,12).map((row) => <div key={`${row.id}-${row.classification}`} className="grid gap-2 border-b border-black/[.08] py-3 sm:grid-cols-[120px_170px_1fr]"><span className="text-xs opacity-55">{when(row.eventDate)}</span><span className="text-xs font-semibold">{row.sourceSheet || label(row.classification)}{row.sourceRow ? ` · row ${row.sourceRow}` : ""}</span><span className="text-xs leading-5 opacity-65">{sourceDetail(row) || "Source record"}</span></div>)}</div></section>}

    <section className="mt-10"><span className="text-[11px] font-semibold uppercase tracking-[.14em] opacity-50">Community</span><h2 className="mt-1 text-xl font-semibold">Notes</h2><div className="mt-3"><AddComment dogId={dog.id}/><div className="mt-4 border-t border-black/[.1]">{comments.length ? comments.map((comment) => <div key={comment.id} className="border-b border-black/[.08] py-4"><p className="text-xs font-semibold opacity-60">{comment.user_name} · {timeAgo(comment.created_at)}</p><p className="mt-1 text-sm leading-6">{comment.body}</p></div>) : <p className="py-5 text-sm opacity-60">No community notes yet.</p>}</div></div></section>
  </div></main>;
}

function Stat({ label: title, value }: { label: string; value: string }) { return <div className="rounded-xl border border-black/[.08] bg-white p-4"><span className="text-[10px] font-semibold uppercase tracking-[.1em] opacity-50">{title}</span><b className="mt-2 block text-lg">{value}</b></div>; }
function Field({ label: title, value }: { label: string; value: string }) { return <div className="grid grid-cols-[145px_1fr] gap-3 border-b border-black/[.08] py-3"><span className="text-xs opacity-55">{title}</span><b className="text-sm font-medium">{value}</b></div>; }
