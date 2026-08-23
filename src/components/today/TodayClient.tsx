"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Map as MapIcon,
  ArrowRight,
  HeartPulse,
  ShieldCheck,
  Users,
  Activity,
  Star,
  Newspaper,
  Plus,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFollows } from "@/lib/follows";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { TiltCard } from "@/components/ux/TiltCard";
import { markerStateFor, MARKER_META } from "@/lib/marker-state";
import { coverage } from "@/lib/dashboard-metrics";
import { dogLabel, timeAgo, distanceMeters } from "@/lib/utils";
import { newsCategory, type NewsItem } from "@/lib/news";
import type { Dog, Sighting } from "@/lib/types";

export function TodayClient({
  dogs,
  sightings,
  news = [],
}: {
  dogs: Dog[];
  sightings: Sighting[];
  news?: NewsItem[];
}) {
  const { user } = useAuth();
  const { isFollowing } = useFollows();
  const firstName = user?.name?.trim().split(/\s+/)[0] || null;
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const cov = coverage(dogs);
  const needy = useMemo(() => {
    const list = dogs.filter((d) => d.needs_help);
    const sorted = coords
      ? [...list].sort((a, b) => distanceMeters(coords, a) - distanceMeters(coords, b))
      : [...list].sort((a, b) => +new Date(b.last_seen) - +new Date(a.last_seen));
    return sorted.slice(0, 10);
  }, [dogs, coords]);
  const following = useMemo(
    () => dogs.filter((d) => isFollowing(d.id)).slice(0, 12),
    [dogs, isFollowing]
  );
  const mosaic = useMemo(() => {
    const tiles: { id: string; photo: string; href: string }[] = [];
    for (const s of sightings) {
      if (!s.photo_url) continue;
      tiles.push({ id: s.id, photo: s.photo_url, href: s.dog_id ? `/dog/${s.dog_id}` : "/feed" });
      if (tiles.length >= 9) break;
    }
    return tiles;
  }, [sightings]);
  const activity = useMemo(
    () => [...sightings].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 14),
    [sightings]
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-20 sm:px-6 lg:max-w-6xl">
      {/* ── Welcome hero ─────────────────────────────────────────── */}
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-black/[0.06] bg-paw-50 p-6 shadow-card dark:border-white/10 dark:bg-bark-900 sm:p-8">
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-paw-600 dark:text-paw-300">{dateLabel || "Today"}</p>
          <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {greeting()}
            {firstName && <span className="text-paw-600 dark:text-paw-400">, {firstName}</span>}
          </h1>
          <p className="mt-2 max-w-md text-[15px] leading-snug text-bark-600 dark:text-bark-300">
            Spot an animal, drop a pin, and partner NGOs take it from there.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/report" className="btn-primary px-5 py-3 text-[15px]">
              <Plus className="h-4 w-4" /> Report a sighting
            </Link>
            <Link href="/map" className="btn-ghost px-5 py-3 text-[15px]">
              <MapIcon className="h-4 w-4" /> Open the map
            </Link>
          </div>

          <div className="mt-6 flex items-stretch gap-5 border-t border-black/[0.06] pt-5 dark:border-white/10 sm:gap-8">
            <HeroStat icon={<Users className="h-4 w-4" />} value={cov.tracked} label="tracked" />
            <span className="w-px self-stretch bg-black/[0.06] dark:bg-white/10" />
            <HeroStat icon={<HeartPulse className="h-4 w-4" />} value={cov.needsHelp} label="need help" tone="injured" />
            <span className="w-px self-stretch bg-black/[0.06] dark:bg-white/10" />
            <HeroStat icon={<ShieldCheck className="h-4 w-4" />} value={`${cov.sterilisedPct}%`} label="sterilised" tone="sterilised" />
          </div>
        </div>
      </section>

      {/* dogs you follow */}
      {following.length > 0 && (
        <Section title="Dogs you follow" icon={<Star className="h-4 w-4 text-status-hungry" />}>
          <CardRow>
            {following.map((dog) => <DogCard key={dog.id} dog={dog} width="w-36" photo="h-24" />)}
          </CardRow>
        </Section>
      )}

      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
        {/* main column */}
        <div className="lg:col-span-2">
          {/* photo mosaic → the map */}
          <Section title="Fresh from the street" href="/feed" cta="See feed">
            {mosaic.length > 0 ? (
              <TiltCard max={6} className="overflow-hidden rounded-3xl border border-black/[0.06] shadow-card dark:border-white/10">
                <div className="grid grid-cols-3 gap-0.5">
                  {mosaic.map((t) => (
                    <Link key={t.id} href={t.href} className="group relative block aspect-square overflow-hidden">
                      <DogPhoto src={t.photo} alt="Street animal" seed={t.id} className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              </TiltCard>
            ) : (
              <EmptyCard icon={<MapIcon className="h-7 w-7" />} text="No street animals mapped near you yet. Be the first to add one." />
            )}
            <Link href="/map" className="btn-primary mt-3 w-full py-3.5 text-[15px]">
              <MapIcon className="h-4 w-4" /> Open the full map <ArrowRight className="h-4 w-4" />
            </Link>
          </Section>

          {/* near you need help */}
          <Section title={coords ? "Near you · need help" : "Needs help now"} icon={<HeartPulse className="h-4 w-4 text-status-injured" />} href="/help" cta="See all">
            {needy.length === 0 ? (
              <EmptyCard icon={<ShieldCheck className="h-6 w-6" />} text="No animals flagged as needing help right now." />
            ) : (
              <CardRow>
                {needy.map((dog) => (
                  <DogCard key={dog.id} dog={dog} width="w-40" photo="h-28" dist={coords ? distanceMeters(coords, dog) : null} />
                ))}
              </CardRow>
            )}
          </Section>

          {/* news */}
          {news.length > 0 && (
            <Section title="News & orders" icon={<Newspaper className="h-4 w-4 text-paw-500" />} href="/news" cta="All news">
              <CardRow>
                {news.map((n) => {
                  const cat = newsCategory(n.category);
                  return (
                    <a key={n.id} href={n.source_url} target="_blank" rel="noopener noreferrer" className="flex w-64 shrink-0 flex-col rounded-2xl border border-black/[0.06] bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:shadow-pop dark:border-white/10 dark:bg-bark-900/50 sm:w-72">
                      <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-paw-100 px-2 py-0.5 text-[11px] font-bold text-paw-700 dark:bg-paw-900/30 dark:text-paw-300">
                        {cat.emoji} {cat.label}
                      </span>
                      <p className="line-clamp-3 text-sm font-semibold leading-snug">{n.title}</p>
                      <p className="mt-auto pt-2 text-[11px] text-bark-400">
                        {n.source_name ?? "Source"}{n.published_at && ` · ${timeAgo(n.published_at)}`}
                      </p>
                    </a>
                  );
                })}
              </CardRow>
            </Section>
          )}
        </div>

        {/* sidebar */}
        <div>
          <Section title="Live activity" icon={<Activity className="h-4 w-4 text-status-sterilised" />}>
            {activity.length === 0 ? (
              <EmptyCard icon={<Activity className="h-6 w-6" />} text="Nothing yet today." />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/70 dark:border-white/10 dark:bg-bark-900/50">
                {activity.map((s, idx) => <ActivityRow key={s.id} s={s} first={idx === 0} />)}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function HeroStat({ icon, value, label, tone = "paw" }: { icon: React.ReactNode; value: string | number; label: string; tone?: "paw" | "injured" | "sterilised" }) {
  const color = tone === "injured" ? "text-status-injured" : tone === "sterilised" ? "text-status-sterilised" : "text-paw-600 dark:text-paw-400";
  return (
    <div className="min-w-0">
      <span className={`mb-1 inline-flex ${color}`}>{icon}</span>
      <div className="font-display text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-bark-400">{label}</div>
    </div>
  );
}

function Section({ title, icon, href, cta, children }: { title: string; icon?: React.ReactNode; href?: string; cta?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="h-4 w-1 rounded-full bg-paw-500" />
          {icon}
          {title}
        </h2>
        {href && cta && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-paw-600 hover:text-paw-700 dark:text-paw-300">
            {cta} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function CardRow({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">{children}</div>;
}

function DogCard({ dog, width, photo, dist }: { dog: Dog; width: string; photo: string; dist?: number | null }) {
  const meta = MARKER_META[markerStateFor(dog)];
  return (
    <Link href={`/dog/${dog.id}`} className={`${width} group shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-all hover:-translate-y-0.5 hover:shadow-pop dark:border-white/10 dark:bg-bark-900`}>
      <div className="relative">
        <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} className={`${photo} w-full transition-transform duration-300 group-hover:scale-105`} />
        <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: meta.color }}>
          {meta.label}
        </span>
        {dist != null && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-semibold">{dogLabel(dog)}</p>
        <p className="truncate text-xs text-bark-400">{dog.zone}</p>
      </div>
    </Link>
  );
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-black/[0.1] bg-white/40 p-10 text-center dark:border-white/10 dark:bg-bark-900/30">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">{icon}</span>
      <p className="max-w-xs text-sm text-bark-500">{text}</p>
    </div>
  );
}

// Seeded pseudonym so the live feed shows varied community names instead of the
// same seeded reporter over and over.
const FEED_NAMES = ["Priya", "Rohit", "Aisha", "Arjun", "Neha", "Kabir", "Meera", "Vikram", "Sanya", "Dev", "Ananya", "Karan", "Isha", "Raj", "Tara", "Nikhil", "Zara", "Aditya"];
function pseudoName(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FEED_NAMES[h % FEED_NAMES.length];
}

function ActivityRow({ s, first }: { s: Sighting; first?: boolean }) {
  return (
    <Link href={s.dog_id ? `/dog/${s.dog_id}` : "/feed"} className={`flex items-center gap-3 p-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${first ? "" : "border-t border-black/[0.05] dark:border-white/[0.06]"}`}>
      <DogPhoto src={s.photo_url} alt="" seed={s.id} className="h-9 w-9 rounded-full ring-2 ring-paw-100 dark:ring-paw-900/40" />
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold">{pseudoName(s.id)}</span>{" "}
        <span className="text-bark-500">spotted an animal near {s.zone}</span>
      </p>
      <span className="shrink-0 text-xs text-bark-400">{timeAgo(s.created_at)}</span>
    </Link>
  );
}
