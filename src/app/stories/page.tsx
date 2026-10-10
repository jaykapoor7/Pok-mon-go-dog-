import { animalTag, givenName, shortPlace } from "@/lib/animal-name";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { cellToLatLng } from "h3-js";
import { DeskHeader } from "@/components/app/DeskHeader";
import { AppShell } from "@/components/app/AppShell";
import { StoryAtlas, type Story } from "@/components/stories/StoryAtlas";
import type { PublicCaseStory, PublicTimelineEvent } from "@/lib/community-case-stories";
import { getPublishedCaseStoriesPage, countPublicCaseStories } from "@/lib/community-case-stories";
import { getPublicSpatialCities } from "@/lib/spatial/server";
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

function build(cases: PublicCaseStory[], care: PublicTimelineEvent[]): Omit<Story, "pt" | "n">[] {
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
      name: givenName(latest.animal_name) ?? shortPlace(latest.zone) ?? animalTag({ id: dogId }),
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

async function StoriesData({ before, city }: { before: { occurredAt: string; id: string } | null; city: string | null }) {
  const [page, totalForScope, cityIndex] = await Promise.all([
    getPublishedCaseStoriesPage({ limit: 48, before, city }).catch(() => ({ rows: [], care: [], next: null, error: "Public records temporarily unavailable" })),
    countPublicCaseStories(city).catch(() => null),
    getPublicSpatialCities(40).catch(() => []),
  ]);
  /* Cities people can scope to: those with field work, most first. */
  const cityChips = cityIndex.filter((c) => (c.cases || 0) > 0 || (c.animals || 0) > 0).slice(0, 10);
  const cases = page.rows;
  /* getPublishedCaseStoriesPage already read the care timeline to qualify the
     stories; reuse it instead of a second identical round trip. */
  const base = build(cases, page.care);
  const places = await placesOf(base.map((s) => s.id));
  const stories: Story[] = base.map((s, i) => ({ ...s, n: i + 1, pt: places.get(s.id)?.pt ?? null }));

  const lengths = stories.filter((s) => s.end).map((s) => Math.round((Date.parse(s.end!) - Date.parse(s.reported)) / DAY)).sort((a, b) => a - b);
  const median = lengths.length ? lengths[Math.floor(lengths.length / 2)] : null;
  const cities = new Map<string, number>();
  for (const s of base) { const c = places.get(s.id)?.city; if (c) cities.set(c, (cities.get(c) ?? 0) + 1); }
  const cityCount = cities.size;
  /* The headline count is the authoritative total for the scope (the whole
     atlas, or one city when scoped), never the length of this 48-row page —
     and this page is one city's stories when a city is chosen. */
  const paged = !!(page.next || before);

  return (
    <main className="st">
        <DeskHeader
          city={city ?? undefined}
          kicker={city ? `Stories · ${city}` : "Stories · all cities"}
          title={city ? <>Animal records in <em>{city}</em></> : <>Animal records, <em>followed through care</em></>}
          lede="Care, discharge and outcomes appear only where the source actually records them."
          figures={[
            { label: city ? `animals with case histories in ${city}` : cityCount > 1 ? "animals with case histories across all cities" : "animals with case histories", value: totalForScope },
            ...(paged ? [{ label: "shown on this page", value: stories.length, tone: "quiet" as const }] : []),
            ...(median != null ? [{ label: "median span to a recorded ending, in the stories shown", value: span(median) }] : []),
          ]}
          actions={<Link href="/report" className="dk-btn is-flame">Report an animal <ArrowUpRight size={15} /></Link>}
        >
          {cityChips.length > 0 && (
            <nav className="st-cities" aria-label="Browse rescue records by city">
              <Link href="/stories" className={!city ? "is-on" : ""}>All cities</Link>
              {cityChips.map((c) => (
                <Link key={c.city} href={`/stories?city=${encodeURIComponent(c.city)}`} className={city && c.city.toLowerCase() === city.toLowerCase() ? "is-on" : ""}>{c.city}</Link>
              ))}
            </nav>
          )}
        </DeskHeader>
        {stories.length ? <StoryAtlas stories={stories} /> : page.error ? <section className="st-empty" aria-label="Public records temporarily unavailable">
          <div><span className="st-empty-index">THE ATLAS / PUBLIC FIELD RECORDS</span><h2>The record is reconnecting.</h2><p>Stories exist, but the public record could not be read just now. Try this page again shortly; do not treat this state as an empty register.</p></div>
          <ol><li><b>01</b><span>Encounter</span></li><li><b>02</b><span>Care if recorded</span></li><li><b>03</b><span>Outcome if known</span></li></ol>
        </section> : <section className="st-empty" aria-label="How stories reach the map">
          <div><span className="st-empty-index">THE ATLAS / PUBLIC FIELD RECORDS</span><h2>Every record starts somewhere.</h2><p>No public animal record is available yet. Stories show only what the source actually establishes: an encounter, care when documented, and a discharge or outcome when recorded.</p></div>
          <ol><li><b>01</b><span>Encounter</span></li><li><b>02</b><span>Care if recorded</span></li><li><b>03</b><span>Outcome if known</span></li></ol>
        </section>}
        {page.next && <p className="st-more"><Link className="sys-btn is-quiet" href={`/stories?${city ? `city=${encodeURIComponent(city)}&` : ""}beforeAt=${encodeURIComponent(page.next.occurredAt)}&beforeId=${encodeURIComponent(page.next.id)}`}>Older stories <ArrowUpRight size={15} /></Link></p>}
    </main>
  );
}

export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ beforeAt?: string; beforeId?: string; city?: string }> }) {
  const params = await searchParams;
  const before = params.beforeAt && params.beforeId && Number.isFinite(Date.parse(params.beforeAt)) && /^[0-9a-f-]{36}$/i.test(params.beforeId) ? { occurredAt: new Date(params.beforeAt).toISOString(), id: params.beforeId } : null;
  const rawCity = params.city?.trim().slice(0, 100) || null;
  const city = rawCity === "New Delhi" ? "Delhi" : rawCity === "Secunderabad" ? "Hyderabad" : rawCity;
  return <AppShell><Suspense fallback={<main className="st"><DeskHeader kicker="Stories" title={<>Animal records, <em>followed through care</em></>} lede="Loading the latest public records…" figures={[{ label: "public records", value: null }]} actions={<Link href="/report" className="dk-btn is-flame">Report an animal <ArrowUpRight size={15} /></Link>} /></main>}><StoriesData before={before} city={city} /></Suspense></AppShell>;
}
