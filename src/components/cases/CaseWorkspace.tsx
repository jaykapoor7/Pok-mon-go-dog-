"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Camera,
  Loader2,
  Check,
  CalendarClock,
  ExternalLink,
  Dog as DogIcon,
  HeartHandshake,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { CaseControls } from "@/components/cases/CaseControls";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { isNgoMember, uploadPhoto } from "@/lib/actions";
import { setCaseMedical, addCasePhoto, setCaseFollowup, assignCase } from "@/lib/case-actions";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { formatINR } from "@/lib/fundraisers";
import { speciesLabel, isOverdue, type Case, type CaseStatus, type CaseUpdate } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tab = "overview" | "medical" | "photos" | "timeline" | "location" | "followups";

function statusTone(c: Case): { dot: string; label: string } {
  if (isOverdue(c)) return { dot: "bg-status-injured", label: "Overdue" };
  const map: Record<CaseStatus, { dot: string; label: string }> = {
    unverified: { dot: "bg-bark-300", label: "New" },
    assigned: { dot: "bg-status-hungry", label: "Assigned" },
    in_progress: { dot: "bg-paw-500", label: "In progress" },
    resolved: { dot: "bg-status-vaccinated", label: "Resolved" },
    closed: { dot: "bg-bark-300", label: "Closed" },
  };
  return map[c.status];
}

export function CaseWorkspace({
  c,
  updates,
  backHref = "/cases",
  bare = false,
}: {
  c: Case;
  updates: CaseUpdate[];
  backHref?: string;
  bare?: boolean;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [ngoMember, setNgoMember] = useState(false);

  useEffect(() => {
    isNgoMember().then(setNgoMember).catch(() => {});
  }, [user?.id]);

  const canEdit = !!user && (user.id === c.assignee_id || ngoMember);
  const tone = statusTone(c);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "medical", label: "Medical" },
    { key: "photos", label: "Photos" },
    { key: "timeline", label: "Timeline" },
    { key: "location", label: "Location" },
    { key: "followups", label: "Follow-ups" },
  ];

  return (
    <div className={cn("mx-auto max-w-3xl", bare ? "pb-8" : "px-4 pb-32 pt-24 sm:px-6")}>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-paw-600">
        <ArrowLeft className="h-4 w-4" /> Cases
      </Link>

      {/* Identity strip — not a card; a clean header row */}
      <div className="flex items-start gap-4 border-b border-black/[0.08] pb-5 dark:border-white/[0.1]">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-bark-100 dark:bg-bark-800">
          <DogPhoto src={c.photos?.[0] ?? ""} alt={c.title} seed={c.id} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
            <span className="text-[13px] font-medium text-bark-500">{tone.label}</span>
            <span className="text-[13px] text-bark-300">·</span>
            <span className="text-[13px] capitalize text-bark-500">{c.severity}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-bark-900 dark:text-bark-50">
            {c.title}
          </h1>
          <p className="mt-1 text-[13px] text-bark-500">
            {speciesLabel(c.species)}
            {c.zone ? ` · ${c.zone}` : ""} · opened {formatDate(c.created_at)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-scrollbar -mx-1 mt-4 mb-5 flex gap-1 overflow-x-auto px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === t.key ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview c={c} canEdit={canEdit} />}
      {tab === "medical" && <Medical c={c} canEdit={canEdit} />}
      {tab === "photos" && <Photos c={c} canEdit={canEdit} />}
      {tab === "timeline" && <CaseTimeline updates={updates} />}
      {tab === "location" && <Location c={c} />}
      {tab === "followups" && <Followups c={c} canEdit={canEdit} />}
    </div>
  );
}

// ── Overview: a definition list + description + the action controls ──
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.06] py-2.5 last:border-0 dark:border-white/[0.06]">
      <span className="text-[13px] text-bark-500">{label}</span>
      <span className="text-right text-[14px] font-medium text-bark-900 dark:text-bark-50">{children}</span>
    </div>
  );
}

// Reassign a case to a teammate.
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
    try {
      await assignCase(c.id, { id: m.user_id, name: m.name }, { id: user.id, name: user.name });
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <select
      value={c.assignee_id ?? ""}
      onChange={(e) => e.target.value && assign(e.target.value)}
      disabled={busy}
      className="rounded-md border border-black/[0.1] bg-transparent px-2 py-1 text-[13px] outline-none focus:border-paw-400 dark:border-white/[0.12]"
    >
      <option value="">Unassigned</option>
      {members.map((m) => (
        <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === user?.id ? " (you)" : ""}</option>
      ))}
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
            <span className={cn("grid h-7 w-7 place-items-center rounded-full border-2 text-[12px] font-semibold", i <= current ? "border-paw-500 bg-paw-500 text-white" : "border-bark-200 bg-transparent text-bark-400 dark:border-white/15")}>
              {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("text-[11px]", i <= current ? "font-medium text-bark-700 dark:text-bark-200" : "text-bark-400")}>{s.label}</span>
          </div>
          {i < CASE_STEPS.length - 1 && <div className={cn("mx-2 h-px flex-1 -translate-y-2.5", i < current ? "bg-paw-500" : "bg-bark-200 dark:bg-white/15")} />}
        </div>
      ))}
    </div>
  );
}

