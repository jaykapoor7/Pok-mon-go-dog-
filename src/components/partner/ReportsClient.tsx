"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { ConsolePage } from "./ConsolePage";
import { ExportStudio } from "@/components/partner/ExportStudio";

const closed = (status: string | null) => ["resolved", "closed"].includes(String(status ?? "").toLowerCase());
const followDone = (status: string | null) => ["done", "completed"].includes(String(status ?? "").toLowerCase());
const followMissed = (status: string | null) => ["missed", "cancelled", "canceled"].includes(String(status ?? "").toLowerCase());
const careMatch = (row: PartnerRecordRow, re: RegExp) => row.kind === "care" && re.test(row.subtype.toLowerCase());
const percent = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;

export function ReportsClient() {
  const [rows, setRows] = useState<PartnerRecordRow[] | null>(null);
  useEffect(() => { getPartnerRecordRows().then(setRows).catch(() => setRows([])); }, []);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const firstYear = currentYear - 2;
    const inWindow = (row: PartnerRecordRow) => {
      const d = new Date(row.date);
      return Number.isFinite(+d) && d.getFullYear() >= firstYear && d.getFullYear() <= currentYear;
    };

    const rescues = all.filter((r) => r.kind === "rescue" && inWindow(r));
    const care = all.filter((r) => r.kind === "care" && inWindow(r));
    const followups = all.filter((r) => r.kind === "follow_up" && inWindow(r));
    const completedRescues = rescues.filter((r) => closed(r.status));

    const treatment = care.filter((r) => careMatch(r, /treat|chemo|tvt|surgery|wound|diagnostic|rehab|medicine|admission/));
    const vaccination = care.filter((r) => careMatch(r, /vaccin|rabies|arv/));
    const sterilisation = care.filter((r) => careMatch(r, /sterili|abc|spay|neuter/));
    const otherCare = Math.max(0, care.length - treatment.length - vaccination.length - sterilisation.length);

    const completedFollowups = followups.filter((r) => followDone(r.status));
    const missedFollowups = followups.filter((r) => followMissed(r.status));
    const pendingFollowups = followups.filter((r) => !followDone(r.status) && !followMissed(r.status));
    const overdue = pendingFollowups.filter((r) => +new Date(r.date) < +now);

    const years = [firstYear, firstYear + 1, currentYear].map((year) => {
      const inYear = (r: PartnerRecordRow) => new Date(r.date).getFullYear() === year;
      return { year, rescue: rescues.filter(inYear).length, care: care.filter(inYear).length };
    });

    const localityCounts = new Map<string, number>();
    for (const row of [...rescues, ...care]) {
      const place = row.locality || "Not recorded";
      localityCounts.set(place, (localityCounts.get(place) ?? 0) + 1);
    }

    return {
      rescues,
      care,
      treatment,
      vaccination,
      sterilisation,
      otherCare,
      completedRescues,
      completionRate: percent(completedRescues.length, rescues.length),
      followups,
      completedFollowups,
      missedFollowups,
      overdue,
      followRate: percent(completedFollowups.length, followups.length),
      years,
      localities: [...localityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      firstYear,
      currentYear,
    };
  }, [rows]);

  if (rows === null) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-paw-500" /></div>;

  const maxYear = Math.max(1, ...stats.years.map((y) => y.rescue + y.care));
  const maxLocality = Math.max(1, ...stats.localities.map(([, n]) => n));
  const careTotal = Math.max(1, stats.care.length);

  return <ConsolePage
    kicker="Field work / analytics"
    title="Operational analytics"
    lede={`Four signals from ${stats.firstYear}–${stats.currentYear}: workload, follow-up reliability, care delivered and where work concentrates.`}
  >
    <ExportStudio />

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label="Rescue cases" value={stats.rescues.length} sub={`${stats.completedRescues.length.toLocaleString()} closed or resolved`} />
      <Kpi label="Case completion" value={`${stats.completionRate}%`} sub="Share of rescue cases closed or resolved" />
      <Kpi label="Follow-up completion" value={`${stats.followRate}%`} sub={`${stats.overdue.length.toLocaleString()} overdue`} />
      <Kpi label="Care events" value={stats.care.length} sub="Traceable intervention records" />
    </section>

    <section className="mt-6 rounded-xl border border-black/[.08] bg-white p-5">
      <h2 className="text-xl font-semibold">Workload by year</h2>
      <p className="mt-1 text-sm text-bark-500">Rescue and care volume for the three meaningful operating years. Imported outlier dates outside this window are not treated as real workload history.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {stats.years.map((y) => {
          const total = y.rescue + y.care;
          return <div key={y.year}>
            <div className="flex items-end justify-between"><b className="text-sm">{y.year}</b><span className="text-xs opacity-55">{total.toLocaleString()} events</span></div>
            <div className="mt-3 flex h-36 items-end gap-2 rounded-lg bg-black/[.025] px-4 pt-4">
              <div className="w-1/2 rounded-t bg-[#2457ce]" style={{ height: `${Math.max(4, (y.rescue / maxYear) * 100)}%` }} title={`${y.rescue} rescues`} />
              <div className="w-1/2 rounded-t bg-[#f05b40]" style={{ height: `${Math.max(4, (y.care / maxYear) * 100)}%` }} title={`${y.care} care events`} />
            </div>
            <div className="mt-2 flex justify-between text-xs"><span>Rescue <b>{y.rescue.toLocaleString()}</b></span><span>Care <b>{y.care.toLocaleString()}</b></span></div>
          </div>;
        })}
      </div>
      <div className="mt-4 flex gap-5 text-xs"><Legend color="#2457ce" label="Rescue" /><Legend color="#f05b40" label="Care" /></div>
    </section>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-black/[.08] bg-white p-5">
        <h2 className="text-xl font-semibold">Follow-up performance</h2>
        <p className="mt-1 text-sm text-bark-500">Excel can list review dates. This shows whether the follow-up system is actually being completed.</p>
        <div className="mt-6 h-4 overflow-hidden rounded-full bg-black/[.06]"><div className="flex h-full"><Segment value={stats.completedFollowups.length} total={stats.followups.length} color="#2457ce" /><Segment value={stats.missedFollowups.length} total={stats.followups.length} color="#b7bec8" /><Segment value={stats.overdue.length} total={stats.followups.length} color="#f05b40" /></div></div>
        <div className="mt-5 grid grid-cols-3 gap-3"><Mini label="Completed" value={stats.completedFollowups.length} /><Mini label="Missed / cancelled" value={stats.missedFollowups.length} /><Mini label="Overdue" value={stats.overdue.length} /></div>
      </section>

      <section className="rounded-xl border border-black/[.08] bg-white p-5">
        <h2 className="text-xl font-semibold">Care delivered</h2>
        <p className="mt-1 text-sm text-bark-500">The care categories field teams already record, turned into defensible traceable totals.</p>
        <div className="mt-5"><CareBar label="Treatment / medical" value={stats.treatment.length} total={careTotal} /><CareBar label="Rabies / vaccination" value={stats.vaccination.length} total={careTotal} /><CareBar label="ABC / sterilisation" value={stats.sterilisation.length} total={careTotal} />{stats.otherCare > 0 && <CareBar label="Other care" value={stats.otherCare} total={careTotal} />}</div>
      </section>
    </div>

    <section className="mt-6 rounded-xl border border-black/[.08] bg-white p-5">
      <h2 className="text-xl font-semibold">Where workload concentrates</h2>
      <p className="mt-1 text-sm text-bark-500">Top localities across the same three-year window. This helps allocate vans, volunteers and field time; it is not a population estimate.</p>
      <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">{stats.localities.map(([place, n]) => <LocalityBar key={place} label={place} value={n} max={maxLocality} />)}</div>
    </section>
  </ConsolePage>;
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub: string }) { return <div className="rounded-xl border border-black/[.08] bg-white p-4"><strong className="text-3xl tabular-nums tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</strong><span className="mt-1 block text-sm font-semibold">{label}</span><small className="mt-1 block text-xs leading-5 text-bark-500">{sub}</small></div>; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-2"><i className="size-2.5 rounded-sm" style={{ background: color }} />{label}</span>; }
function Segment({ value, total, color }: { value: number; total: number; color: string }) { return <div style={{ width: `${percent(value, Math.max(1, total))}%`, background: color }} />; }
function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-black/[.025] p-3"><b className="text-xl tabular-nums">{value.toLocaleString()}</b><span className="mt-1 block text-[11px] font-semibold leading-4">{label}</span></div>; }
function CareBar({ label, value, total }: { label: string; value: number; total: number }) { const p = percent(value, total); return <div className="mt-4"><div className="flex justify-between gap-3 text-xs"><span>{label}</span><b>{value.toLocaleString()} · {p}%</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[#2457ce]" style={{ width: `${p}%` }} /></div></div>; }
function LocalityBar({ label, value, max }: { label: string; value: number; max: number }) { const p = percent(value, max); return <div><div className="flex justify-between gap-4 text-xs"><span className="truncate capitalize">{label}</span><b>{value.toLocaleString()}</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[#0b1e3d]" style={{ width: `${Math.max(3, p)}%` }} /></div></div>; }
