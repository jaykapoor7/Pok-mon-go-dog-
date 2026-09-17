"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Layers, X } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { getMyAnimals, type AnimalRow } from "@/lib/animal-actions";
import { isOverdue, speciesLabel, SPECIES, type Case, type Dog } from "@/lib/types";
import { isMissingOrEscaped, isNoAction, rescueCategory } from "@/lib/rescue-taxonomy";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Layer = "cases" | "animals";
type Lens = "all" | "open" | "urgent" | "followup" | "no_action" | "repeat" | "missing" | "resolved";

const isOpen = (c: Case) => c.status !== "resolved" && c.status !== "closed";
const isUrgent = (c: Case) => isOpen(c) && (c.severity === "critical" || c.severity === "high" || isOverdue(c));
const caseText = (c: Case) => ({ subtype: c.category, title: c.condition_text || c.title, detail: [c.description, c.outcome_note].filter(Boolean).join(" "), status: c.status });

function caseMarker(c: Case): Dog {
  return {
    id: c.id, name: c.title, zone: c.zone ?? "", lat: c.lat as number, lng: c.lng as number,
    status: isUrgent(c) ? "injured" : c.status === "resolved" ? "sterilised" : "seen",
    cover_photo: c.photos?.[0] ?? "", photos: [], size: "medium", color: "", is_friendly: true,
    needs_help: isUrgent(c), sterilised: c.status === "resolved", vaccinated: false, trust_score: 50,
    sightings_count: 1, feed_count: 0, first_seen: c.created_at, last_seen: c.last_activity_at,
    last_fed_at: null, community_notes: [],
  };
}
function animalMarker(a: AnimalRow): Dog {
  return {
    id: a.id, name: a.name ?? speciesLabel(a.species), zone: a.zone, lat: a.lat, lng: a.lng,
    status: (a.status as Dog["status"]) ?? "seen", cover_photo: a.cover_photo, photos: [], size: "medium",
    color: "", is_friendly: true, needs_help: false, sterilised: false, vaccinated: false, trust_score: 50,
    sightings_count: 1, feed_count: 0, first_seen: a.last_seen, last_seen: a.last_seen, last_fed_at: null, community_notes: [],
  };
}

