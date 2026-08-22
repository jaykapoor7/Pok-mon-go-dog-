"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, MapPin, Circle } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { speciesLabel, STATUS_META, isOverdue, type Dog, type Sighting, type Case } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tab = "overview" | "cases" | "timeline" | "photos";

export function AnimalRecord({ dog, sightings, cases }: { dog: Dog; sightings: Sighting[]; cases: Case[] }) {
  const [tab, setTab] = useState<Tab>("overview");
  const st = STATUS_META[dog.status];

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
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
      </div>

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
