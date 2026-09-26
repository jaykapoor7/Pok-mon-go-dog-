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
export const metadata = { title: "Rescue stories, StrayPaw", description: "Rescues with a recorded issue, care and outcome, each followed on the map from the day it was reported to the day it ended." };

/* ════════════════════════════════════════════════════════════════════
   Stories: rescues that finished, told by their own record.

   A story is only published when the record holds an issue, care, an
   outcome and a date. The page is an atlas of them: every rescue is a
   numbered place on the city's streets, and the one chosen is told as a
   route from the day it was reported to the day it ended. The numbered
   index below is the same set, for reading down.
   ════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;
const span = (d: number) => (d >= 60 ? `${Math.round(d / 30)} months` : d === 1 ? "1 day" : `${d} days`);

/* Care titles arrive as the register wrote them: "NGO Treatment",
   "Maggots · KNG Pudur". Keep the kind of care, drop the prefix and the place. */
const careWhat = (t: string) => {
  const s = t.split(" · ")[0].replace(/^ngo\s+/i, "").trim().toLowerCase();
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
    careBy.set(e.dog_id, [...(careBy.get(e.dog_id) ?? []), { at, what: careWhat(e.title) }]);
  }
  return [...byDog.entries()].map(([dogId, rows]) => {
    const latest = [...rows].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))[0];
    const start = Date.parse(latest.occurred_at);
    const endMs = latest.resolved_at && Date.parse(latest.resolved_at) > start + DAY / 2 && Date.parse(latest.resolved_at) <= now ? Date.parse(latest.resolved_at) : null;
    const careRows = (careBy.get(dogId) ?? []).filter((c) => c.at >= start - DAY && (!endMs || c.at <= endMs + 30 * DAY)).sort((a, b) => a.at - b.at);
    const cat = rescueCategory({ subtype: latest.category, title: latest.title, detail: latest.outcome });
    return {
      id: dogId,
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
  const base = build(cases, care).slice(0, 24);
  const places = await placesOf(base.map((s) => s.id));
  const stories: Story[] = base.map((s, i) => ({ ...s, n: i + 1, pt: places.get(s.id)?.pt ?? null }));

  const lengths = stories.filter((s) => s.end).map((s) => Math.round((Date.parse(s.end!) - Date.parse(s.reported)) / DAY)).sort((a, b) => a - b);
  const median = lengths.length ? lengths[Math.floor(lengths.length / 2)] : null;
  const cities = new Map<string, number>();
  for (const s of base) { const c = places.get(s.id)?.city; if (c) cities.set(c, (cities.get(c) ?? 0) + 1); }
  const city = [...cities.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <AppShell>
      <main className="st">
        <header className="st-head">
          <h1>Rescues, <em>followed to the&nbsp;end.</em></h1>
          {stories.length > 0 && (
            <p className="st-lede">
              <b>{stories.length}</b> recent rescues{city ? <> in {city}</> : null}, each with an issue, care and an outcome on the record
              {median != null ? <>. Half were over within <b>{span(median)}</b></> : null}.
            </p>
          )}
          <Link href="/report" className="sys-btn is-flame">Report an animal <ArrowUpRight size={15} /></Link>
        </header>
        {stories.length ? <StoryAtlas stories={stories} /> : <p className="st-empty">No finished rescue has been published yet.</p>}
      </main>
    </AppShell>
  );
}
