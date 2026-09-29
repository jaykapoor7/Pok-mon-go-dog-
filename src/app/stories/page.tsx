import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cellToLatLng } from "h3-js";
import { AppShell } from "@/components/app/AppShell";
import { StoryAtlas, type Story } from "@/components/stories/StoryAtlas";
import type { PublicCaseStory } from "@/lib/community-case-stories";
import { getPublishedCaseStoriesCached as getPublishedCaseStories, getPublicCareTimelineCached as getPublicCareTimeline } from "@/lib/community-case-stories-cached";
import { rescueCategory } from "@/lib/rescue-taxonomy";
import { getSupabase } from "@/lib/supabase";
import { dogLabel } from "@/lib/utils";
import "./stories.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Animal stories, StrayPaw", description: "Public animal records from reports and NGO field registers, showing care, discharge and outcomes only where they were actually recorded." };

/* ════════════════════════════════════════════════════════════════════
   Stories: public animal histories, told by their own records.

   Completed rescues still require issue + care + outcome. Historical
   organisation registers can also appear when they establish an encounter;
   those rows are explicitly labelled and never receive an invented ending.
   Care and discharge are added only when their source record contains them.
   ════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;
const span = (d: number) => (d >= 60 ? `${Math.round(d / 30)} months` : d === 1 ? "1 day" : `${d} days`);

/* Care titles arrive as the register wrote them: "NGO Treatment",
   "Maggots · KNG Pudur". Keep the kind of care, drop the prefix and the place. */
const careWhat = (t: string, ngo: string | null) => {
  const s = t.split(" · ")[0].replace(/^ngo\s+/i, "").trim().toLowerCase();
  if (ngo === "The Kind Hour Foundation" && s === "treatment") return "medical expense recorded";
  return s === "diagnostic" ? "diagnostics" : s || "care";
};

function build(cases: PublicCaseStory[], care: Awaited<ReturnType<typeof getPublicCareTimeline>>): Omit<Story, "pt" | "n">[] {
  const now = Date.now();
  const byDog = new Map<string, PublicCaseStory[]>();
  for (const c of cases) if (c.dog_id) byDog.set(c.dog_id, [...(byDog.get(c.dog_id) ?? []), c]);
  const careBy = new Map<string, { at: number; what: string }[]>();
  for (const e of care) {
    const at = Date.parse(e.occurred_at);
    if (!e.dog_id || !Number.isFinite(at) || at > now) continue; // a date in the future is an entry error, not care
    careBy.set(e.dog_id, [...(careBy.get(e.dog_id) ?? []), { at, what: careWhat(e.title, e.ngo_name) }]);
  }
  return [...byDog.entries()].map(([dogId, rows]) => {
    const latest = [...rows].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))[0];
    const start = Date.parse(latest.occurred_at);
    const historical = latest.ngo_name === "The Kind Hour Foundation";
    const recordedEnd = historical ? latest.source_discharge_at : latest.resolved_at;
    const endMs = recordedEnd && Date.parse(recordedEnd) > start + DAY / 2 && Date.parse(recordedEnd) <= now ? Date.parse(recordedEnd) : null;
    const careRows = (careBy.get(dogId) ?? []).filter((c) => c.at >= start - DAY && (!endMs || c.at <= endMs + 30 * DAY)).sort((a, b) => a.at - b.at);
    const cat = rescueCategory({ subtype: latest.category, title: latest.title, detail: latest.outcome });
    return {
      id: dogId,
      historical,
      name: dogLabel({ name: latest.animal_name, zone: latest.zone }),
      zone: latest.zone,
      cat: /^(unknown|not recorded|other)$/i.test(cat) ? null : cat,
      reported: new Date(start).toISOString(),
      end: endMs ? new Date(endMs).toISOString() : null,
      outcome: latest.outcome?.trim().replace(/\.$/, "") ?? "",
      care: careRows.map((c) => ({ at: new Date(c.at).toISOString(), what: c.what })),
      keeper: latest.ngo_name,
      photo: latest.cover_photo,
    };
  }).sort((a, b) => Date.parse(b.reported) - Date.parse(a.reported));
}

/** Each animal's cell centre: the finest the public record places anything. */
async function placesOf(ids: string[]) {
  const supa = getSupabase();
  const out = new Map<string, { pt: [number, number]; city: string | null }>();
  if (!supa || !ids.length) return out;
  const { data } = await supa.from("public_spatial_animals").select("id,h3_r8,city").in("id", ids);
  for (const r of (data ?? []) as { id: string; h3_r8: string | null; city: string | null }[]) {
    if (!r.h3_r8) continue;
    try { const [lat, lng] = cellToLatLng(r.h3_r8); out.set(r.id, { pt: [lng, lat], city: r.city }); } catch { /* not a cell */ }
  }
  return out;
}

export default async function StoriesPage() {
  const [cases, care] = await Promise.all([getPublishedCaseStories(), getPublicCareTimeline()]);
  const base = build(cases, care);
  const places = await placesOf(base.map((s) => s.id));
  const stories: Story[] = base.map((s, i) => ({ ...s, n: i + 1, pt: places.get(s.id)?.pt ?? null }));

  const lengths = stories.filter((s) => s.end).map((s) => Math.round((Date.parse(s.end!) - Date.parse(s.reported)) / DAY)).sort((a, b) => a - b);
  const median = lengths.length ? lengths[Math.floor(lengths.length / 2)] : null;
  const cities = new Map<string, number>();
  for (const s of base) { const c = places.get(s.id)?.city; if (c) cities.set(c, (cities.get(c) ?? 0) + 1); }
  /* Name a city only when every published story belongs to that one city.
     Previously the most common city was printed as if it described the
     whole atlas, which made every rescue appear to be in Coimbatore. */
  const city = cities.size === 1 ? [...cities.keys()][0] : null;
  const cityCount = cities.size;
  const historicalCount = stories.filter((s) => s.historical).length;

  return (
    <AppShell>
      <main className="st">
        <header className="st-head">
          <h1>Animal records, <em>followed through care.</em></h1>
          {stories.length > 0 && (
            <p className="st-lede">
              <b>{stories.length}</b> public animal records{city ? <> in {city}</> : cityCount > 1 ? <> across <b>{cityCount}</b> cities</> : null}
              {historicalCount ? <>, including <b>{historicalCount}</b> historical Kind Hour records</> : null}. Care, discharge and outcomes appear only where the source actually records them
              {median != null ? <>. Among records with a recorded ending, the median span is <b>{span(median)}</b></> : null}.
            </p>
          )}
          <Link href="/report" className="sys-btn is-flame">Report an animal <ArrowUpRight size={15} /></Link>
        </header>
        {stories.length ? <StoryAtlas stories={stories} /> : <section className="st-empty" aria-label="How stories enter the atlas">
          <div><span className="st-empty-index">THE ATLAS / PUBLIC FIELD RECORDS</span><h2>Every record starts somewhere.</h2><p>No public animal record is available yet. Stories show only what the source actually establishes: an encounter, care when documented, and a discharge or outcome when recorded.</p></div>
          <ol><li><b>01</b><span>Encounter</span></li><li><b>02</b><span>Care if recorded</span></li><li><b>03</b><span>Outcome if known</span></li></ol>
        </section>}
      </main>
    </AppShell>
  );
}
