"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { isClosedStatus, isMissingOrEscaped, isNoAction, rescueCategory } from "@/lib/rescue-taxonomy";
import { ConsolePage } from "./ConsolePage";
import { ExportStudio } from "@/components/partner/ExportStudio";

const followDone = (status: string | null) => ["done", "completed", "cancelled", "canceled", "missed"].includes(String(status ?? "").toLowerCase());
const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;

export function ReportsClient() {
  const [rows, setRows] = useState<PartnerRecordRow[] | null>(null);
  useEffect(() => { getPartnerRecordRows().then(setRows).catch(() => setRows([])); }, []);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const rescues = all.filter((r) => r.kind === "rescue");
    const care = all.filter((r) => r.kind === "care");
    const followups = all.filter((r) => r.kind === "follow_up");
    const outcomes = all.filter((r) => r.kind === "outcome");
    const open = rescues.filter((r) => !isClosedStatus(r.status));
    const noAction = outcomes.filter((r) => isNoAction(r));
    const missing = outcomes.filter((r) => isMissingOrEscaped(r));
    const pendingFollowups = followups.filter((r) => !followDone(r.status));
    const overdue = pendingFollowups.filter((r) => +new Date(r.date) < +new Date());

    const categoryCounts = new Map<string, number>();
    const categoryLocality = new Map<string, { category: string; locality: string; count: number }>();
    for (const row of rescues) {
      const category = rescueCategory(row);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      if (row.locality) {
        const key = `${category}|||${row.locality.toLowerCase()}`;
        const entry = categoryLocality.get(key) ?? { category, locality: row.locality, count: 0 };
        entry.count += 1;
        categoryLocality.set(key, entry);
      }
    }

    const noActionByLocality = new Map<string, { total: number; noAction: number }>();
    for (const row of rescues) {
      const key = row.locality || "Not recorded";
      const entry = noActionByLocality.get(key) ?? { total: 0, noAction: 0 };
      entry.total += 1;
      noActionByLocality.set(key, entry);
    }
    for (const row of noAction) {
      const key = row.locality || "Not recorded";
      const entry = noActionByLocality.get(key) ?? { total: 0, noAction: 0 };
      entry.noAction += 1;
      noActionByLocality.set(key, entry);
    }

    const followByLocality = new Map<string, { pending: number; overdue: number }>();
    for (const row of pendingFollowups) {
      const key = row.locality || "Not recorded";
      const entry = followByLocality.get(key) ?? { pending: 0, overdue: 0 };
      entry.pending += 1;
      if (+new Date(row.date) < +new Date()) entry.overdue += 1;
      followByLocality.set(key, entry);
    }

    const rescueByAnimal = new Map<string, { count: number; label: string; locality: string | null }>();
    for (const row of rescues) {
      if (!row.animalId) continue;
      const entry = rescueByAnimal.get(row.animalId) ?? { count: 0, label: row.animalLabel || row.straypawId || "Animal", locality: row.locality };
      entry.count += 1;
      rescueByAnimal.set(row.animalId, entry);
    }

    const careKinds = new Map<string, number>();
    for (const row of care) {
      const t = row.subtype.toLowerCase();
      const label = /vaccin|rabies|arv/.test(t) ? "Rabies / vaccination" : /sterili|abc|spay|neuter/.test(t) ? "ABC / sterilisation" : /chemo|tvt/.test(t) ? "TVT / chemotherapy" : /surgery/.test(t) ? "Surgery / procedure" : /wound|dressing/.test(t) ? "Wound care" : "Treatment / medical";
      careKinds.set(label, (careKinds.get(label) ?? 0) + 1);
    }

    return {
      rescues, care, followups, outcomes, open, noAction, missing, overdue,
      completed: rescues.filter((r) => isClosedStatus(r.status)),
      categories: [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
      clusters: [...categoryLocality.values()].filter((r) => r.count >= 2).sort((a, b) => b.count - a.count).slice(0, 10),
      noActionPlaces: [...noActionByLocality.entries()].map(([name, v]) => ({ name, ...v, rate: pct(v.noAction, v.total) })).filter((r) => r.noAction > 0).sort((a, b) => b.noAction - a.noAction || b.rate - a.rate).slice(0, 8),
      followPlaces: [...followByLocality.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.overdue - a.overdue || b.pending - a.pending).slice(0, 8),
      repeatAnimals: [...rescueByAnimal.values()].filter((r) => r.count > 1).sort((a, b) => b.count - a.count).slice(0, 8),
      repeatCount: [...rescueByAnimal.values()].filter((r) => r.count > 1).length,
      careKinds: [...careKinds.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [rows]);

  if (rows === null) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-paw-500" /></div>;
  const maxCategory = Math.max(1, ...stats.categories.map(([, n]) => n));
  const maxCare = Math.max(1, ...stats.careKinds.map(([, n]) => n));

  return <ConsolePage kicker="Reports / analytics" title="Questions Excel cannot answer quickly" lede="Condition, place, follow-up and outcome are analysed together. These are operational signals from your own records, not population estimates.">
    <ExportStudio />

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label="Rescue cases" value={stats.rescues.length} sub={`${stats.open.length.toLocaleString()} still open / in progress`} />
      <Kpi label="Closed without intervention" value={stats.noAction.length} sub="No action / not attended outcomes" />
      <Kpi label="Overdue follow-ups" value={stats.overdue.length} sub="Reviews or appointments needing attention" />
      <Kpi label="Repeat animals" value={stats.repeatCount} sub="Animals linked to multiple rescue cases" />
    </section>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <Panel title="What problems recur?" lede="The rescue categories field teams actually record, normalised for spelling and case." >
        {stats.categories.map(([name, count]) => <Bar key={name} label={name} value={count} max={maxCategory}/>) }
      </Panel>

      <Panel title="Where do specific problems cluster?" lede="Repeated condition × locality combinations. This turns a register into a field-planning signal.">
        <div className="divide-y divide-black/[.06]">{stats.clusters.length ? stats.clusters.map((row, i) => <Rank key={`${row.category}-${row.locality}`} index={i} title={`${row.category} · ${row.locality}`} detail={`${row.count} rescue cases`} />) : <Empty text="No repeated condition/locality clusters yet."/>}</div>
      </Panel>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <Panel title="Where are cases ending without intervention?" lede="Localities with no-action / not-attended outcomes. High counts are a signal to inspect capacity, access or intake quality.">
        <div className="divide-y divide-black/[.06]">{stats.noActionPlaces.length ? stats.noActionPlaces.map((row, i) => <Rank key={row.name} index={i} title={row.name} detail={`${row.noAction} no-action outcomes · ${row.rate}% of recorded rescues`} />) : <Empty text="No no-action outcomes are recorded."/>}</div>
      </Panel>

      <Panel title="Where is follow-up workload building?" lede="Pending reviews and appointments grouped by locality, with overdue work first.">
        <div className="divide-y divide-black/[.06]">{stats.followPlaces.length ? stats.followPlaces.map((row, i) => <Rank key={row.name} index={i} title={row.name} detail={`${row.overdue} overdue · ${row.pending} pending`} />) : <Empty text="No pending follow-up workload is recorded."/>}</div>
      </Panel>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <Panel title="Which animals keep re-entering rescue?" lede="Multiple rescue cases linked to one permanent animal identity can reveal recurrence after previous intervention.">
        <div className="divide-y divide-black/[.06]">{stats.repeatAnimals.length ? stats.repeatAnimals.map((row, i) => <Rank key={`${row.label}-${i}`} index={i} title={row.label} detail={`${row.count} rescue cases${row.locality ? ` · ${row.locality}` : ""}`} />) : <Empty text="No repeat rescue animals are currently linked."/>}</div>
      </Panel>

      <Panel title="What care was actually delivered?" lede="Traceable treatment categories from native care events, not manual monthly summary cells.">
        {stats.careKinds.map(([name, count]) => <Bar key={name} label={name} value={count} max={maxCare}/>) }
      </Panel>
    </div>

    <section className="mt-6 rounded-xl border border-black/[.08] bg-[#f7f5ef] p-5"><h2 className="text-sm font-semibold">Outcome watch</h2><p className="mt-1 text-xs leading-5 text-bark-500">{stats.missing.length.toLocaleString()} outcome records mention missing, escaped or unable-to-catch animals. Open the Map to see whether those outcomes concentrate geographically rather than treating them as isolated spreadsheet rows.</p></section>
  </ConsolePage>;
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub: string }) { return <div className="rounded-xl border border-black/[.08] bg-white p-4"><strong className="text-3xl tabular-nums tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</strong><span className="mt-1 block text-sm font-semibold">{label}</span><small className="mt-1 block text-xs leading-5 text-bark-500">{sub}</small></div>; }
function Panel({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) { return <section className="rounded-xl border border-black/[.08] bg-white p-5"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-bark-500">{lede}</p><div className="mt-5">{children}</div></section>; }
function Bar({ label, value, max }: { label: string; value: number; max: number }) { return <div className="mt-4"><div className="flex justify-between gap-3 text-xs"><span>{label}</span><b>{value.toLocaleString()}</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[#2457ce]" style={{ width: `${Math.max(3, (value / max) * 100)}%` }}/></div></div>; }
function Rank({ index, title, detail }: { index: number; title: string; detail: string }) { return <div className="grid grid-cols-[24px_1fr] gap-3 py-3"><span className="text-xs opacity-40">#{index + 1}</span><span><b className="block text-sm">{title}</b><small className="mt-0.5 block text-xs text-bark-500">{detail}</small></span></div>; }
function Empty({ text }: { text: string }) { return <p className="py-3 text-sm text-bark-500">{text}</p>; }
