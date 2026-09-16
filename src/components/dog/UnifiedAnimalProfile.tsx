import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CircleDot,
  MapPin,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { DogActions } from "@/components/dog/DogActions";
import { DogStatusEditor } from "@/components/dog/DogStatusEditor";
import { FollowButton } from "@/components/dog/FollowButton";
import { ShareDog } from "@/components/dog/ShareDog";
import { AddComment } from "@/components/dog/AddComment";
import { AnimalDocuments } from "@/components/dog/AnimalDocuments";
import type { Case, DogProfile } from "@/lib/types";
import type { ProfileOperationalRecord, StandardAnimalRecord } from "@/lib/animal-profile-record";
import { dogLabel, formatDate, timeAgo } from "@/lib/utils";

const LABELS: Record<string, string> = {
  rescue: "Rescue",
  treatment: "Treatment",
  follow_up: "Follow-up",
  sterilisation: "Sterilisation",
  vaccination: "Vaccination",
  adoption: "Adoption",
  foster: "Foster",
  observation: "Observation",
};

function recordLabel(value: string) {
  return LABELS[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstValue<T>(rows: StandardAnimalRecord[], pick: (row: StandardAnimalRecord) => T | null | undefined) {
  for (const row of rows) {
    const value = pick(row);
    if (value !== null && value !== undefined && String(value).trim()) return value;
  }
  return null;
}

function eventCopy(row: StandardAnimalRecord) {
  return Array.from(new Set([
    row.condition,
    row.caseDetail,
    row.treatmentUpdate,
    row.rescuePlan,
    row.review,
  ].filter((value): value is string => Boolean(value?.trim()))));
}

function dateOrUnknown(value: string | null | undefined) {
  return value ? formatDate(value) : "Date not recorded";
}

export function UnifiedAnimalProfile({
  profile,
  cases,
  operational,
}: {
  profile: DogProfile;
  cases: Case[];
  operational: ProfileOperationalRecord;
}) {
  const { dog, sightings, comments } = profile;
  const imported = operational.imported;
  const sourceName = dog.ngo_name || (dog.ngo_id ? "NGO record" : "Community record");
  const importedRecord = dog.provenance === "imported_historical_record" || imported.length > 0;
  const sex = firstValue(imported, (row) => row.sex);
  const sourceColour = firstValue(imported, (row) => row.colour);
  const sourceLocality = firstValue(imported, (row) => row.locality);
  const sourceCode = firstValue(imported, (row) => row.animalCode);
  const communitySightings = sightings.filter((row) => row.source_kind !== "historic_ngo_record");

  const rescueCount = imported.filter((row) => row.classification === "rescue").length || cases.filter((row) => row.category === "rescue").length;
  const treatmentCount = imported.filter((row) => row.classification === "treatment").length || operational.medical.filter((row) => row.kind === "treatment").length;
  const followUpCount = imported.filter((row) => row.classification === "follow_up").length || operational.followUps.length;
  const vaccinationCount = imported.filter((row) => row.classification === "vaccination").length || profile.vaccinations.length;
  const sterilisationCount = imported.filter((row) => row.classification === "sterilisation").length || profile.sterilisations.length;
  const adoption = imported.find((row) => row.classification === "adoption");
  const foster = imported.find((row) => row.classification === "foster");
  const latestTreatment = imported.find((row) => row.classification === "treatment") ?? null;
  const latestFollowUp = imported.find((row) => row.classification === "follow_up") ?? null;

  const fallbackHistory = [
    ...operational.timeline.map((row) => ({ id: `timeline-${row.id}`, date: row.occurredAt, kind: row.eventType, title: row.title, detail: row.details })),
    ...cases.map((row) => ({ id: `case-${row.id}`, date: row.created_at, kind: row.category, title: row.title, detail: row.description })),
    ...communitySightings.map((row) => ({ id: `sighting-${row.id}`, date: row.created_at, kind: "observation", title: "Community sighting", detail: row.notes })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#0b1e3d]">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-5 sm:px-6 lg:px-8">
        <Link href="/map" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#536071] hover:text-[#2457ce]">
          <ArrowLeft className="h-4 w-4" /> Back to map
        </Link>

        <header className="overflow-hidden border-y border-black/[.09] bg-[#ebe4d8] lg:grid lg:grid-cols-[390px_1fr]">
          <div className="min-h-[300px] bg-[#d9d1c4] lg:min-h-[430px]">
            <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} className="h-full min-h-[300px] w-full lg:min-h-[430px]" />
          </div>
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#66717f]">
                <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{sourceName}</span>
                {importedRecord && <><span>·</span><span>Historical field record</span></>}
              </div>
              <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <h1 className="text-4xl font-semibold tracking-[-.055em] text-[#0b1e3d] sm:text-5xl">{dogLabel(dog)}</h1>
                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[#596472]">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{sourceLocality || dog.zone}</span>
                    <span>·</span><span>{dog.species || "dog"}</span>
                    {(sex || dog.color) && <><span>·</span><span>{[sex, sourceColour || dog.color].filter(Boolean).join(" · ")}</span></>}
                  </p>
                </div>
                <FollowButton dogId={dog.id} className="shrink-0" />
              </div>
              <p className="mt-6 max-w-2xl text-[15px] leading-7 text-[#3f4b59]">
                {dog.intake_notes || firstValue(imported, (row) => row.caseDetail) || firstValue(imported, (row) => row.condition) || "A longitudinal street-animal record built from field observations and care history."}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 border-t border-black/[.09] pt-5">
              <DogActions dogId={dog.id} name={dogLabel(dog)} needsHelp={dog.needs_help} />
              <ShareDog dogId={dog.id} label={dogLabel(dog)} zone={dog.zone} />
            </div>
          </div>
        </header>

        <section className="grid border-b border-black/[.09] bg-[#0b1e3d] text-white sm:grid-cols-2 lg:grid-cols-5" aria-label="Animal record summary">
          <SummaryMetric label="Rescue records" value={String(rescueCount)} icon={<ShieldCheck className="h-4 w-4" />} />
          <SummaryMetric label="Treatments" value={String(treatmentCount)} icon={<Stethoscope className="h-4 w-4" />} />
          <SummaryMetric label="Sterilisation" value={dog.sterilised ? "Recorded" : "Unknown"} icon={<Scissors className="h-4 w-4" />} />
          <SummaryMetric label="Vaccination" value={dog.vaccinated ? "Recorded" : "Unknown"} icon={<Syringe className="h-4 w-4" />} />
          <SummaryMetric label="Follow-ups" value={String(followUpCount)} icon={<CalendarDays className="h-4 w-4" />} />
        </section>

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <RecordSection eyebrow="Standard record" title="What is known about this animal">
              <div className="grid border-t border-black/[.1] sm:grid-cols-2">
                <RecordField label="Animal ID" value={sourceCode || dog.code || "Not recorded"} />
                <RecordField label="Name" value={dog.name || firstValue(imported, (row) => row.animalName) || "Not named"} />
                <RecordField label="Sex" value={sex || "Not recorded"} />
                <RecordField label="Colour / markings" value={sourceColour || dog.color || "Not recorded"} />
                <RecordField label="Locality" value={sourceLocality || dog.zone || "Not recorded"} />
                <RecordField label="First recorded" value={dateOrUnknown(dog.first_seen)} />
                <RecordField label="Last recorded" value={dateOrUnknown(dog.last_seen)} />
                <RecordField label="Current state" value={dog.status.replace(/_/g, " ")} />
                <RecordField label="Adoption" value={adoption ? `Recorded · ${dateOrUnknown(adoption.eventDate)}` : "No adoption record"} />
                <RecordField label="Foster" value={foster ? `Recorded · ${dateOrUnknown(foster.eventDate)}` : "No foster record"} />
              </div>
            </RecordSection>

            <RecordSection eyebrow="Care" title="Interventions and follow-up">
              <div className="border-t border-black/[.1]">
                <CareRow label="Sterilisation" state={dog.sterilised ? "Recorded" : "Not recorded"} detail={sterilisationCount ? `${sterilisationCount} source record${sterilisationCount === 1 ? "" : "s"}` : undefined} />
                <CareRow label="Vaccination / ARV" state={dog.vaccinated ? "Recorded" : "Not recorded"} detail={vaccinationCount ? `${vaccinationCount} source record${vaccinationCount === 1 ? "" : "s"}` : undefined} />
                <CareRow label="Treatment" state={treatmentCount ? `${treatmentCount} recorded` : "No treatment record"} detail={latestTreatment ? eventCopy(latestTreatment)[0] : operational.medical.find((row) => row.kind === "treatment")?.notes ?? undefined} />
                <CareRow label="Follow-up / review" state={followUpCount ? `${followUpCount} recorded` : "No follow-up record"} detail={latestFollowUp?.review || latestFollowUp?.treatmentUpdate || operational.followUps[0]?.note || undefined} />
              </div>
            </RecordSection>

            <RecordSection eyebrow="History" title={imported.length ? "Source record timeline" : "Animal timeline"}>
              {imported.length ? (
                <div className="border-t border-black/[.1]">
                  {imported.map((row) => <ImportedEvent key={`${row.id}-${row.classification}`} row={row} />)}
                </div>
              ) : fallbackHistory.length ? (
                <div className="border-t border-black/[.1]">
                  {fallbackHistory.map((event) => (
                    <div key={event.id} className="grid gap-2 border-b border-black/[.08] py-5 sm:grid-cols-[130px_1fr]">
                      <p className="text-xs font-medium text-[#7a8490]">{dateOrUnknown(event.date)}</p>
                      <div><p className="text-sm font-semibold text-[#0b1e3d]">{event.title}</p>{event.detail && <p className="mt-1 text-sm leading-6 text-[#596472]">{event.detail}</p>}</div>
                    </div>
                  ))}
                </div>
              ) : <p className="border-t border-black/[.1] py-6 text-sm text-[#7a8490]">No longitudinal history has been recorded yet.</p>}
            </RecordSection>

            <RecordSection eyebrow="Cases" title={`Case history · ${cases.length}`}>
              <div className="border-t border-black/[.1]">
                {cases.length ? cases.map((item) => (
                  <Link key={item.id} href={`/cases/${item.id}`} className="grid gap-2 border-b border-black/[.08] py-4 transition hover:bg-black/[.025] sm:grid-cols-[120px_1fr_auto] sm:items-center">
                    <span className="text-xs text-[#7a8490]">{dateOrUnknown(item.created_at)}</span>
                    <span><b className="block text-sm font-semibold text-[#0b1e3d]">{item.title}</b><span className="text-xs capitalize text-[#687481]">{item.category} · {item.status.replace(/_/g, " ")}</span></span>
                    <ArrowUpRight className="hidden h-4 w-4 text-[#2457ce] sm:block" />
                  </Link>
                )) : <p className="py-5 text-sm text-[#7a8490]">No cases linked to this animal.</p>}
              </div>
              <Link href={`/cases/new?dog=${dog.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2457ce]">Open a case <ArrowUpRight className="h-4 w-4" /></Link>
            </RecordSection>

            {communitySightings.length > 0 && (
              <RecordSection eyebrow="Community" title={`Recent sightings · ${communitySightings.length}`}>
                <div className="border-t border-black/[.1]">
                  {communitySightings.slice(0, 8).map((sighting) => (
                    <div key={sighting.id} className="grid gap-2 border-b border-black/[.08] py-4 sm:grid-cols-[130px_1fr]">
                      <span className="text-xs text-[#7a8490]">{dateOrUnknown(sighting.created_at)}</span>
                      <div><p className="text-sm font-semibold text-[#0b1e3d]">{sighting.zone || "Sighting"}</p>{sighting.notes && <p className="mt-1 text-sm leading-6 text-[#596472]">{sighting.notes}</p>}</div>
                    </div>
                  ))}
                </div>
              </RecordSection>
            )}

            <RecordSection eyebrow="Notes" title={`Community notes · ${comments.length}`}>
              <AddComment dogId={dog.id} />
              <div className="mt-4 border-t border-black/[.1]">
                {comments.length ? comments.map((comment) => (
                  <div key={comment.id} className="border-b border-black/[.08] py-4">
                    <p className="text-xs font-semibold text-[#536071]">{comment.user_name} · {timeAgo(comment.created_at)}</p>
                    <p className="mt-1 text-sm leading-6 text-[#344252]">{comment.body}</p>
                  </div>
                )) : <p className="py-5 text-sm text-[#7a8490]">No community notes yet.</p>}
              </div>
            </RecordSection>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-t-4 border-[#f05b40] bg-[#e9e2d6] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#687481]">Record context</p>
              <div className="mt-4 space-y-0 border-t border-black/[.1]">
                <SideRow label="Organisation" value={sourceName} />
                <SideRow label="Provenance" value={importedRecord ? "Imported field history" : "Live StrayPaw record"} />
                <SideRow label="Sightings" value={String(dog.sightings_count ?? communitySightings.length)} />
                <SideRow label="Care events" value={String(operational.medical.length)} />
                <SideRow label="Follow-ups" value={String(followUpCount)} />
              </div>
            </div>

            {dog.photos.length > 1 && (
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#687481]">Photos</p>
                <div className="grid grid-cols-2 gap-2">
                  {dog.photos.slice(1, 5).map((photo, index) => <DogPhoto key={photo} src={photo} alt={`${dogLabel(dog)} photo ${index + 2}`} seed={`${dog.id}-${index}`} className="aspect-square rounded-lg" />)}
                </div>
              </div>
            )}

            <div className="mt-7 border-t border-black/[.1] pt-6">
              <DogStatusEditor
                dogId={dog.id}
                contributorIds={Array.from(new Set(sightings.map((s) => s.user_id).filter(Boolean)))}
                initial={{ status: dog.status, needs_help: dog.needs_help, vaccinated: dog.vaccinated, sterilised: dog.sterilised, is_friendly: dog.is_friendly, ear_notch: dog.ear_notch ?? null }}
              />
            </div>
          </aside>
        </div>

        <div className="mt-12 border-t border-black/[.1] pt-8">
          <AnimalDocuments dogId={dog.id} />
        </div>
      </div>
    </main>
  );
}

function SummaryMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="border-white/10 px-5 py-4 sm:border-r last:border-r-0"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-white/55">{icon}{label}</div><p className="mt-2 text-lg font-semibold tracking-[-.025em]">{value}</p></div>;
}

function RecordSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="mb-12"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#7b8490]">{eyebrow}</p><h2 className="mb-5 mt-1 text-2xl font-semibold tracking-[-.04em] text-[#0b1e3d]">{title}</h2>{children}</section>;
}

function RecordField({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-black/[.08] py-3.5 sm:odd:pr-7 sm:even:border-l sm:even:pl-7"><dt className="text-[11px] font-medium uppercase tracking-[.08em] text-[#7a8490]">{label}</dt><dd className="mt-1 text-sm font-semibold capitalize text-[#24364a]">{value}</dd></div>;
}

function CareRow({ label, state, detail }: { label: string; state: string; detail?: string }) {
  return <div className="grid gap-2 border-b border-black/[.08] py-4 sm:grid-cols-[160px_150px_1fr]"><span className="text-sm font-semibold text-[#0b1e3d]">{label}</span><span className="text-sm font-medium text-[#2457ce]">{state}</span><span className="text-sm leading-6 text-[#64707d]">{detail || "—"}</span></div>;
}

function SideRow({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-black/[.09] py-3"><dt className="text-[10px] uppercase tracking-[.09em] text-[#7a8490]">{label}</dt><dd className="mt-1 text-sm font-semibold text-[#24364a]">{value}</dd></div>;
}

function ImportedEvent({ row }: { row: StandardAnimalRecord }) {
  const copy = eventCopy(row);
  const extras = [
    row.sourceStatus && `Status: ${row.sourceStatus}`,
    row.admitDate && `Admitted ${formatDate(row.admitDate)}`,
    row.releaseDate && `Released ${formatDate(row.releaseDate)}`,
  ].filter(Boolean) as string[];
  return (
    <article className="grid gap-3 border-b border-black/[.08] py-5 sm:grid-cols-[130px_1fr]">
      <div>
        <p className="text-xs font-medium text-[#7a8490]">{dateOrUnknown(row.eventDate)}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#2457ce]"><CircleDot className="h-3 w-3" />{recordLabel(row.classification)}</span>
      </div>
      <div>
        {copy.length ? copy.map((line, index) => <p key={`${row.id}-${index}`} className={index ? "mt-1 text-sm leading-6 text-[#596472]" : "text-sm font-semibold leading-6 text-[#24364a]"}>{line}</p>) : <p className="text-sm text-[#687481]">{recordLabel(row.classification)} recorded.</p>}
        {extras.length > 0 && <p className="mt-2 text-xs text-[#687481]">{extras.join(" · ")}</p>}
        {(row.sourceSheet || row.sourceRow) && <p className="mt-2 font-mono text-[10px] text-[#9098a1]">{row.sourceSheet || "Workbook"}{row.sourceRow ? ` · row ${row.sourceRow}` : ""}</p>}
      </div>
    </article>
  );
}
