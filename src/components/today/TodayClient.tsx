"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Map as MapIcon,
  ArrowRight,
  Trophy,
  HeartPulse,
  ShieldCheck,
  Users,
  Activity,
  Medal,
} from "lucide-react";
import { useDemoMode } from "@/components/demo/DemoModeProvider";
import { DemoToggle } from "@/components/demo/DemoToggle";
import { demoDogs, demoFeedSightings } from "@/lib/demo-sightings";
import { MapCanvas } from "@/components/map/MapCanvas";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { markerStateFor, MARKER_META } from "@/lib/marker-state";
import { coverage, topContributors } from "@/lib/dashboard-metrics";
import { dogLabel, timeAgo, distanceMeters } from "@/lib/utils";
import type { Dog, Sighting } from "@/lib/types";

export function TodayClient({
  dogs: realDogs,
  sightings: realSightings,
}: {
  dogs: Dog[];
  sightings: Sighting[];
}) {
  const { demoOn } = useDemoMode();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const dogs = useMemo(
    () => (demoOn ? [...realDogs, ...demoDogs] : realDogs),
    [demoOn, realDogs]
  );
  const sightings = useMemo(
    () => (demoOn ? [...realSightings, ...demoFeedSightings] : realSightings),
    [demoOn, realSightings]
  );

  const cov = coverage(dogs);
  const needy = useMemo(() => {
    const list = dogs.filter((d) => d.needs_help);
    const sorted = coords
      ? [...list].sort((a, b) => distanceMeters(coords, a) - distanceMeters(coords, b))
      : [...list].sort((a, b) => +new Date(b.last_seen) - +new Date(a.last_seen));
    return sorted.slice(0, 10);
  }, [dogs, coords]);
  const guardians = useMemo(() => topContributors(sightings, 7), [sightings]);
  const activity = useMemo(
    () =>
      [...sightings]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 8),
    [sightings]
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-20 sm:px-6 lg:max-w-6xl">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-paw-600">{greeting()}</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tightest">Today</h1>
        </div>
        <DemoToggle className="mt-1" />
      </header>

      {/* one-line hero: what StrayPaw is, for first-time visitors */}
      <p className="mb-5 text-[15px] leading-snug text-bark-500 dark:text-bark-300">
        Spot a street dog → drop a pin → your neighbourhood sees who needs feeding,
        vaccinating and care.
      </p>

      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
        {/* main column */}
        <div className="lg:col-span-2">
      {/* impact strip */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        <Stat icon={<Users className="h-4 w-4" />} value={cov.tracked} label="tracked" />
        <Stat icon={<HeartPulse className="h-4 w-4" />} value={cov.needsHelp} label="need help" tone="injured" />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} value={`${cov.sterilisedPct}%`} label="sterilised" tone="sterilised" />
      </div>

      {/* minimised live map preview → tap to open full map */}
      <div className="mb-6">
        <div className="relative h-52 overflow-hidden rounded-3xl border border-black/[0.06] shadow-card dark:border-white/10 lg:h-[24rem]">
          <MapCanvas dogs={dogs} />
          {/* transparent overlay: the whole preview opens the full map */}
          <Link href="/map" className="absolute inset-0 z-10" aria-label="Open the full map" />
          <span className="pointer-events-none absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-paw-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-warm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live map
          </span>
        </div>
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
        </div>
        {/* end main column */}

        {/* sidebar */}
        <div className="lg:sticky lg:top-20">
      {/* top guardians */}
      <Section title="This week's top guardians" icon={<Trophy className="h-4 w-4 text-status-hungry" />}>
        {guardians.length === 0 ? (
          <p className="text-sm text-bark-400">No activity yet — be the first guardian.</p>
        ) : (
          <ol className="space-y-1.5">
            {guardians.map((g, i) => (
              <li key={g.name} className="card flex items-center gap-3 p-3">
                <Rank i={i} />
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paw-200 text-xs font-bold text-paw-700">
                  {g.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{g.name}</p>
                  <p className="text-xs text-bark-400">{g.count} {g.count === 1 ? "sighting" : "sightings"}</p>
                </div>
                <span className="font-display text-lg font-extrabold text-paw-600">{g.count}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

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

function Rank({ i }: { i: number }) {
  if (i < 3) {
    const colors = ["#D9A441", "#9A9C88", "#C0492E"];
    return <Medal className="h-5 w-5" style={{ color: colors[i] }} />;
  }
  return <span className="w-5 text-center text-sm font-bold text-bark-400">{i + 1}</span>;
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
