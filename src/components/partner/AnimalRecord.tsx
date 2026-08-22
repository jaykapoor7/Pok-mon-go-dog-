"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, MapPin, Circle, Pencil, Loader2, Check } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { isNgoMember } from "@/lib/actions";
import { updateAnimal, getMedicalEvents, addMedicalEvent, setAnimalOwner } from "@/lib/animal-actions";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { speciesLabel, STATUS_META, isOverdue, MEDICAL_KINDS, type Dog, type Sighting, type Case, type DogStatus, type MedicalEvent } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const DOG_STATUSES: DogStatus[] = ["seen", "hungry", "injured", "sterilised", "vaccinated"];
const kindLabel = (k: string) => MEDICAL_KINDS.find((m) => m.id === k)?.label ?? k;

type Tab = "overview" | "medical" | "cases" | "timeline" | "photos";

export function AnimalRecord({ dog, sightings, cases }: { dog: Dog; sightings: Sighting[]; cases: Case[] }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [member, setMember] = useState(false);
  const [editing, setEditing] = useState(false);
  const [medical, setMedical] = useState<MedicalEvent[]>([]);
  const st = STATUS_META[dog.status];

  useEffect(() => {
    isNgoMember().then(setMember).catch(() => {});
    getMedicalEvents(dog.id).then(setMedical).catch(() => {});
  }, [dog.id]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "medical", label: `Medical (${medical.length})` },
    { key: "cases", label: `Cases (${cases.length})` },
    { key: "timeline", label: "Timeline" },
    { key: "photos", label: "Photos" },
  ];

  const photos = Array.from(new Set([...(dog.photos ?? []), ...sightings.map((s) => s.photo_url)].filter(Boolean)));

  // merged chronological timeline
  const events = [
    ...cases.map((c) => ({ t: c.created_at, kind: "case" as const, label: `Case opened · ${c.title}`, sub: c.zone })),
    ...sightings.map((s) => ({ t: s.created_at, kind: "obs" as const, label: "Observation recorded", sub: s.zone })),
  ].sort((a, b) => +new Date(b.t) - +new Date(a.t));

  return (
    <div>
      <Link href="/partner/animals" className="mb-4 inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-paw-600">
        <ArrowLeft className="h-4 w-4" /> Animals
      </Link>

      {/* identity strip */}
      <div className="flex items-start gap-4 border-b border-black/[0.08] pb-5 dark:border-white/[0.1]">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-bark-100 dark:bg-bark-800">
          <DogPhoto src={dog.cover_photo} alt={dog.name ?? "Animal"} seed={dog.id} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px]">
            {dog.code && <span className="font-medium tabular-nums text-bark-500">{dog.code}</span>}
            <span className="text-bark-300">·</span>
            <span className="text-bark-500">{speciesLabel(dog.species)}</span>
          </div>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
            {dog.name || speciesLabel(dog.species)}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-bark-500">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {dog.zone || "—"}</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: st.color }} /> {st.label}</span>
            {dog.assignee_name && <span>· {dog.assignee_name}</span>}
          </p>
        </div>
        {member && (
          <button onClick={() => setEditing((v) => !v)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-black/[0.08] px-2.5 py-1.5 text-[13px] font-semibold text-bark-700 hover:bg-black/[0.04] dark:border-white/10 dark:text-bark-200">
            <Pencil className="h-3.5 w-3.5" /> {editing ? "Close" : "Edit"}
          </button>
        )}
      </div>

      {editing && <AnimalEdit dog={dog} onDone={() => setEditing(false)} />}

      {/* tabs */}
      <div className="no-scrollbar -mx-1 mt-4 mb-5 flex gap-1 overflow-x-auto px-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium", tab === t.key ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04]")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <div>
            <Row label="Species">{speciesLabel(dog.species)}</Row>
            <Row label="Animal ID">{dog.code ?? "—"}</Row>
            <Row label="Status">{st.label}</Row>
            <Row label="Location">{dog.zone || "—"}</Row>
            <Row label="Responsible">{dog.assignee_name ?? "Unassigned"}</Row>
            {(dog.vaccinated || dog.sterilised) && (
              <Row label="Health">{[dog.vaccinated && "Vaccinated", dog.sterilised && "Sterilised"].filter(Boolean).join(" · ")}</Row>
            )}
            {dog.owner_name && <Row label="Owner">{dog.owner_name}{dog.owner_contact ? ` · ${dog.owner_contact}` : ""}</Row>}
            <Row label="Open cases">{cases.filter((c) => c.status !== "resolved" && c.status !== "closed").length}</Row>
            <Row label="First recorded">{formatDate(dog.first_seen)}</Row>
          </div>
          {dog.intake_notes && (
            <div>
              <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-bark-400">Intake notes</h2>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{dog.intake_notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === "medical" && <MedicalPanel dog={dog} canEdit={member} events={medical} onAdded={() => getMedicalEvents(dog.id).then(setMedical)} />}

      {tab === "cases" && (
        <div>
          <Link href={`/cases/new?dog=${dog.id}`} className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
            <Plus className="h-4 w-4" /> New case for this animal
          </Link>
          {cases.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/[0.1] py-10 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No cases yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
              {cases.map((c) => (
                <li key={c.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                  <Link href={`/partner/cases/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <Circle className={cn("h-2.5 w-2.5 shrink-0 fill-current", isOverdue(c) ? "text-status-injured" : c.status === "resolved" ? "text-status-vaccinated" : "text-paw-500")} strokeWidth={0} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{c.title}</p>
                      <p className="truncate text-[12px] text-bark-400 capitalize">{c.category} · {c.status.replace("_", " ")}</p>
                    </div>
                    <span className="shrink-0 text-[12px] tabular-nums text-bark-400">{timeAgo(c.last_activity_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-4 border-l-2 border-black/[0.06] pl-4 dark:border-white/[0.1]">
          {events.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-bark-400">No history yet.</p>
          ) : events.map((e, i) => (
            <div key={i} className="relative">
              <span className={cn("absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full", e.kind === "case" ? "bg-paw-500" : "bg-bark-300")} />
              <p className="text-[12px] text-bark-400">{formatDate(e.t)}</p>
              <p className="mt-0.5 text-[14px] text-bark-800 dark:text-bark-100">{e.label}</p>
              {e.sub && <p className="text-[12px] text-bark-400">{e.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === "photos" && (
        photos.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-bark-400">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => <DogPhoto key={i} src={p} alt={`Photo ${i + 1}`} seed={`${dog.id}-${i}`} className="aspect-square rounded-lg" />)}
          </div>
        )
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.06] py-2.5 last:border-0 dark:border-white/[0.06]">
      <span className="text-[13px] text-bark-500">{label}</span>
      <span className="text-right text-[14px] font-medium text-bark-900 dark:text-bark-50">{children}</span>
    </div>
  );
}

function AnimalEdit({ dog, onDone }: { dog: Dog; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(dog.name ?? "");
  const [code, setCode] = useState(dog.code ?? "");
  const [status, setStatus] = useState<DogStatus>(dog.status);
  const [notes, setNotes] = useState(dog.intake_notes ?? "");
  const [assigneeId, setAssigneeId] = useState(dog.assignee_id ?? "");
  const [ownerName, setOwnerName] = useState(dog.owner_name ?? "");
  const [ownerContact, setOwnerContact] = useState(dog.owner_contact ?? "");
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [busy, setBusy] = useState(false);
  const INPUT = "w-full rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

  useEffect(() => { getMyOrgMembers().then(setMembers).catch(() => {}); }, []);

  async function save() {
    setBusy(true);
    try {
      const m = members.find((x) => x.user_id === assigneeId);
      await updateAnimal(dog.id, {
        name: name.trim(), code: code.trim(), status,
        intakeNotes: notes.trim(),
        assigneeId: assigneeId || undefined,
        assigneeName: m?.name ?? undefined,
      });
      await setAnimalOwner(dog.id, ownerName.trim(), ownerContact.trim());
      router.refresh();
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={INPUT} />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Animal ID" className={INPUT} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as DogStatus)} className={INPUT}>
          {DOG_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={INPUT}>
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner / community (optional)" className={INPUT} />
        <input value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} placeholder="Owner contact" className={INPUT} />
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Intake notes" className={cn(INPUT, "min-h-[60px] resize-y")} />
      <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
      </button>
    </div>
  );
}

function MedicalPanel({ dog, canEdit, events, onAdded }: { dog: Dog; canEdit: boolean; events: MedicalEvent[]; onAdded: () => void }) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("vaccination");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);
  const INPUT = "rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

  async function submit() {
    setBusy(true);
    try {
      await addMedicalEvent({ dogId: dog.id, kind, eventDate: date || null, notes: notes.trim() || undefined, performedBy: by.trim() || undefined });
      setAdding(false); setNotes(""); setBy(""); setDate("");
      onAdded();
    } finally { setBusy(false); }
  }

  return (
    <div>
      {canEdit && (
        <div className="mb-3">
          <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
            <Stethoscope className="h-4 w-4" /> Log medical event
          </button>
        </div>
      )}
      {adding && (
        <div className="mb-4 space-y-2 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]">
          <div className="flex flex-wrap gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={INPUT}>
              {MEDICAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
            <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Performed by (vet/worker)" className={cn(INPUT, "min-w-0 flex-1")} />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (medicine, dosage, findings…)" className={cn(INPUT, "min-h-[56px] w-full resize-y")} />
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save event
          </button>
        </div>
      )}
      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-10 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No medical events logged.</p>
      ) : (
        <div className="space-y-3 border-l-2 border-black/[0.06] pl-4 dark:border-white/[0.1]">
          {events.map((e) => (
            <div key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-paw-500" />
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-paw-50 px-2 py-0.5 text-[11px] font-semibold text-paw-700 dark:bg-paw-900/30 dark:text-paw-300">{kindLabel(e.kind)}</span>
                <span className="text-[12px] text-bark-400">{formatDate(e.event_date)}{e.performed_by ? ` · ${e.performed_by}` : ""}</span>
              </div>
              {e.notes && <p className="mt-1 text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{e.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
