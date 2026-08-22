"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, ClipboardCheck, Download } from "lucide-react";
import { isNgoMember } from "@/lib/actions";
import { addSurveyArea } from "@/lib/survey-actions";
import { getSurveyResponses } from "@/lib/surveys";
import { downloadCsv } from "@/lib/csv";
import { MapCanvas } from "@/components/map/MapCanvas";
import { speciesLabel, type Survey, type SurveyArea, type SurveyResponse, type Dog } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function SurveyDetail({ survey, areas }: { survey: Survey; areas: SurveyArea[] }) {
  const router = useRouter();
  const [member, setMember] = useState(false);
  const [adding, setAdding] = useState(false);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    isNgoMember().then(setMember).catch(() => {});
    getSurveyResponses(survey.id).then(setResponses).catch(() => {});
  }, [survey.id]);

  const responseMarkers: Dog[] = responses
    .filter((r) => r.lat && r.lng)
    .map((r) => ({
      id: r.id, name: speciesLabel(r.species), zone: "", lat: r.lat as number, lng: r.lng as number,
      status: "seen", cover_photo: r.photo_url ?? "", photos: [], size: "medium", color: "", is_friendly: true,
      needs_help: false, sterilised: false, vaccinated: false, trust_score: 50, sightings_count: 1, feed_count: 0,
      first_seen: r.created_at, last_seen: r.created_at, last_fed_at: null, community_notes: [],
    }));

  const totals = areas.reduce(
    (acc, a) => {
      acc.responses += a.response_count ?? 0;
      acc.animals += a.animal_count ?? 0;
      if ((a.response_count ?? 0) > 0) acc.covered += 1;
      return acc;
    },
    { responses: 0, animals: 0, covered: 0 }
  );
  const coverage = areas.length ? Math.round((totals.covered / areas.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-24 sm:px-6">
      <Link href="/surveys" className="mb-4 inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-paw-600">
        <ArrowLeft className="h-4 w-4" /> Surveys
      </Link>

      <div className="border-b border-black/[0.08] pb-5 dark:border-white/[0.1]">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">{survey.title}</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">
          {speciesLabel(survey.species)} census{survey.status !== "active" ? " · closed" : ""}
        </p>
        {survey.description && <p className="mt-3 text-[14px] leading-relaxed text-bark-700 dark:text-bark-200">{survey.description}</p>}
      </div>

      {/* summary */}
      <div className="mt-5 grid grid-cols-4 divide-x divide-black/[0.07] overflow-hidden rounded-lg border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.1]">
        <Metric label="Areas" value={areas.length} />
        <Metric label="Responses" value={totals.responses} />
        <Metric label="Animals" value={totals.animals} />
        <Metric label="Coverage" value={`${coverage}%`} />
      </div>

      <Link
        href={`/surveys/${survey.id}/collect`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-paw-500 py-3 text-sm font-semibold text-white hover:bg-paw-600"
      >
        <ClipboardCheck className="h-4 w-4" /> Collect data in the field
      </Link>

      {/* geographic coverage */}
      {responseMarkers.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-bark-400">Coverage map</h2>
          <div className="h-72 overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
            <MapCanvas dogs={responseMarkers} />
          </div>
          <p className="mt-1.5 text-[12px] text-bark-400">{responseMarkers.length} geo-tagged observations.</p>
        </div>
      )}

      {/* observations */}
      {responses.length > 0 && (
        <section className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-bark-400">Observations ({responses.length})</h2>
            <button
              onClick={() => {
                const areaName = new Map(areas.map((a) => [a.id, a.name]));
                downloadCsv(`${survey.title.replace(/\W+/g, "-").toLowerCase()}-responses.csv`, responses.map((r) => ({
                  date: r.created_at, area: r.area_id ? areaName.get(r.area_id) ?? "" : "", species: speciesLabel(r.species),
                  count: r.count, lat: r.lat ?? "", lng: r.lng ?? "", sterilised: (r.attributes as any)?.sterilised ?? "", notes: r.notes ?? "",
                })));
              }}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-paw-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
            {responses.slice(0, 100).map((r) => {
              const areaName = areas.find((a) => a.id === r.area_id)?.name;
              return (
                <li key={r.id} className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-2 text-[13px] last:border-0 dark:border-white/[0.06]">
                  <span className="min-w-0 flex-1 truncate text-bark-800 dark:text-bark-100">
                    {speciesLabel(r.species)}{r.count > 1 ? ` ×${r.count}` : ""}{areaName ? ` · ${areaName}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-bark-400">{formatDate(r.created_at)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* areas */}
      <div className="mt-8 mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-bark-400">Areas</h2>
        {member && (
          <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-[13px] font-medium text-paw-600 hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add area
          </button>
        )}
      </div>

      {member && adding && <AddArea surveyId={survey.id} onDone={() => { setAdding(false); router.refresh(); }} />}

      {areas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-10 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">
          No areas yet{member ? " — add wards or villages to divide the survey." : "."}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {areas.map((a) => {
            const pct = a.target_count ? Math.min(100, Math.round(((a.animal_count ?? 0) / a.target_count) * 100)) : null;
            return (
              <li key={a.id} className="border-b border-black/[0.06] px-4 py-3 last:border-0 dark:border-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">
                      {a.code ? <span className="text-bark-400">{a.code} · </span> : null}{a.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-bark-400">
                      {a.animal_count ?? 0} animals · {a.response_count ?? 0} responses
                      {a.target_count ? ` · target ${a.target_count}` : ""}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-[12px] font-medium", (a.response_count ?? 0) > 0 ? "text-status-vaccinated" : "text-bark-400")}>
                    {(a.response_count ?? 0) > 0 ? "Started" : "Pending"}
                  </span>
                </div>
                {pct != null && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bark-100 dark:bg-bark-800">
                    <div className="h-full rounded-full bg-paw-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-3 py-3">
      <div className="text-xl font-semibold tabular-nums tracking-tight text-bark-900 dark:text-bark-50">{value}</div>
      <div className="mt-0.5 text-[12px] text-bark-500">{label}</div>
    </div>
  );
}

function AddArea({ surveyId, onDone }: { surveyId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const INPUT = "rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addSurveyArea(surveyId, name.trim(), code.trim() || undefined, target ? parseInt(target, 10) : null);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.1]">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className={cn(INPUT, "w-20")} />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ward / village name" className={cn(INPUT, "min-w-0 flex-1")} />
      <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" placeholder="Target" className={cn(INPUT, "w-20")} />
      <button onClick={submit} disabled={busy || !name.trim()} className="inline-flex items-center gap-1 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
      </button>
    </div>
  );
}
