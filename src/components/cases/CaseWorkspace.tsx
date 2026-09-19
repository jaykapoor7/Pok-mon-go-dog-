"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Camera, Loader2, Check, CalendarClock, ExternalLink,
  Dog as DogIcon, HeartHandshake,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { CaseControls } from "@/components/cases/CaseControls";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { isNgoMember, uploadPhoto } from "@/lib/actions";
import { addCaseFollowup, addCasePhoto, assignCase, getCaseFollowups, setCaseFollowup, setCaseMedical, updateCaseFollowupStatus, type CaseFollowup } from "@/lib/case-actions";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { formatINR } from "@/lib/fundraisers";
import { speciesLabel, isOverdue, type Case, type CaseStatus, type CaseUpdate } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

function severityBadge(c: Case): { label: string; cls: string } {
  if (isOverdue(c)) return { label: "OVERDUE", cls: "bg-status-injured/15 text-status-injured" };
  if (c.severity === "critical") return { label: "URGENT", cls: "bg-status-injured/15 text-status-injured" };
  if (c.severity === "high") return { label: "HIGH", cls: "bg-status-hungry/20 text-status-hungry" };
  if (c.severity === "low") return { label: "LOW", cls: "bg-bark-100 text-bark-500 dark:bg-bark-800" };
  return { label: "STANDARD", cls: "bg-bark-100 text-bark-500 dark:bg-bark-800" };
}