function Overview({ c, canEdit }: { c: Case; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <CaseStepper status={c.status} />
      <div>
        <Row label="Species">{speciesLabel(c.species)}</Row>
        <Row label="Category"><span className="capitalize">{c.category}</span></Row>
        <Row label="Severity"><span className="capitalize">{c.severity}</span></Row>
        <Row label="Assignee">
          {canEdit ? <AssignControl c={c} /> : (c.assignee_name ?? <span className="text-bark-400">Unassigned</span>)}
        </Row>
        <Row label="Opened">{formatDate(c.created_at)}</Row>
        {(c.cost_estimate != null || c.cost_spent != null) && (
          <>
            <Row label="Estimated cost">{c.cost_estimate != null ? formatINR(c.cost_estimate) : "—"}</Row>
            <Row label="Spent so far">{c.cost_spent != null ? formatINR(c.cost_spent) : "—"}</Row>
          </>
        )}
        {c.dog_id && (
          <Row label="Animal">
            <Link href={`/dog/${c.dog_id}`} className="inline-flex items-center gap-1 text-paw-600 hover:underline">
              <DogIcon className="h-3.5 w-3.5" /> Profile
            </Link>
          </Row>
        )}
      </div>

      {c.description && (
        <div>
          <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-bark-400">Description</h2>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{c.description}</p>
        </div>
      )}

      {c.outcome_note && (
        <div>
          <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-bark-400">Outcome</h2>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{c.outcome_note}</p>
        </div>
      )}

      {/* actions (claim / status / resolve / notes / cost) */}
      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-bark-400">Actions</h2>
        <CaseControls c={c} />
      </div>

      {canEdit && (
        <Link
          href={`/fundraisers/new?title=${encodeURIComponent(c.title)}&case=${c.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-paw-600 hover:underline"
        >
          <HeartHandshake className="h-4 w-4" /> Raise funds for this case
        </Link>
      )}
    </div>
  );
}

// ── Medical ──
function Medical({ c, canEdit }: { c: Case; canEdit: boolean }) {
  const router = useRouter();
  const [notes, setNotes] = useState(c.medical_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await setCaseMedical(c.id, notes.trim());
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return c.medical_notes ? (
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{c.medical_notes}</p>
    ) : (
      <Empty>No medical notes recorded.</Empty>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
        placeholder="Condition, diagnosis, treatment given, medication, vaccination, sterilisation status…"
        className="min-h-[180px] w-full resize-y rounded-lg border border-black/[0.1] bg-transparent p-3 text-[14px] leading-relaxed outline-none focus:border-paw-400 dark:border-white/[0.12]"
      />
      <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {saved ? "Saved" : "Save medical notes"}
      </button>
    </div>
  );
}

// ── Photos ──
function Photos({ c, canEdit }: { c: Case; canEdit: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadPhoto(file);
      await addCasePhoto(c.id, url);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const photos = c.photos ?? [];
  return (
    <div>
      {photos.length === 0 && !canEdit && <Empty>No photos yet.</Empty>}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <DogPhoto key={i} src={p} alt={`Case photo ${i + 1}`} seed={`${c.id}-${i}`} className="aspect-square rounded-lg" />
        ))}
        {canEdit && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-bark-300 text-bark-400 hover:bg-black/[0.02] dark:border-white/[0.15]"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}

// ── Location ──
function Location({ c }: { c: Case }) {
  if (c.lat == null || c.lng == null) {
    return <Empty>No location recorded for this case.</Empty>;
  }
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-status-hungry/30 bg-status-hungry/[0.08] p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-bark-800 dark:text-bark-100">
          <MapPin className="h-4 w-4 text-status-hungry" /> Catch &amp; return location
        </p>
        <p className="mt-1 text-[13px] text-bark-600 dark:text-bark-300">
          If this animal is moved for treatment, return it to the exact spot it was found — territorial animals depend on it.
        </p>
      </div>
      {c.zone && <Row label="Area">{c.zone}</Row>}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-paw-600 hover:underline"
      >
        Open in Maps <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

// ── Follow-ups ──
function Followups({ c, canEdit }: { c: Case; canEdit: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState(c.follow_up_at ?? "");
  const [busy, setBusy] = useState(false);

  async function save(value: string | null) {
    setBusy(true);
    try {
      await setCaseFollowup(c.id, value);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const overdue = c.follow_up_at && new Date(c.follow_up_at) < new Date();

  return (
    <div className="space-y-4">
      {c.follow_up_at ? (
        <div className="flex items-center gap-2 text-[14px]">
          <CalendarClock className={cn("h-4 w-4", overdue ? "text-status-injured" : "text-status-hungry")} />
          <span className="font-medium">Follow-up {overdue ? "was due" : "due"} {formatDate(c.follow_up_at)}</span>
        </div>
      ) : (
        <Empty>No follow-up scheduled.</Empty>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-[14px] outline-none focus:border-paw-400 dark:border-white/[0.12]"
          />
          <button onClick={() => save(date || null)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Set
          </button>
          {c.follow_up_at && (
            <button onClick={() => save(null)} disabled={busy} className="rounded-md px-3 py-2 text-[13px] font-medium text-bark-500 hover:bg-black/[0.04]">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-[14px] text-bark-400">{children}</p>;
}