export function PartnerMap({ cases }: { cases: Case[] }) {
  const [layer, setLayer] = useState<Layer>("cases");
  const [species, setSpecies] = useState("all");
  const [lens, setLens] = useState<Lens>("open");
  const [category, setCategory] = useState("all");
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [sel, setSel] = useState<{ kind: Layer; id: string } | null>(null);

  useEffect(() => { getMyAnimals().then(setAnimals).catch(() => {}); }, []);

  const repeatIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cases) if (c.dog_id) counts.set(c.dog_id, (counts.get(c.dog_id) ?? 0) + 1);
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id));
  }, [cases]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cases) {
      const key = rescueCategory(caseText(c));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cases]);

  const speciesInPlay = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => c.species && set.add(c.species));
    animals.forEach((a) => set.add(a.species));
    return SPECIES.filter((s) => set.has(s.id));
  }, [cases, animals]);

  const filteredCases = useMemo(() => {
    let list = cases.filter((c) => c.lat != null && c.lng != null);
    if (species !== "all") list = list.filter((c) => (c.species ?? "dog") === species);
    if (category !== "all") list = list.filter((c) => rescueCategory(caseText(c)) === category);
    if (lens === "open") list = list.filter(isOpen);
    if (lens === "urgent") list = list.filter(isUrgent);
    if (lens === "followup") list = list.filter((c) => Boolean(c.follow_up_at));
    if (lens === "no_action") list = list.filter((c) => isNoAction(caseText(c)));
    if (lens === "repeat") list = list.filter((c) => Boolean(c.dog_id && repeatIds.has(c.dog_id)));
    if (lens === "missing") list = list.filter((c) => isMissingOrEscaped(caseText(c)));
    if (lens === "resolved") list = list.filter((c) => c.status === "resolved" || c.status === "closed");
    return list;
  }, [cases, species, category, lens, repeatIds]);

  const markers = useMemo(() => {
    if (layer === "cases") return filteredCases.map(caseMarker);
    let list = animals.filter((a) => a.lat && a.lng);
    if (species !== "all") list = list.filter((a) => a.species === species);
    return list.map(animalMarker);
  }, [layer, filteredCases, animals, species]);

  const hotspots = useMemo(() => {
    if (layer !== "cases") return [];
    const cell = .025;
    const bins = new Map<string, { count: number; zone: Map<string, number>; categories: Map<string, number> }>();
    for (const c of filteredCases) {
      if (c.lat == null || c.lng == null) continue;
      const key = `${Math.floor(c.lat / cell)}:${Math.floor(c.lng / cell)}`;
      const bin = bins.get(key) ?? { count: 0, zone: new Map(), categories: new Map() };
      bin.count += 1;
      const z = c.zone || "Mapped area";
      bin.zone.set(z, (bin.zone.get(z) ?? 0) + 1);
      const cat = rescueCategory(caseText(c));
      bin.categories.set(cat, (bin.categories.get(cat) ?? 0) + 1);
      bins.set(key, bin);
    }
    return [...bins.values()].map((b) => ({
      count: b.count,
      zone: [...b.zone.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Mapped area",
      category: [...b.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Rescue",
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredCases, layer]);

  const selectedCase = sel?.kind === "cases" ? cases.find((c) => c.id === sel.id) : null;
  const selectedAnimal = sel?.kind === "animals" ? animals.find((a) => a.id === sel.id) : null;

  return <div className="fixed bottom-0 left-0 right-0 top-14 lg:left-60 lg:top-16">
    <h1 className="sr-only">Operational map of rescue demand and animal records</h1>
    <MapCanvas dogs={markers} onSelect={(d) => setSel({ kind: layer, id: d.id })}/>

    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 px-3">
      <div className="pointer-events-auto mx-auto max-w-5xl rounded-xl border border-black/[0.08] bg-paper/95 p-2 shadow-card backdrop-blur dark:border-white/[0.1] dark:bg-ink/95">
        <div className="flex flex-wrap items-center gap-1.5"><span className="ml-1 hidden text-bark-400 sm:block"><Layers className="h-4 w-4"/></span><Seg active={layer === "cases"} onClick={() => setLayer("cases")}>Rescue cases</Seg><Seg active={layer === "animals"} onClick={() => setLayer("animals")}>Animals</Seg><span className="mx-1 h-5 w-px bg-black/[0.08] dark:bg-white/10"/>{speciesInPlay.length > 1 && <select value={species} onChange={(e) => setSpecies(e.target.value)} className="rounded-md border border-black/[0.09] bg-transparent px-2 py-1.5 text-[13px] outline-none dark:border-white/[0.12]"><option value="all">All species</option>{speciesInPlay.map((s) => <option key={s.id} value={s.id}>{s.plural}</option>)}</select>}<span className="ml-auto mr-1 text-[12px] tabular-nums text-bark-400">{markers.length}</span></div>
        {layer === "cases" && <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-black/[.06] pt-2 dark:border-white/[.08]">
          {(["all", "open", "urgent", "followup", "no_action", "repeat", "missing", "resolved"] as Lens[]).map((value) => <Seg key={value} active={lens === value} onClick={() => setLens(value)}>{value === "no_action" ? "No action" : value === "followup" ? "Follow-up" : value[0].toUpperCase() + value.slice(1)}</Seg>)}
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="ml-auto min-w-[170px] rounded-md border border-black/[0.09] bg-transparent px-2 py-1.5 text-[13px] outline-none dark:border-white/[0.12]"><option value="all">All rescue categories</option>{categories.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}</select>
        </div>}
      </div>
    </div>

    {layer === "cases" && hotspots.length > 0 && <aside className="absolute bottom-5 left-4 z-20 w-[min(330px,calc(100%-32px))] rounded-xl border border-black/[.08] bg-paper/95 p-4 shadow-lg backdrop-blur dark:border-white/[.1] dark:bg-ink/95"><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-bark-400">Top clusters in this view</span><div className="mt-2 divide-y divide-black/[.06] dark:divide-white/[.07]">{hotspots.map((h, i) => <div key={`${h.zone}-${i}`} className="grid grid-cols-[22px_1fr_auto] gap-2 py-2.5 text-xs"><span className="opacity-40">#{i + 1}</span><span><b className="block">{h.zone}</b><small className="text-bark-500">{h.category}</small></span><b>{h.count}</b></div>)}</div><p className="mt-2 text-[10.5px] leading-4 text-bark-500">Clusters are concentrations in mapped records, not population estimates.</p></aside>}

    {(selectedCase || selectedAnimal) && <div className="absolute inset-y-0 right-0 z-30 w-full max-w-sm border-l border-black/[0.08] bg-paper p-5 shadow-xl dark:border-white/[0.1] dark:bg-ink">
      <button onClick={() => setSel(null)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-bark-400 hover:bg-black/[0.04]" aria-label="Close"><X className="h-4 w-4"/></button>
      {selectedCase && <div className="pt-6"><p className="text-[12px] uppercase tracking-wide text-bark-400">{speciesLabel(selectedCase.species)} · {rescueCategory(caseText(selectedCase))}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-bark-900 dark:text-bark-50">{selectedCase.title}</h2><dl className="mt-4 space-y-0"><Fact label="Status" value={<span className="capitalize">{selectedCase.status.replace("_", " ")}</span>}/><Fact label="Severity" value={<span className="capitalize">{selectedCase.severity}</span>}/><Fact label="Assignee" value={selectedCase.assignee_name ?? "Unassigned"}/>{selectedCase.zone && <Fact label="Location" value={selectedCase.zone}/>}<Fact label="Last activity" value={timeAgo(selectedCase.last_activity_at)}/>{selectedCase.follow_up_at && <Fact label="Next" value={`Follow-up ${selectedCase.follow_up_at}`}/>}</dl><Link href={`/partner/cases/${selectedCase.id}`} className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">Open case <ArrowRight className="h-4 w-4"/></Link></div>}
      {selectedAnimal && <div className="pt-6"><p className="text-[12px] uppercase tracking-wide text-bark-400">{selectedAnimal.code ?? speciesLabel(selectedAnimal.species)}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-bark-900 dark:text-bark-50">{selectedAnimal.name ?? speciesLabel(selectedAnimal.species)}</h2><dl className="mt-4 space-y-0"><Fact label="Species" value={speciesLabel(selectedAnimal.species)}/>{selectedAnimal.zone && <Fact label="Location" value={selectedAnimal.zone}/>}<Fact label="Responsible" value={selectedAnimal.assignee_name ?? "Unassigned"}/></dl><Link href={`/partner/animals/${selectedAnimal.id}`} className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">Open record <ArrowRight className="h-4 w-4"/></Link></div>}
    </div>}
  </div>;
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={cn("rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors", active ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]")}>{children}</button>; }
function Fact({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.06] py-2 last:border-0 dark:border-white/[0.06]"><dt className="text-[13px] text-bark-500">{label}</dt><dd className="text-right text-[13.5px] font-medium text-bark-900 dark:text-bark-50">{value}</dd></div>; }
