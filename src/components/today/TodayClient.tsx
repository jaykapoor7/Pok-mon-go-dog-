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
  Images,
  HeartHandshake,
  Utensils,
  Building2,
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

  useEffect(() => {
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
  // Photo mosaic hero, recent real sighting photos (warmer than an empty map).
  const mosaic = useMemo(() => {
    const tiles: { id: string; photo: string; href: string }[] = [];
    for (const s of sightings) {
      if (!s.photo_url) continue;
      tiles.push({
        id: s.id,
        photo: s.photo_url,
        href: s.dog_id ? `/dog/${s.dog_id}` : "/feed",
      });
      if (tiles.length >= 9) break;
    }
    return tiles;
  }, [sightings]);
  const activity = useMemo(
    () =>
      [...sightings]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 8),
    [sightings]
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-20 sm:px-6 lg:max-w-6xl">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-extrabold tracking-tightest sm:text-4xl">
          {greeting()}
          {firstName && (
            <span className="text-paw-600 dark:text-paw-400">, {firstName}</span>
          )}
        </h1>
        {/* one-line hero: what StrayPaw is, for first-time visitors */}
        <p className="mt-1.5 text-[15px] leading-snug text-bark-500 dark:text-bark-300">
          Spot an animal → drop a pin → partner NGOs take it from there.
        </p>
      </header>

      {/* Explore, prominent quick access to the surfaces that used to be buried
          in the menu (sightings feed, fundraisers, feeding zones, orgs). */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { href: "/feed", label: "Sightings feed", icon: Images, tone: "text-paw-600 bg-paw-100 dark:bg-bark-800 dark:text-paw-300" },
          { href: "/fundraisers", label: "Fundraisers", icon: HeartHandshake, tone: "text-status-injured bg-[#c0492e]/10" },
          { href: "/feeding", label: "Feeding zones", icon: Utensils, tone: "text-status-hungry bg-[#d9a441]/15" },
          { href: "/orgs", label: "Organizations", icon: Building2, tone: "text-status-sterilised bg-[#3e8473]/12" },
        ].map(({ href, label, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="card card-interactive flex flex-col items-start gap-2 p-3.5"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[13px] font-semibold leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* dogs you follow (device-local) */}
      {following.length > 0 && (
        <Section title="Dogs you follow" icon={<Star className="h-4 w-4 text-status-hungry" />}>
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {following.map((dog) => {
              const meta = MARKER_META[markerStateFor(dog)];
              return (
                <Link
                  key={dog.id}
                  href={`/dog/${dog.id}`}
                  className="w-36 shrink-0 overflow-hidden rounded-2xl bg-white shadow-card dark:bg-bark-900"
                >
                  <div className="relative">
                    <DogPhoto src={dog.cover_photo} alt="Followed dog" seed={dog.id} className="h-24 w-full" />
                    <span
                      className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-semibold">{dogLabel(dog)}</p>
                    <p className="truncate text-xs text-bark-400">{dog.zone}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
        {/* main column */}
        <div className="lg:col-span-2">
      {/* impact strip */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        <Stat icon={<Users className="h-4 w-4" />} value={cov.tracked} label="tracked" />
        <Stat icon={<HeartPulse className="h-4 w-4" />} value={cov.needsHelp} label="need help" tone="injured" />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} value={`${cov.sterilisedPct}%`} label="sterilised" tone="sterilised" />
      </div>

      {/* photo mosaic hero → the map is one tap away */}
      <div className="mb-6">
        {mosaic.length > 0 ? (
          <TiltCard max={7} className="overflow-hidden rounded-3xl border border-black/[0.06] shadow-card dark:border-white/10">
            <div className="grid grid-cols-3 gap-0.5">
              {mosaic.map((t) => (
                <Link key={t.id} href={t.href} className="group relative block aspect-square overflow-hidden">
                  <DogPhoto
                    src={t.photo}
                    alt="Street dog"
                    seed={t.id}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
              ))}
            </div>
          </TiltCard>
        ) : (
          <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">
              <MapIcon className="h-7 w-7" />
            </span>
            <p className="text-sm text-bark-500">
              No street animals mapped near you yet, be the first to add one.
            </p>
          </div>
        )}
        <Link href="/map" className="btn-primary mt-3 w-full py-3">
          <MapIcon className="h-4 w-4" /> Open the full map
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* near you need help */}
      <Section title={coords ? "Near you · need help" : "Needs help now"} href="/help" cta="See all">
        {needy.length === 0 ? (
          <p className="text-sm text-bark-400">No dogs flagged as needing help right now.</p>
        ) : (
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {needy.map((dog) => {
              const meta = MARKER_META[markerStateFor(dog)];
              return (
                <Link
                  key={dog.id}
                  href={`/dog/${dog.id}`}
                  className="w-40 shrink-0 overflow-hidden rounded-2xl bg-white shadow-card dark:bg-bark-900"
                >
                  <div className="relative">
                    <DogPhoto src={dog.cover_photo} alt="Dog needing help" seed={dog.id} className="h-28 w-full" />
                    <span
                      className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-semibold">{dogLabel(dog)}</p>
                    <p className="truncate text-xs text-bark-400">{dog.zone}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {/* News & orders, below the needs-help row */}
      {news.length > 0 && (
        <Section title="News & orders" icon={<Newspaper className="h-4 w-4 text-paw-500" />} href="/news" cta="All news">
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {news.map((n) => {
              const cat = newsCategory(n.category);
              return (
                <a
                  key={n.id}
                  href={n.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-interactive flex w-64 shrink-0 flex-col p-4 sm:w-72"
                >
                  <span className="mb-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-paw-100 px-2 py-0.5 text-[11px] font-bold text-paw-700">
                    {cat.emoji} {cat.label}
                  </span>
                  <p className="line-clamp-3 text-sm font-semibold leading-snug">{n.title}</p>
                  <p className="mt-auto pt-2 text-[11px] text-bark-400">
                    {n.source_name ?? "Source"}
                    {n.published_at && ` · ${timeAgo(n.published_at)}`}
                  </p>
                </a>
              );
            })}
            <Link
              href="/news"
              className="card card-interactive flex w-40 shrink-0 flex-col items-center justify-center gap-1.5 p-4 text-center text-paw-600"
            >
              <Newspaper className="h-6 w-6" />
              <span className="text-sm font-bold">See all news</span>
            </Link>
          </div>
        </Section>
      )}
        </div>
        {/* end main column */}

        {/* sidebar */}
        <div className="lg:sticky lg:top-20">
      {/* live activity */}
      <Section title="Live activity" icon={<Activity className="h-4 w-4 text-status-sterilised" />}>
        {activity.length === 0 ? (
          <p className="text-sm text-bark-400">Nothing yet today.</p>
        ) : (
          <div className="card divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {activity.map((s) => (
              <ActivityRow key={s.id} s={s} />
            ))}
          </div>
        )}
      </Section>
        </div>
        {/* end sidebar */}
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

function Stat({
  icon,
  value,
  label,
  tone = "paw",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone?: "paw" | "injured" | "sterilised";
}) {
  const color =
    tone === "injured" ? "text-status-injured" : tone === "sterilised" ? "text-status-sterilised" : "text-paw-600";
  return (
    <div className="card flex flex-col items-center gap-0.5 p-3 text-center">
      <span className={color}>{icon}</span>
      <span className="font-display text-xl font-extrabold leading-none">{value}</span>
      <span className="text-[10px] text-bark-400">{label}</span>
    </div>
  );
}

function Section({
  title,
  icon,
  href,
  cta,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  href?: string;
  cta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-bold tracking-tightest">
          {icon}
          {title}
        </h2>
        {href && cta && (
          <Link href={href} className="text-xs font-semibold text-paw-600">
            {cta}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ActivityRow({ s }: { s: Sighting }) {
  return (
    <Link
      href={s.dog_id ? `/dog/${s.dog_id}` : "/feed"}
      className="flex items-center gap-3 p-3"
    >
      <DogPhoto src={s.photo_url} alt="" seed={s.id} className="h-9 w-9 rounded-full" />
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold">{s.user_name.split(" ")[0]}</span>{" "}
        <span className="text-bark-500">spotted a dog near {s.zone}</span>
      </p>
      <span className="shrink-0 text-xs text-bark-400">{timeAgo(s.created_at)}</span>
    </Link>
  );
}
