"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CalendarClock, MapPin, Search, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyAnimals } from "@/lib/animal-actions";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { isClosedStatus, isNoAction, rescueCategory } from "@/lib/rescue-taxonomy";

const followDone = (status: string | null) => ["done", "completed", "cancelled", "canceled", "missed"].includes(String(status ?? "").toLowerCase());
const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;

export function PartnerRecordHome() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<PartnerRecordRow[] | null>(null);
  const [animals, setAnimals] = useState(0);

  useEffect(() => {
    if (!ready || !user) return;
    Promise.all([getPartnerRecordRows(), getMyAnimals()])
      .then(([r, a]) => { setRows(r); setAnimals(a.length); })
      .catch(() => { setRows([]); setAnimals(0); });
  }, [ready, user?.id]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const now = new Date();
    const rescues = all.filter((r) => r.kind === "rescue");
    const outcomes = all.filter((r) => r.kind === "outcome");
    const followups = all.filter((r) => r.kind === "follow_up");
    const open = rescues.filter((r) => !isClosedStatus(r.status));
    const closed = rescues.filter((r) => isClosedStatus(r.status));
    const noAction = outcomes.filter((r) => isNoAction({ title: r.title, detail: r.detail, subtype: r.subtype, status: r.status }));

    const overdue = followups.filter((r) => !followDone(r.status) && +new Date(r.date) < +now);
    const next7 = followups.filter((r) => !followDone(r.status) && +new Date(r.date) >= +now && +new Date(r.date) <= +now + 7 * 86400000);

    const categories = new Map<string, number>();
    for (const row of rescues) {
      const key = rescueCategory(row);
      categories.set(key, (categories.get(key) ?? 0) + 1);
    }

    const locality = new Map<string, { total: number; open: number; noAction: number }>();
    for (const row of rescues) {
      const key = row.locality || "Not recorded";
      const value = locality.get(key) ?? { total: 0, open: 0, noAction: 0 };
      value.total += 1;
      if (!isClosedStatus(row.status)) value.open += 1;
      locality.set(key, value);
    }
    for (const row of noAction) {
      const key = row.locality || "Not recorded";
      const value = locality.get(key) ?? { total: 0, open: 0, noAction: 0 };
      value.noAction += 1;
      locality.set(key, value);
    }

    const rescueByAnimal = new Map<string, number>();
    for (const row of rescues) if (row.animalId) rescueByAnimal.set(row.animalId, (rescueByAnimal.get(row.animalId) ?? 0) + 1);
    const repeatAnimals = [...rescueByAnimal.values()].filter((n) => n > 1).length;

    return {
      rescues,
      open,
      closed,
      noAction,
      overdue,
      next7,
      completion: pct(closed.length, rescues.length),
      repeatAnimals,
      categories: [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      localities: [...locality.entries()]
        .map(([name, value]) => ({ name, ...value, score: value.open * 3 + value.noAction * 2 + value.total * .15 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    };
  }, [rows]);

  if (rows === null) return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-bark-500">Loading organisation dashboard…</main>;
  const maxCategory = Math.max(1, ...stats.categories.map(([, n]) => n));

  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-black/[.09] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-paw-600">Organisation dashboard</span><h1 className="mt-1 text-3xl font-semibold tracking-tight">What needs attention</h1><p className="mt-2 max-w-2xl text-sm text-bark-500">Open work, follow-ups and places where cases are not reaching intervention. Detailed rows stay in Records; spatial patterns stay on the Map.</p></div>
      <Link href="/partner/records" className="btn-primary min-h-11 px-4"><Search size={15}/>Open records</Link>
    </header>

    <section className="mt-6 grid gap-3 md:grid-cols-3">
      <ActionCard icon={<AlertTriangle size={17}/>} label="Open / in-progress rescues" value={stats.open.length} detail="Cases that have not reached a closed outcome." href="/partner/records?view=rescue" urgent={stats.open.length > 0}/>
      <ActionCard icon={<CalendarClock size={17}/>} label="Overdue follow-ups" value={stats.overdue.length} detail={`${stats.next7.length} more due in the next 7 days.`} href="/partner/records?view=overdue" urgent={stats.overdue.length > 0}/>
      <ActionCard icon={<TriangleAlert size={17}/>} label="Closed without intervention" value={stats.noAction.length} detail="Cases recorded as no action / not attended. A direct signal of unmet field demand." href="/partner/reports" urgent={stats.noAction.length > 0}/>
    </section>

    <div className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-xl border border-black/[.08] bg-white p-5">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">What is coming in</h2><p className="mt-1 text-xs leading-5 text-bark-500">Actual rescue-condition vocabulary from the field register, normalised only for spelling and reporting.</p></div><Link href="/partner/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-paw-600">More analysis <ArrowUpRight size={13}/></Link></div>
        <div className="mt-4">{stats.categories.map(([name, count]) => <Bar key={name} label={name} value={count} max={maxCategory}/>)}</div>
      </section>

      <section className="rounded-xl border border-black/[.08] bg-white p-5">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Where to act next</h2><p className="mt-1 text-xs leading-5 text-bark-500">Localities rank higher when they combine open cases, repeated demand and cases closed without intervention.</p></div><Link href="/partner/map" className="inline-flex items-center gap-1 text-xs font-semibold text-paw-600">Open map <ArrowUpRight size={13}/></Link></div>
        <div className="mt-4 divide-y divide-black/[.06]">{stats.localities.map((place, i) => <div key={place.name} className="grid grid-cols-[24px_1fr_auto] gap-3 py-3 text-sm"><span className="text-xs opacity-40">#{i + 1}</span><span className="min-w-0"><b className="block truncate capitalize">{place.name}</b><small className="text-xs opacity-55">{place.open} open · {place.noAction} no action</small></span><b className="tabular-nums">{place.total}</b></div>)}</div>
      </section>
    </div>

    <section className="mt-5 grid gap-3 sm:grid-cols-3">
      <Mini label="Case completion" value={`${stats.completion}%`} detail={`${stats.closed.length.toLocaleString()} of ${stats.rescues.length.toLocaleString()} rescue cases`} />
      <Mini label="Repeat animals" value={stats.repeatAnimals.toLocaleString()} detail="Animals linked to more than one rescue case" />
      <Mini label="Animals in register" value={animals.toLocaleString()} detail="Permanent animal identities in this organisation" />
    </section>

    <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/[.08] bg-[#f7f5ef] p-5"><div><h2 className="text-sm font-semibold">Need the rows or the geography?</h2><p className="mt-1 text-xs text-bark-500">Records is the spreadsheet layer. Map is the decision layer. Reports explains patterns across both.</p></div><div className="flex gap-2"><Link href="/partner/records" className="rounded-lg border border-black/[.1] bg-white px-4 py-2 text-sm font-semibold">Records</Link><Link href="/partner/map" className="inline-flex items-center gap-1 rounded-lg bg-[#0b1e3d] px-4 py-2 text-sm font-semibold text-white"><MapPin size={14}/>Map</Link></div></section>
  </main>;
}

function ActionCard({ icon, label, value, detail, href, urgent = false }: { icon: React.ReactNode; label: string; value: number | string; detail: string; href: string; urgent?: boolean }) { return <Link href={href} className="rounded-xl border border-black/[.08] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"><div className={`inline-flex rounded-lg p-2 ${urgent ? "bg-orange-50 text-orange-700" : "bg-paw-50 text-paw-700"}`}>{icon}</div><strong className="mt-5 block text-4xl tabular-nums tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</strong><span className="mt-1 block text-sm font-semibold">{label}</span><small className="mt-1 block text-xs leading-5 text-bark-500">{detail}</small></Link>; }
function Bar({ label, value, max }: { label: string; value: number; max: number }) { return <div className="mt-3"><div className="flex justify-between gap-3 text-xs"><span className="truncate">{label}</span><b>{value.toLocaleString()}</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[#2457ce]" style={{ width: `${Math.max(4, (value / max) * 100)}%` }}/></div></div>; }
function Mini({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border border-black/[.08] bg-white p-4"><b className="text-2xl tabular-nums">{value}</b><span className="mt-1 block text-xs font-semibold">{label}</span><small className="mt-1 block text-xs leading-5 text-bark-500">{detail}</small></div>; }
