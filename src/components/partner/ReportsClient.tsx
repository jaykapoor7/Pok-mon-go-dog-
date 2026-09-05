"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPartnerCases } from "@/lib/cases";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { PrintButton } from "@/components/partner/PrintButton";
import { CASE_CATEGORY_META, speciesLabel, type Case, type CaseCategory } from "@/lib/types";

const WEEKS = 12;

export function ReportsClient() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getPartnerCases().then(setCases).finally(() => setLoading(false)); }, []);

  const stats = useMemo(() => {
    const resolved = cases.filter((c) => c.status === "resolved");
    const byRes: Record<string, number> = { treated: 0, sterilized: 0, rescued: 0 };
    for (const c of resolved) if (c.resolution) byRes[c.resolution] = (byRes[c.resolution] ?? 0) + 1;
    const byCat = new Map<string, number>();
    for (const c of cases) byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1);
    const bySpecies = new Map<string, number>();
    for (const c of cases) bySpecies.set(c.species ?? "dog", (bySpecies.get(c.species ?? "dog") ?? 0) + 1);
    const rate = cases.length ? Math.round((resolved.length / cases.length) * 100) : 0;

    const now = Date.now();
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const end = now - (WEEKS - 1 - i) * 7 * 86_400_000;
      const start = end - 7 * 86_400_000;
      const count = cases.filter((c) => { const t = +new Date(c.created_at); return t > start && t <= end; }).length;
      return { count, label: new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) };
    });
    return { resolved, byRes, byCat, bySpecies, rate, weeks };
  }, [cases]);

  const { weeks } = stats;
  const wMax = Math.max(1, ...weeks.map((w) => w.count));
  const totalNew = weeks.reduce((a, w) => a + w.count, 0);

  // SVG trend geometry
  const W = 640, H = 150, PAD = 8;
  const pts = weeks.map((w, i) => {
    const x = PAD + (i / (WEEKS - 1)) * (W - PAD * 2);
    const y = H - PAD - (w.count / wMax) * (H - PAD * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - PAD} L${pts[0][0].toFixed(1)},${H - PAD} Z`;

  const oTot = stats.byRes.treated + stats.byRes.sterilized + stats.byRes.rescued;
  const oSafe = oTot ? Math.round((stats.byRes.rescued / oTot) * 100) : 0;
  const oTreat = oTot ? Math.round((stats.byRes.treated / oTot) * 100) : 0;
  const oSter = Math.max(0, 100 - oSafe - oTreat);
  const donut = `conic-gradient(#3b7de6 0 ${oSafe}%, #d9a441 ${oSafe}% ${oSafe + oTreat}%, #3e8473 ${oSafe + oTreat}% 100%)`;
  const catMax = Math.max(1, ...[...stats.byCat.values()]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-paw-500" /></div>;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Analytics</h1>
          <p className="mt-0.5 text-[13px] text-bark-500">The numbers you send to donors, funders and municipalities.</p>
        </div>
        <div className="flex items-center gap-2"><PrintButton /><ExportCsvButton /></div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total cases" value={cases.length} />
        <Metric label="Resolved" value={stats.resolved.length} accent />
        <Metric label="Resolution rate" value={`${stats.rate}%`} />
        <Metric label="New · 12 wks" value={totalNew} />
      </div>

      {/* Weekly trend */}
      <section className="mt-6 rounded border border-black/[0.08] bg-white/70 p-5 dark:border-white/[0.1] dark:bg-bark-900/50">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-semibold tracking-tight text-bark-900 dark:text-bark-50">New cases over time</h2>
            <p className="text-[13px] text-bark-500">Last {WEEKS} weeks</p>
          </div>
          <span className="text-[13px] font-medium text-paw-600">peak {wMax}/wk</span>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full min-w-[520px]" preserveAspectRatio="none">
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1={PAD} x2={W - PAD} y1={PAD + g * (H - PAD * 2)} y2={PAD + g * (H - PAD * 2)} stroke="currentColor" className="text-black/[0.06] dark:text-white/10" strokeWidth="1" />
            ))}
            <path d={area} fill="#3b7de6" fillOpacity="0.12" />
            <path d={line} fill="none" stroke="#3b7de6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5} fill="#3b7de6" />)}
          </svg>
        </div>
        <div className="mt-1 flex justify-between text-[11.5px] text-bark-400">
          <span>{weeks[0].label}</span><span>{weeks[Math.floor(WEEKS / 2)].label}</span><span>this week</span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Category bars */}
        <section className="rounded border border-black/[0.08] bg-white/70 p-5 dark:border-white/[0.1] dark:bg-bark-900/50">
          <h2 className="mb-4 font-semibold tracking-tight text-bark-900 dark:text-bark-50">Cases by type</h2>
          {stats.byCat.size === 0 ? <p className="text-[13px] text-bark-400">No cases yet.</p> : (
            <div className="space-y-3">
              {[...stats.byCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="text-bark-700 dark:text-bark-200">{CASE_CATEGORY_META[cat as CaseCategory]?.label ?? cat}</span>
                    <span className="font-medium tabular-nums text-bark-900 dark:text-bark-50">{n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-bark-100 dark:bg-bark-800"><div className="h-full rounded-full bg-paw-500" style={{ width: `${(n / catMax) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Outcomes donut */}
        <section className="rounded border border-black/[0.08] bg-white/70 p-5 dark:border-white/[0.1] dark:bg-bark-900/50">
          <h2 className="font-semibold tracking-tight text-bark-900 dark:text-bark-50">Outcomes</h2>
          <p className="text-[13px] text-bark-500">What happened to resolved cases</p>
          {oTot === 0 ? <p className="mt-6 text-[13px] text-bark-400">No resolved outcomes yet.</p> : (
            <div className="mt-5 flex items-center gap-7">
              <div className="relative grid size-32 shrink-0 place-items-center rounded-full" style={{ background: donut }}>
                <div className="grid size-20 place-items-center rounded-full bg-white text-center dark:bg-bark-900">
                  <span className="text-xl font-semibold text-bark-900 dark:text-bark-50">{stats.resolved.length}<span className="block text-[11.5px] font-normal text-bark-400">resolved</span></span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                <span className="flex items-center gap-2"><i className="inline-block size-2.5 rounded-full" style={{ background: "#3b7de6" }} /> Rescued <b className="ml-auto tabular-nums">{oSafe}%</b></span>
                <span className="flex items-center gap-2"><i className="inline-block size-2.5 rounded-full" style={{ background: "#d9a441" }} /> Treated <b className="ml-auto tabular-nums">{oTreat}%</b></span>
                <span className="flex items-center gap-2"><i className="inline-block size-2.5 rounded-full" style={{ background: "#3e8473" }} /> Sterilised <b className="ml-auto tabular-nums">{oSter}%</b></span>
              </div>
            </div>
          )}
        </section>
      </div>

      {stats.bySpecies.size > 1 && (
        <section className="mt-6 rounded border border-black/[0.08] bg-white/70 p-5 dark:border-white/[0.1] dark:bg-bark-900/50">
          <h2 className="mb-3 font-semibold tracking-tight text-bark-900 dark:text-bark-50">Cases by species</h2>
          <div className="flex flex-wrap gap-2">
            {[...stats.bySpecies.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => (
              <span key={s} className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] px-3 py-1.5 text-[13px] dark:border-white/[0.1]">
                {speciesLabel(s)} <b className="tabular-nums text-paw-600">{n}</b>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded border border-black/[0.08] bg-white/70 px-4 py-4 dark:border-white/[0.1] dark:bg-bark-900/50">
      <div className={`text-2xl font-semibold tabular-nums tracking-tight ${accent ? "text-paw-600" : "text-bark-900 dark:text-bark-50"}`}>{value}</div>
      <div className="mt-0.5 text-[12px] text-bark-500">{label}</div>
    </div>
  );
}