export function CaseWorkspace({
  c, updates, backHref = "/cases", bare = false,
}: { c: Case; updates: CaseUpdate[]; backHref?: string; bare?: boolean }) {
  const { user } = useAuth();
  const [ngoMember, setNgoMember] = useState(false);
  const [followups, setFollowups] = useState<CaseFollowup[]>([]);
  useEffect(() => { isNgoMember().then(setNgoMember).catch(() => {}); }, [user?.id]);
  useEffect(() => { getCaseFollowups(c.id).then(setFollowups).catch(() => {}); }, [c.id]);
  const canEdit = !!user && (user.id === c.assignee_id || ngoMember);
  const sev = severityBadge(c);
  const H2 = "mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-bark-400";

  return (
    <div className={cn("mx-auto max-w-[1080px]", bare ? "pb-8" : "px-4 pb-32 pt-24 sm:px-6")}>
      <Link href={backHref} className="mb-5 inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-paw-600">
        <ArrowLeft className="h-4 w-4" /> Back to cases
      </Link>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-black/[0.08] pb-5 dark:border-white/[0.1] sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("rounded px-1.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide", sev.cls)}>{sev.label}</span>
            <span className="text-[12px] capitalize text-bark-400">{c.status.replace("_", " ")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">{c.title}</h1>
          <p className="mt-1.5 text-[13px] text-bark-500">
            {speciesLabel(c.species)} · <span className="capitalize">{c.category}</span>
            {c.zone ? ` · ${c.zone}` : ""} · reported {formatDate(c.created_at)}
          </p>
        </div>
      </div>

      {/* Two-column */}
      <div className="mt-7 grid gap-9 lg:grid-cols-[1fr_1.15fr]">
        {/* Left: animal + facts + notes + medical + location */}
        <div className="space-y-7">
          <Photos c={c} canEdit={canEdit} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-black/[0.08] py-4 dark:border-white/[0.1]">
            <Fact k="Location" v={c.zone || "-"} />
            <Fact k="Assigned team" v={canEdit ? <AssignControl c={c} /> : (c.assignee_name ?? "Unassigned")} />
            <Fact k="Species" v={speciesLabel(c.species)} />
            <Fact k="Category" v={<span className="capitalize">{c.category}</span>} />
            {(c.cost_estimate != null || c.cost_spent != null) && (
              <>
                <Fact k="Estimated cost" v={c.cost_estimate != null ? formatINR(c.cost_estimate) : "-"} />
                <Fact k="Spent so far" v={c.cost_spent != null ? formatINR(c.cost_spent) : "-"} />
              </>
            )}
            {c.dog_id && (
              <Fact k="Animal record" v={<Link href={`/partner/animals/${c.dog_id}`} className="inline-flex items-center gap-1 text-paw-600 hover:underline"><DogIcon className="h-3.5 w-3.5" /> Open profile</Link>} />
            )}
          </div>

          {c.description && (
            <section>
              <h2 className={H2}>Field notes</h2>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{c.description}</p>
            </section>
          )}

          <section>
            <h2 className={H2}>Medical</h2>
            <Medical c={c} canEdit={canEdit} />
          </section>

          {c.lat != null && c.lng != null && (
            <section>
              <h2 className={H2}>Location</h2>
              <Location c={c} />
            </section>
          )}
        </div>

        {/* Right: workflow + actions + follow-ups + timeline */}
        <div className="space-y-8">
          <section>
            <h2 className={H2}>Case workflow</h2>
            <CaseStepper status={c.status} />
          </section>

          {c.outcome_note && (
            <section className="rounded-lg border border-status-vaccinated/30 bg-status-vaccinated/10 p-4">
              <h2 className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-status-vaccinated">Outcome</h2>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{c.outcome_note}</p>
            </section>
          )}

          <section>
            <h2 className={H2}>Actions</h2>
            <CaseControls c={c} />
          </section>

          <section>
            <h2 className={H2}>Follow-ups</h2>
            <Followups c={c} canEdit={canEdit} followups={followups} onChanged={() => getCaseFollowups(c.id).then(setFollowups)} />
          </section>

          <section>
            <h2 className={H2}>Activity timeline</h2>
            <CaseTimeline updates={updates} />
          </section>

          {canEdit && (
            <Link href={`/fundraisers/new?title=${encodeURIComponent(c.title)}&case=${c.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-paw-600 hover:underline">
              <HeartHandshake className="h-4 w-4" /> Raise funds for this case
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-bark-400">{k}</div>
      <div className="mt-1 text-[14px] font-medium text-bark-900 dark:text-bark-50">{v}</div>
    </div>
  );
}

function AssignControl({ c }: { c: Case }) {
  const { user } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getMyOrgMembers().then(setMembers).catch(() => {}); }, []);
  async function assign(userId: string) {
    if (!user) return;
    const m = members.find((x) => x.user_id === userId);
    if (!m) return;
    setBusy(true);
    try { await assignCase(c.id, { id: m.user_id, name: m.name }, { id: user.id, name: user.name }); router.refresh(); }
    finally { setBusy(false); }
  }
  return (
    <select value={c.assignee_id ?? ""} onChange={(e) => e.target.value && assign(e.target.value)} disabled={busy}
      className="mt-0.5 rounded-md border border-black/[0.1] bg-transparent px-2 py-1 text-[13px] outline-none focus:border-paw-400 dark:border-white/[0.12]">
      <option value="">Unassigned</option>
      {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === user?.id ? " (you)" : ""}</option>)}
    </select>
  );
}

const CASE_STEPS: { key: CaseStatus; label: string }[] = [
  { key: "unverified", label: "Reported" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
];
function CaseStepper({ status }: { status: CaseStatus }) {
  const current = status === "closed" ? 3 : Math.max(0, CASE_STEPS.findIndex((s) => s.key === status));
  return (
    <div className="flex items-center">
      {CASE_STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span className={cn("grid h-8 w-8 place-items-center rounded-full border-2 text-[12px] font-semibold", i <= current ? "border-paw-500 bg-paw-500 text-white" : "border-bark-200 bg-transparent text-bark-400 dark:border-white/15")}>
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("text-[11.5px]", i <= current ? "font-medium text-bark-700 dark:text-bark-200" : "text-bark-400")}>{s.label}</span>
          </div>
          {i < CASE_STEPS.length - 1 && <div className={cn("mx-2 h-px flex-1 -translate-y-2.5", i < current ? "bg-paw-500" : "bg-bark-200 dark:bg-white/15")} />}
        </div>
      ))}
    </div>
  );
}

function Medical({ c, canEdit }: { c: Case; canEdit: boolean }) {
  const router = useRouter();
  const [notes, setNotes] = useState(c.medical_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    setBusy(true);
    try { await setCaseMedical(c.id, notes.trim()); setSaved(true); router.refresh(); }
    finally { setBusy(false); }
  }
  if (!canEdit) {
    return c.medical_notes
      ? <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{c.medical_notes}</p>
      : <Empty>No medical notes recorded.</Empty>;
  }
  return (
    <div className="space-y-3">
      <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
        placeholder="Condition, diagnosis, treatment given, medication, vaccination, deworming, sterilisation…"
        className="min-h-[120px] w-full resize-y rounded-lg border border-black/[0.1] bg-transparent p-3 text-[14px] leading-relaxed outline-none focus:border-paw-400 dark:border-white/[0.12]" />
      <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {saved ? "Saved" : "Save medical notes"}
      </button>
    </div>
  );
}

function Photos({ c, canEdit }: { c: Case; canEdit: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const url = await uploadPhoto(file); await addCasePhoto(c.id, url); router.refresh(); }
    finally { setBusy(false); }
  }
  const photos = c.photos ?? [];
  return (
    <div>
      <DogPhoto src={photos[0] ?? ""} alt={c.title} seed={c.id} className="aspect-[4/3] w-full rounded-lg" />
      {(photos.length > 1 || canEdit) && (
        <div className="mt-2 grid grid-cols-5 gap-2">
          {photos.slice(1).map((p, i) => (
            <DogPhoto key={i} src={p} alt={`Case photo ${i + 2}`} seed={`${c.id}-${i}`} className="aspect-square rounded-md" />
          ))}
          {canEdit && (
            <button onClick={() => fileRef.current?.click()} disabled={busy}
              className="flex aspect-square items-center justify-center rounded-md border border-dashed border-bark-300 text-bark-400 hover:bg-black/[0.02] dark:border-white/[0.15]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}

function Location({ c }: { c: Case }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-status-hungry/30 bg-status-hungry/[0.08] p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-bark-800 dark:text-bark-100">
          <MapPin className="h-4 w-4 text-status-hungry" /> Catch &amp; return location
        </p>
        <p className="mt-1 text-[13px] text-bark-600 dark:text-bark-300">
          If this animal is moved for treatment, return it to the exact spot it was found, territorial animals depend on it.
        </p>
      </div>
      <a href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-paw-600 hover:underline">
        Open in Maps <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

function Followups({ c, canEdit, followups, onChanged }: { c: Case; canEdit: boolean; followups: CaseFollowup[]; onChanged: () => Promise<void> }) {
  const router = useRouter();
  const [date, setDate] = useState(c.follow_up_at ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() { await onChanged(); router.refresh(); }
  async function save() {
    if (!date) return;
    setBusy(true);
    try { await addCaseFollowup({ caseId: c.id, dogId: c.dog_id, dueAt: date, note }); setNote(""); await refresh(); }
    finally { setBusy(false); }
  }
  async function clear() {
    setBusy(true);
    try { await setCaseFollowup(c.id, null); setDate(""); router.refresh(); }
    finally { setBusy(false); }
  }
  async function setStatus(id: string, status: "done" | "missed" | "cancelled") {
    setBusy(true);
    try { await updateCaseFollowupStatus({ followupId: id, status }); await refresh(); }
    finally { setBusy(false); }
  }

  const overdue = c.follow_up_at && new Date(c.follow_up_at) < new Date();
  const active = followups.filter((f) => !["done","missed","cancelled"].includes(f.status));
  const finished = followups.filter((f) => ["done","missed","cancelled"].includes(f.status));

  return (
    <div className="space-y-4">
      {followups.length > 0 ? (
        <div className="divide-y divide-black/[0.07] border-y border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.1]">
          {[...active, ...finished].slice(0, 8).map((item) => {
            const late = !["done","missed","cancelled"].includes(item.status) && new Date(item.due_at) < new Date();
            const done = item.status === "done";
            return <div key={item.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-bark-800 dark:text-bark-100">{formatDate(item.due_at)}</p>
                  <p className={cn("mt-0.5 text-[11.5px] font-semibold uppercase tracking-wide", done ? "text-emerald-700 dark:text-emerald-300" : late ? "text-status-injured" : "text-bark-400")}>
                    {done ? "Completed" : late ? "Overdue" : item.status.replace("_"," ")}
                  </p>
                </div>
                {canEdit && !["done","missed","cancelled"].includes(item.status) && <div className="flex gap-1.5">
                  <button disabled={busy} onClick={() => setStatus(item.id,"done")} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">Done</button>
                  <button disabled={busy} onClick={() => setStatus(item.id,"missed")} className="rounded-full bg-black/[.04] px-2.5 py-1 text-[11.5px] font-semibold text-bark-500 hover:bg-black/[.07] disabled:opacity-50">Missed</button>
                </div>}
              </div>
              {item.note && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-bark-600 dark:text-bark-300">{item.note}</p>}
            </div>
          })}
        </div>
      ) : c.follow_up_at ? (
        <div className="flex items-center gap-2 text-[14px]">
          <CalendarClock className={cn("h-4 w-4", overdue ? "text-status-injured" : "text-status-hungry")} />
          <span className="font-medium">Follow-up {overdue ? "was due" : "due"} {formatDate(c.follow_up_at)}</span>
        </div>
      ) : <Empty>No follow-up scheduled.</Empty>}

      {canEdit && (
        <div className="grid gap-2 border-t border-black/[.08] pt-4 dark:border-white/[.1]">
          <div className="grid gap-2 sm:grid-cols-[170px_1fr]">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-[14px] outline-none focus:border-paw-400 dark:border-white/[0.12]" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs to happen at this follow-up?"
              className="rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-[14px] outline-none focus:border-paw-400 dark:border-white/[0.12]" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={busy || !date} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add follow-up
            </button>
            {c.follow_up_at && <button onClick={clear} disabled={busy} className="rounded-md px-3 py-2 text-[13px] font-medium text-bark-500 hover:bg-black/[0.04]">Clear case date</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[14px] text-bark-400">{children}</p>;
}
