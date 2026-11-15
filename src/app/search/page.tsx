import { findAnimals, findPlaces, getMapCities } from "@/lib/livingmap/server";
import { getPartnerDirectory } from "@/lib/partners";
import { getPublicProgrammes } from "@/lib/public-programmes";
import { COURSES } from "@/sp/learn/content";
import { PubPage } from "@/sp4/pub/kit";
import { SearchPage, type Hit } from "@/sp4/pub/search/SearchPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search, StrayPaw", robots: { index: false, follow: true } };

export default async function SearchRoute({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  if (q.length < 3) return <PubPage><SearchPage q={q} groups={[]} /></PubPage>;
  const t = q.toLowerCase();
  const failed: string[] = [];
  /* A read that fails is said, not shown as "nothing matches". */
  const read = <T,>(label: string, p: Promise<T[]>) => p.catch(() => { failed.push(label); return [] as T[]; });
  const [cities, places, animals, orgs, progs] = await Promise.all([
    read("Cities", getMapCities()), read("Places", findPlaces(q)), read("Animals", findAnimals(q)), read("Organisations", getPartnerDirectory()), read("Programmes", getPublicProgrammes(250)),
  ]);
  const groups: { kind: string; hits: Hit[] }[] = [
    { kind: "Cities", hits: cities.filter((c) => c.city.toLowerCase().includes(t)).slice(0, 6).map((c) => ({ kind: "City", title: c.city, detail: `${c.animals.toLocaleString("en-IN")} animal profiles · ${c.cases.toLocaleString("en-IN")} requests on the record`, href: `/community?city=${encodeURIComponent(c.city)}` })) },
    { kind: "Places", hits: places.slice(0, 12).map((p) => ({ kind: "Place", title: p.name, detail: `${p.city} · ${p.animals.toLocaleString("en-IN")} animal record${p.animals === 1 ? "" : "s"} placed in this locality`, href: `/community?city=${encodeURIComponent(p.city)}&place=${encodeURIComponent(p.name)}` })) },
    { kind: "Animals", hits: animals.slice(0, 12).map((a) => ({ kind: "Animal", title: a.title, detail: [a.zone?.split(",")[0], a.city].filter(Boolean).join(", ") || "Area not published", href: `/animal/${a.id}` })) },
    { kind: "Organisations", hits: orgs.filter((o) => `${o.name} ${o.city ?? ""}`.toLowerCase().includes(t)).slice(0, 8).map((o) => ({ kind: "Organisation", title: o.name, detail: [o.kind, o.city].filter(Boolean).join(" · "), href: `/community/organisations/${o.slug}` })) },
    { kind: "Programmes", hits: progs.filter((p) => `${p.name} ${p.ngo_name} ${p.city ?? ""} ${p.zone ?? ""}`.toLowerCase().includes(t)).slice(0, 8).map((p) => ({ kind: "Programme", title: p.name, detail: [p.ngo_name, p.city].filter(Boolean).join(" · "), href: `/city/programmes/${p.id}` })) },
    { kind: "Lessons", hits: COURSES.flatMap((c) => c.lessons.map((l) => ({ c, l }))).filter(({ c, l }) => `${l.title} ${c.title} ${l.takeaway}`.toLowerCase().includes(t)).slice(0, 6).map(({ c, l }) => ({ kind: "Lesson", title: l.title, detail: `${c.title} · ${l.minutes} min`, href: `/learn/courses/${c.id}/${l.id}` })) },
  ];
  return <PubPage><SearchPage q={q} groups={groups} failed={failed} /></PubPage>;
}
