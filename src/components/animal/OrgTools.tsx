"use client";

/* ════════════════════════════════════════════════════════════════════
   The organisation's side of a record: its cases for this animal, the
   care it logs, the notes it keeps, and the edits it makes.

   Everything here is read under the member's own session, so a person
   looking round the workspace without membership sees the public record
   and a sign-in line — never the organisation's notes, which can carry a
   caller's name or number.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Loader2, Pencil, Plus, Stethoscope } from "lucide-react";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { addMedicalEvent, getAnimalTimeline, getMedicalEvents, setAnimalOwner, updateAnimal, type AnimalTimelineEvent } from "@/lib/animal-actions";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { getSupabase } from "@/lib/supabase";
import { MEDICAL_KINDS, STATUS_META as DOG_STATUS_META, type Dog, type DogStatus, type MedicalEvent } from "@/lib/types";
import { STATUS_META, type StatusClass } from "@/lib/register/taxonomy";

type OrgCase = { id: string; case_code: string | null; title: string | null; condition_class: string | null; status_class: string | null; occurred_at: string | null; last_activity_at: string | null; assignee_name: string | null };
const DOG_STATUSES: DogStatus[] = ["seen", "hungry", "injured", "sterilised", "vaccinated"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const kindLabel = (k: string) => MEDICAL_KINDS.find((m) => m.id === k)?.label ?? k.replace(/_/g, " ");

export function OrgTools({ dog, photos }: { dog: Dog; photos: string[] }) {
  const { member, ready } = usePartnerAccess();
  const [cases, setCases] = useState<OrgCase[] | null>(null);
  const [medical, setMedical] = useState<MedicalEvent[]>([]);
  const [timeline, setTimeline] = useState<AnimalTimelineEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  /* The public record carries none of the organisation's private fields;
     they are read here, under the member's session. */
  const [full, setFull] = useState<Dog>(dog);

  const load = useCallback(() => {
    const supa = getSupabase();
    supa?.from("org_case_facts").select("id,case_code,title,condition_class,status_class,occurred_at,last_activity_at,assignee_name")
      .eq("dog_id", dog.id).order("occurred_at", { ascending: false })
      .then(({ data }) => setCases((data ?? []) as OrgCase[]));
    getMedicalEvents(dog.id).then(setMedical).catch(() => {});
    getAnimalTimeline(dog.id).then(setTimeline).catch(() => {});
    supa?.from("dogs").select("name,code,status,intake_notes,owner_name,owner_contact,assignee_id,assignee_name").eq("id", dog.id).maybeSingle()
      .then(({ data }) => { if (data) setFull((d) => ({ ...d, ...(data as Partial<Dog>) })); });
  }, [dog.id]);
  useEffect(() => { if (ready && member) load(); }, [ready, member, load]);
  useEffect(() => { if (window.location.hash === "#org-care") setLogging(true); }, []);

  if (!ready) return null;
  if (!member) return (
    <section className="lr-sec lr-org">
      <header className="lr-sec-head"><p className="lr-sec-n sys-mono">ORG</p><h2>Your organisation&rsquo;s side</h2>
        <p>Cases, care logging, notes and edits appear here for members of the organisation that keeps this animal.</p></header>
    </section>
  );

  const notes = [
    ...medical.filter((m) => m.notes).map((m) => ({ id: `m-${m.id}`, date: m.event_date, title: kindLabel(m.kind), text: m.notes!, by: m.performed_by })),
    ...timeline.filter((t) => t.details).map((t) => ({ id: `t-${t.id}`, date: t.occurred_at, title: t.title, text: t.details!, by: null as string | null })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <section className="lr-sec lr-org" id="org-care">
      <header className="lr-sec-head">
        <p className="lr-sec-n sys-mono">ORG</p>
        <h2>Your organisation&rsquo;s side</h2>
        <p>Only members see this part of the record.</p>
      </header>
      <div className="lr-org-acts">
        <Link href={`/partner/cases/new?dogId=${dog.id}`} className="sys-btn is-flame is-sm"><Plus size={15} /> New case for this animal</Link>
        <button type="button" className="sys-btn is-sm" onClick={() => setLogging((v) => !v)} aria-expanded={logging}><Stethoscope size={15} /> Log care</button>
        <button type="button" className="sys-btn is-quiet is-sm" onClick={() => setEditing((v) => !v)} aria-expanded={editing}><Pencil size={14} /> {editing ? "Close editing" : "Edit the record"}</button>
      </div>
      {logging && <LogCare dogId={dog.id} onDone={() => { setLogging(false); load(); }} />}
      {editing && <EditAnimal key={`${full.code ?? ""}|${full.owner_name ?? ""}|${full.intake_notes ?? ""}`} dog={full} onDone={() => { setEditing(false); load(); }} />}

      <div className="lr-org-grid">
        <div>
          <h3 className="lr-h3">Cases for this animal</h3>
          {cases === null ? <p className="lr-quiet"><Loader2 size={14} className="animate-spin" /> Reading…</p>
            : cases.length === 0 ? <p className="lr-quiet">No cases yet.</p>
            : (
              <ol className="lr-org-cases">
                {cases.map((c) => (
                  <li key={c.id}><Link href={`/partner/cases/${c.id}`}>
                    <span><b>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Case"}</b>
                      <small>{[c.case_code, STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label, c.assignee_name].filter(Boolean).join(" · ")}</small></span>
                    <em className="sys-mono">{day(c.occurred_at)}</em>
                  </Link></li>
                ))}
              </ol>
            )}
          {full.owner_name && <p className="lr-org-owner">Owner or carer: <b>{full.owner_name}</b>{full.owner_contact ? ` · ${full.owner_contact}` : ""}</p>}
          {full.intake_notes && <div className="lr-org-intake"><h3 className="lr-h3">Intake notes</h3><p>{full.intake_notes}</p></div>}
        </div>
        <div>
          <h3 className="lr-h3">Notes on the record</h3>
          {notes.length === 0 ? <p className="lr-quiet">No written notes yet.</p> : (
            <ol className="lr-org-notes">
              {notes.slice(0, 14).map((n) => (
                <li key={n.id}><p className="lr-org-note-h"><b>{n.title}</b><span className="sys-mono">{day(n.date)}</span></p><p>{n.text}</p>{n.by && <small>{n.by}</small>}</li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="lr-org-photos">
          <h3 className="lr-h3">Photographs</h3>
          <div>{photos.map((p, i) => <DogPhoto key={p} src={p} alt={`Photograph ${i + 1}`} seed={`${dog.id}-${i}`} className="lr-org-photo" />)}</div>
        </div>
      )}
      <p className="lr-org-link"><Link href="/partner/animals">All animals <ArrowUpRight size={13} /></Link></p>
    </section>
  );
}

function LogCare({ dogId, onDone }: { dogId: string; onDone: () => void }) {
  const [kind, setKind] = useState("sterilisation");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setError(null);
    try { await addMedicalEvent({ dogId, kind, eventDate: date || null, notes: notes.trim() || undefined, performedBy: by.trim() || undefined }); onDone(); }
    catch (e) { setError((e as Error).message || "Could not save."); } finally { setBusy(false); }
  };
  return (
    <div className="lr-form" role="group" aria-label="Log care">
      <div className="lr-form-row">
        <label><span>What</span><select value={kind} onChange={(e) => setKind(e.target.value)}>{MEDICAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
        <label><span>When</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="is-wide"><span>By</span><input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Vet or field worker" /></label>
      </div>
      <label className="is-wide"><span>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Medicine, dose, findings…" rows={2} /></label>
      {error && <p className="lr-form-err">{error}</p>}
      <button type="button" className="sys-btn is-sm" onClick={submit} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save care</button>
    </div>
  );
}

function EditAnimal({ dog, onDone }: { dog: Dog; onDone: () => void }) {
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
  useEffect(() => { getMyOrgMembers().then(setMembers).catch(() => {}); }, []);
  const save = async () => {
    setBusy(true);
    try {
      const m = members.find((x) => x.user_id === assigneeId);
      await updateAnimal(dog.id, { name: name.trim(), code: code.trim(), status, intakeNotes: notes.trim(), assigneeId: assigneeId || undefined, assigneeName: m?.name ?? undefined });
      await setAnimalOwner(dog.id, ownerName.trim(), ownerContact.trim());
      router.refresh(); onDone();
    } finally { setBusy(false); }
  };
  return (
    <div className="lr-form" role="group" aria-label="Edit the record">
      <div className="lr-form-row">
        <label><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span>Source ID</span><input value={code} onChange={(e) => setCode(e.target.value)} /></label>
        <label><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value as DogStatus)}>{DOG_STATUSES.map((s) => <option key={s} value={s}>{DOG_STATUS_META[s].label}</option>)}</select></label>
        <label><span>Responsible</span><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select></label>
      </div>
      <div className="lr-form-row">
        <label className="is-wide"><span>Owner or carer</span><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Optional" /></label>
        <label className="is-wide"><span>Their contact</span><input value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} placeholder="Kept inside the organisation" /></label>
      </div>
      <label className="is-wide"><span>Intake notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></label>
      <button type="button" className="sys-btn is-sm" onClick={save} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save</button>
    </div>
  );
}
