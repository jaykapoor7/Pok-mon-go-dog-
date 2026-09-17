import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { getPublicCaseStories, getPublicCareTimeline, type PublicCaseStory } from "@/lib/community-case-stories";
import { isClosedStatus, rescueCategory, rescueStatusLabel } from "@/lib/rescue-taxonomy";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Animal stories, StrayPaw" };

type Story = {
  dogId: string;
  latest: PublicCaseStory;
  cases: PublicCaseStory[];
  careCount: number;
  active: boolean;
  outcome: string | null;
};

function buildStories(cases: PublicCaseStory[], care: Awaited<ReturnType<typeof getPublicCareTimeline>>) {
  const byDog = new Map<string, PublicCaseStory[]>();
  for (const row of cases) {
    if (!row.dog_id) continue;
    byDog.set(row.dog_id, [...(byDog.get(row.dog_id) ?? []), row]);
  }
  const careByDog = new Map<string, number>();
  for (const row of care) if (row.dog_id) careByDog.set(row.dog_id, (careByDog.get(row.dog_id) ?? 0) + 1);

  return [...byDog.entries()].map(([dogId, rows]): Story => {
    const ordered = [...rows].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
    const active = ordered.some((row) => !isClosedStatus(row.status));
    const outcome = ordered.find((row) => row.outcome)?.outcome ?? null;
    return { dogId, latest: ordered[0], cases: ordered, careCount: careByDog.get(dogId) ?? 0, active, outcome };
  }).sort((a, b) => Number(b.active) - Number(a.active) || +new Date(b.latest.occurred_at) - +new Date(a.latest.occurred_at));
}

export default async function StoriesPage() {
  const [cases, care] = await Promise.all([getPublicCaseStories(), getPublicCareTimeline()]);
  const stories = buildStories(cases, care);
  const active = stories.filter((story) => story.active);
  const completed = stories.filter((story) => !story.active);

  return <AppShell><main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-black/[.09] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="product-kicker">Animal stories</span>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">The rescue is the story.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 opacity-65">One animal, one continuous record: why help was requested, what rescuers did, care delivered, follow-ups and the final outcome. Cases, treatment and outcomes are not split into duplicate public feeds.</p>
      </div>
      <Link href="/report" className="product-primary">Report an animal <ArrowUpRight size={15}/></Link>
    </header>

    <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Story summary">
      <Metric value={stories.length} label="animals with rescue stories" />
      <Metric value={active.length} label="stories still in progress" />
      <Metric value={completed.length} label="completed journeys" />
    </section>

    <StorySection title="In progress" lede="Animals whose rescue or care journey is still open." stories={active} empty="No in-progress stories are currently published." />
    <StorySection title="Completed journeys" lede="Closed rescue stories with the care and outcome kept attached to the animal." stories={completed} empty="No completed stories are currently published." />
  </main></AppShell>;
}

function StorySection({ title, lede, stories, empty }: { title: string; lede: string; stories: Story[]; empty: string }) {
  return <section className="mt-10">
    <div className="flex items-end justify-between gap-4 border-b border-black/[.09] pb-3"><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm opacity-60">{lede}</p></div><span className="text-xs tabular-nums opacity-50">{stories.length.toLocaleString()}</span></div>
    {stories.length ? <div className="grid gap-4 pt-5 md:grid-cols-2">{stories.map((story) => <StoryCard key={story.dogId} story={story} />)}</div> : <p className="py-8 text-sm opacity-60">{empty}</p>}
  </section>;
}

function StoryCard({ story }: { story: Story }) {
  const row = story.latest;
  const name = row.animal_name || row.animal_code || "Animal record";
  const category = rescueCategory({ subtype: row.category, title: row.title, detail: row.outcome });
  const status = rescueStatusLabel(row.status, row.outcome);
  return <Link href={`/dog/${story.dogId}`} className="group overflow-hidden rounded-xl border border-black/[.08] bg-white transition hover:-translate-y-0.5 hover:shadow-sm">
    <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr]">
      <DogPhoto src={row.cover_photo} alt={name} seed={story.dogId} tone={story.active ? "active" : "resolved"} className="h-full min-h-[185px] w-full" />
      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[.1em]"><span className={story.active ? "text-[#f05b40]" : "text-[#3e8473]"}>{status}</span><span className="opacity-35">·</span><span className="opacity-55">{category}</span></div>
        <h3 className="mt-2 truncate text-lg font-semibold">{name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-5 opacity-70">{row.title || "Rescue record"}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs opacity-55"><MapPin size={12}/><span className="truncate">{row.zone || row.ngo_name || "Location recorded"}</span></div>
        <div className="mt-auto border-t border-black/[.07] pt-3 text-xs leading-5 opacity-65">
          <b className="font-semibold opacity-100">{story.cases.length}</b> case record{story.cases.length === 1 ? "" : "s"} · <b className="font-semibold opacity-100">{story.careCount}</b> care event{story.careCount === 1 ? "" : "s"}
          {story.outcome && <span className="mt-1 block line-clamp-1">Outcome: {story.outcome}</span>}
          <span className="mt-1 block">Latest record {formatDate(row.resolved_at || row.occurred_at)}</span>
        </div>
      </div>
    </div>
  </Link>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-xl border border-black/[.08] bg-white p-4"><b className="text-2xl tabular-nums">{value.toLocaleString()}</b><span className="mt-1 block text-xs font-semibold opacity-60">{label}</span></div>;
}
