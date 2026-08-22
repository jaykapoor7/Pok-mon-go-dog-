"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, MapPin, ArrowRight, Layers } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { getMyAnimals, type AnimalRow } from "@/lib/animal-actions";
import { isOverdue, speciesLabel, SPECIES, type Case, type Dog } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Layer = "cases" | "animals";
type StatusF = "all" | "open" | "urgent" | "resolved";

const isOpen = (c: Case) => c.status !== "resolved" && c.status !== "closed";
const isUrgent = (c: Case) => isOpen(c) && (c.severity === "critical" || c.severity === "high" || isOverdue(c));

// Synthetic Dog marker so we can reuse MapCanvas. Marker colour comes from
// needs_help (red) for urgent cases.
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
  const [status, setStatus] = useState<StatusF>("open");
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [sel, setSel] = useState<{ kind: Layer; id: string } | null>(null);

  useEffect(() => { getMyAnimals().then(setAnimals).catch(() => {}); }, []);

  const speciesInPlay = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => c.species && set.add(c.species));
    animals.forEach((a) => set.add(a.species));
    return SPECIES.filter((s) => set.has(s.id));
  }, [cases, animals]);

  const markers = useMemo(() => {
    if (layer === "cases") {
      let list = cases.filter((c) => c.lat != null && c.lng != null);
      if (species !== "all") list = list.filter((c) => (c.species ?? "dog") === species);
      if (status === "open") list = list.filter(isOpen);
      else if (status === "urgent") list = list.filter(isUrgent);
      else if (status === "resolved") list = list.filter((c) => c.status === "resolved");
      return list.map(caseMarker);
    }
    let list = animals.filter((a) => a.lat && a.lng);
    if (species !== "all") list = list.filter((a) => a.species === species);
    return list.map(animalMarker);
  }, [layer, species, status, cases, animals]);

  const selectedCase = sel?.kind === "cases" ? cases.find((c) => c.id === sel.id) : null;
  const selectedAnimal = sel?.kind === "animals" ? animals.find((a) => a.id === sel.id) : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 top-14 lg:left-56">
      <MapCanvas dogs={markers} onSelect={(d) => setSel({ kind: layer, id: d.id })} />

      {/* filter bar */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 px-3">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-1.5 rounded-lg border border-black/[0.08] bg-paper/95 p-1.5 shadow-card backdrop-blur dark:border-white/[0.1] dark:bg-ink/95">
          <span className="ml-1 hidden text-bark-400 sm:block"><Layers className="h-4 w-4" /></span>
          <Seg active={layer === "cases"} onClick={() => setLayer("cases")}>Cases</Seg>
          <Seg active={layer === "animals"} onClick={() => setLayer("animals")}>Animals</Seg>
          <span className="mx-1 h-5 w-px bg-black/[0.08] dark:bg-white/10" />
          {layer === "cases" && (["all", "open", "urgent", "resolved"] as StatusF[]).map((s) => (
            <Seg key={s} active={status === s} onClick={() => setStatus(s)}>{s[0].toUpperCase() + s.slice(1)}</Seg>
          ))}
          {speciesInPlay.length > 1 && (
            <select value={species} onChange={(e) => setSpecies(e.target.value)} className="rounded-md border border-black/[0.09] bg-transparent px-2 py-1.5 text-[13px] outline-none dark:border-white/[0.12]">
              <option value="all">All species</option>
              {speciesInPlay.map((s) => <option key={s.id} value={s.id}>{s.plural}</option>)}
            </select>
          )}
          <span className="ml-auto mr-1 text-[12px] tabular-nums text-bark-400">{markers.length}</span>
        </div>
      </div>

      {/* side panel */}
      {(selectedCase || selectedAnimal) && (
        <div className="absolute inset-y-0 right-0 z-30 w-full max-w-sm border-l border-black/[0.08] bg-paper p-5 shadow-xl dark:border-white/[0.1] dark:bg-ink">
          <button onClick={() => setSel(null)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-bark-400 hover:bg-black/[0.04]" aria-label="Close"><X className="h-4 w-4" /></button>
          {selectedCase && (
            <div className="pt-6">
              <p className="text-[12px] uppercase tracking-wide text-bark-400">{speciesLabel(selectedCase.species)} · case</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-bark-900 dark:text-bark-50">{selectedCase.title}</h2>
              <dl className="mt-4 space-y-0">
                <Fact label="Status" value={<span className="capitalize">{selectedCase.status.replace("_", " ")}</span>} />
                <Fact label="Severity" value={<span className="capitalize">{selectedCase.severity}</span>} />
                <Fact label="Assignee" value={selectedCase.assignee_name ?? "Unassigned"} />
                {selectedCase.zone && <Fact label="Location" value={selectedCase.zone} />}
                <Fact label="Last activity" value={timeAgo(selectedCase.last_activity_at)} />
                {selectedCase.follow_up_at && <Fact label="Next" value={`Follow-up ${selectedCase.follow_up_at}`} />}
              </dl>
              <Link href={`/partner/cases/${selectedCase.id}`} className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
                Open case <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
          {selectedAnimal && (
            <div className="pt-6">
              <p className="text-[12px] uppercase tracking-wide text-bark-400">{selectedAnimal.code ?? speciesLabel(selectedAnimal.species)}</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-bark-900 dark:text-bark-50">{selectedAnimal.name ?? speciesLabel(selectedAnimal.species)}</h2>
              <dl className="mt-4 space-y-0">
                <Fact label="Species" value={speciesLabel(selectedAnimal.species)} />
                {selectedAnimal.zone && <Fact label="Location" value={selectedAnimal.zone} />}
                <Fact label="Responsible" value={selectedAnimal.assignee_name ?? "Unassigned"} />
              </dl>
              <Link href={`/partner/animals/${selectedAnimal.id}`} className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
                Open record <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors", active ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]")}>
      {children}
    </button>
  );
}
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.06] py-2 last:border-0 dark:border-white/[0.06]">
      <dt className="text-[13px] text-bark-500">{label}</dt>
      <dd className="text-right text-[13.5px] font-medium text-bark-900 dark:text-bark-50">{value}</dd>
    </div>
  );
}
