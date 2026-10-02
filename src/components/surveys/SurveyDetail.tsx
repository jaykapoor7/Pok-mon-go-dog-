"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, ClipboardCheck, Download } from "lucide-react";
import { isNgoMember } from "@/lib/actions";
import { addSurveyArea } from "@/lib/survey-actions";
import { getSurveyResponses, getSurveyTotals } from "@/lib/surveys";
import { downloadCsv } from "@/lib/csv";
import { MapCanvas } from "@/components/map/MapCanvas";
import { speciesLabel, type Survey, type SurveyArea, type SurveyResponse, type Dog } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { DeskHeader } from "@/components/app/DeskHeader";

export function SurveyDetail({ survey, areas, onChanged }: { survey: Survey; areas: SurveyArea[]; onChanged: () => Promise<void> }) {
  const [member, setMember] = useState(false);
  const [adding, setAdding] = useState(false);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  const [totals, setTotals] = useState<{ areas: number; responses: number; animals: number; covered: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    isNgoMember().then(setMember).catch(() => {});
    Promise.all([getSurveyResponses(survey.id, 500), getSurveyTotals(survey.id)]).then(([rows,total]) => { setResponses(rows); setTotals(total); }).catch(() => setError("Survey totals and observations could not be loaded. Try again."));
  }, [survey.id, areas]);

  const responseMarkers: Dog[] = responses
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id, name: speciesLabel(r.species), zone: "", lat: r.lat as number, lng: r.lng as number,
      status: "seen", cover_photo: r.photo_url ?? "", photos: [], size: "medium", color: "", is_friendly: true,
      needs_help: false, sterilised: false, vaccinated: false, trust_score: 50, sightings_count: 1, feed_count: 0,
      first_seen: r.created_at, last_seen: r.created_at, last_fed_at: null, community_notes: [],
    }));

  const coverage = totals?.areas ? Math.round((totals.covered / totals.areas) * 100) : 0;

  return (
    <div className="dk-form-page is-wide">
      <DeskHeader
        kicker={`Field work · ${speciesLabel(survey.species).toLowerCase()} census${survey.status !== "active" ? " · closed" : ""}`}
        title={survey.title}
        lede={survey.description || undefined}
        figures={[
          { label: "areas", value: totals?.areas ?? null },
          { label: "responses", value: totals?.responses ?? null },
          { label: "dogs counted", value: totals?.animals ?? null },
          { label: "areas started", value: totals ? `${coverage}%` : null, tone: "quiet" },
        ]}
        actions={<Link href="/partner/surveys" className="dk-btn is-tint"><ArrowLeft size={15} /> Surveys</Link>}
      />

      {error && <p role="alert" className="mt-4 text-status-injured">{error}</p>}

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
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-bark-400">Recent observations ({responses.length} shown)</h2>
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

      {member && adding && <AddArea surveyId={survey.id} onDone={() => { setAdding(false); void onChanged(); }} />}

      {areas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-10 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">
          No areas yet{member ? ", add wards or villages to divide the survey." : "."}
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
                      {a.animal_count ?? 0} dog{a.animal_count === 1 ? "" : "s"} · {a.response_count ?? 0} response{a.response_count === 1 ? "" : "s"}
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

function AddArea({ surveyId, onDone }: { surveyId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const INPUT = "rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

  async function submit() {
    if (!name.trim()) return;
    const amount = target.trim() ? Number(target) : null;
    if (amount !== null && (!Number.isInteger(amount) || amount < 1)) { setError("Target must be a positive whole number."); return; }
    setBusy(true); setError(null);
    try {
      const id = await addSurveyArea(surveyId, name.trim(), code.trim() || undefined, amount);
      if (!id) throw new Error("The area was not saved.");
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "The area was not saved."); } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.1]">
      <input aria-label="Area code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className={cn(INPUT, "w-20")} />
      <input aria-label="Area name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ward / village name" className={cn(INPUT, "min-w-0 flex-1")} />
      <input aria-label="Target dog count" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" placeholder="Target" className={cn(INPUT, "w-20")} />
      {error && <p role="alert" className="text-sm text-status-injured">{error}</p>}
      <button onClick={submit} disabled={busy || !name.trim()} className="inline-flex items-center gap-1 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
      </button>
    </div>
  );
}
