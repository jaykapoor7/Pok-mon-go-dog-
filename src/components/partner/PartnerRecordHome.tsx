"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyAnimals } from "@/lib/animal-actions";
import { programmeBreakdown, type Breakdown } from "@/lib/campaigns";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { getSurveys } from "@/lib/surveys";
import type { Survey } from "@/lib/types";

type Counts = {
  rescues: number;
  openRescues: number;
  completed: number;
  care: number;
  vaccination: number;
  sterilisation: number;
  treatment: number;
  followups: number;
  outcomes: number;
  localities: number;
};

const careMatch = (row: PartnerRecordRow, term: RegExp) => row.kind === "care" && term.test(row.subtype.toLowerCase());

function derive(rows: PartnerRecordRow[]): Counts {
  const rescueRows = rows.filter((row) => row.kind === "rescue");
  return {
    rescues: rescueRows.length,
    openRescues: rescueRows.filter((row) => !["resolved", "closed"].includes(String(row.status).toLowerCase())).length,
    completed: rescueRows.filter((row) => ["resolved", "closed"].includes(String(row.status).toLowerCase())).length,
    care: rows.filter((row) => row.kind === "care").length,
    vaccination: rows.filter((row) => careMatch(row, /vaccin|rabies|arv/)).length,
    sterilisation: rows.filter((row) => careMatch(row, /sterili|abc|spay|neuter/)).length,
    treatment: rows.filter((row) => careMatch(row, /treat|wound|surgery|chemo|diagnostic|rehab|checkup|rescue/)).length,
    followups: rows.filter((row) => row.kind === "follow_up").length,
    outcomes: rows.filter((row) => row.kind === "outcome").length,
    localities: new Set(rows.map((row) => row.locality?.trim().toLowerCase()).filter(Boolean)).size,
  };
}

function RegisterRow({ href, title, count, detail }: { href: string; title: string; count: number | string; detail: string }) {
  return <Link href={href} className="grid gap-2 border-b border-black/[.08] py-4 transition hover:bg-black/[.02] dark:border-white/[.08] dark:hover:bg-white/[.03] sm:grid-cols-[220px_90px_minmax(0,1fr)_20px] sm:items-center">
    <b className="text-sm text-bark-900 dark:text-bark-50">{title}</b>
    <span className="text-2xl font-semibold tabular-nums tracking-tight text-bark-900 dark:text-bark-50">{typeof count === "number" ? count.toLocaleString() : count}</span>
    <span className="text-xs leading-relaxed text-bark-500">{detail}</span>
    <ArrowUpRight size={15} className="hidden text-paw-600 sm:block" />
  </Link>;
}

export function PartnerRecordHome() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<PartnerRecordRow[] | null>(null);
  const [animals, setAnimals] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);

  useEffect(() => {
    if (!ready || !user) return;
    Promise.all([getPartnerRecordRows(), getMyAnimals(), programmeBreakdown(), getSurveys()])
      .then(([records, animalRows, bd, studyRows]) => {
        setRows(records);
        setAnimals(animalRows.length);
        setBreakdown(bd);
        setSurveys(studyRows);
      })
      .catch(() => { setRows([]); setAnimals(0); setSurveys([]); });
  }, [ready, user?.id]);

  const counts = useMemo(() => derive(rows ?? []), [rows]);
  const driveCount = breakdown?.drives.length ?? 0;
  const activeDrives = breakdown?.drives.filter((drive) => !drive.archived).length ?? 0;

  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-5 border-b border-black/[.09] pb-6 dark:border-white/[.1] sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paw-600">Organisation workspace</span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-bark-900 dark:text-bark-50 sm:text-3xl">Your field record</h1>
        <p className="mt-2 text-sm leading-relaxed text-bark-500">Everything your organisation records, organised the same way field teams work: rescue, care, review, outcome and programme.</p>
      </div>
      <Link href="/partner/records" className="btn-primary min-h-11 px-4"><Search size={15} /> Search all records</Link>
    </header>

    <section className="mt-8" aria-labelledby="current-work">
      <div className="mb-2 flex items-end justify-between gap-4"><div><span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bark-400">Current work</span><h2 id="current-work" className="mt-1 text-lg font-semibold text-bark-900 dark:text-bark-50">What needs attention</h2></div></div>
      <div className="border-t border-black/[.09] dark:border-white/[.1]">
        <RegisterRow href="/partner/records?view=rescue" title="Open rescue cases" count={rows === null ? "—" : counts.openRescues} detail="Rescue requests not yet closed or resolved." />
        <RegisterRow href="/partner/records?view=follow_up" title="Follow-ups and reviews" count={rows === null ? "—" : counts.followups} detail="Appointments, review dates, repeat doses, dressings and checks." />
        <RegisterRow href="/partner/drives" title="Active drives" count={rows === null ? "—" : activeDrives} detail="ABC, rabies, census and other field programmes currently running." />
      </div>
    </section>

    <section className="mt-10" aria-labelledby="registers">
      <div className="mb-2"><span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bark-400">Registers</span><h2 id="registers" className="mt-1 text-lg font-semibold text-bark-900 dark:text-bark-50">Browse the work your team has done</h2><p className="mt-1 text-xs text-bark-500">Every total opens the records behind it.</p></div>
      <div className="border-t border-black/[.09] dark:border-white/[.1]">
        <RegisterRow href="/partner/records?view=rescue" title="Rescue register" count={rows === null ? "—" : counts.rescues} detail="Intake, condition, locality, rescue plan and case status." />
        <RegisterRow href="/partner/records?view=care" title="Care and treatment" count={rows === null ? "—" : counts.care} detail="All recorded interventions linked back to the animal." />
        <RegisterRow href="/partner/records?view=vaccination" title="Rabies / vaccination" count={rows === null ? "—" : counts.vaccination} detail="Explicit vaccine and ARV administrations, separated from mere mentions." />
        <RegisterRow href="/partner/records?view=sterilisation" title="ABC / sterilisation" count={rows === null ? "—" : counts.sterilisation} detail="Animal-level sterilisation records and programme work." />
        <RegisterRow href="/partner/records?view=treatment" title="Treatment work" count={rows === null ? "—" : counts.treatment} detail="Treatment, TVT, wound care, surgery, diagnostics and rehabilitation." />
        <RegisterRow href="/partner/records?view=outcome" title="Completed outcomes" count={rows === null ? "—" : counts.outcomes || counts.completed} detail="Released, recovered, adopted, fostered, transferred and other recorded outcomes." />
        <RegisterRow href="/partner/animals" title="Animal register" count={animals ?? "—"} detail="Every animal your organisation has on the record." />
      </div>
    </section>

    <section className="mt-10" aria-labelledby="programmes">
      <div className="mb-2"><span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bark-400">Programmes and evidence</span><h2 id="programmes" className="mt-1 text-lg font-semibold text-bark-900 dark:text-bark-50">Work beyond individual cases</h2></div>
      <div className="border-t border-black/[.09] dark:border-white/[.1]">
        <RegisterRow href="/partner/drives" title="Drives and programmes" count={driveCount} detail="ABC, vaccination, rescue, treatment and other campaign-level work." />
        <RegisterRow href="/surveys" title="Studies and surveys" count={surveys.length} detail="Census, ward studies, questionnaires and structured field collection." />
        <RegisterRow href="/partner/map" title="Localities covered" count={rows === null ? "—" : counts.localities} detail="Where rescue and care records concentrate, shown against the field map." />
        <RegisterRow href="/partner/reports" title="Reports and analysis" count="→" detail="Operational reporting built from the registers above, not generic dashboard charts." />
      </div>
    </section>
  </main>;
}
