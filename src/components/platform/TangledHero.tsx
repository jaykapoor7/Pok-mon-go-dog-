"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionLabel } from "@/components/platform/viz";
import { THREAD_META } from "./TangledScene";

// The 3D scene is a client-only WebGL bundle — load it lazily so it only ships
// on this route and doesn't block SSR.
const TangledScene = dynamic(() => import("./TangledScene").then((m) => m.TangledScene), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

interface Stop {
  id: string;
  label: string;
  color: string;
  reality: string;
  strayPaw: string;
  you: string;
}

const STOPS: Stop[] = [
  {
    id: "government",
    label: "Government",
    color: THREAD_META[0].color,
    reality: "The 20th Livestock Census, NCDC's rabies surveillance and the Supreme Court's ABC compliance orders sit across ministries, PDFs and press releases that never talk to each other.",
    strayPaw: "We normalise each source into one model — year, geography, confidence and citation attached to every figure.",
    you: "Read what's actually published (and what isn't) for your state on Explore.",
  },
  {
    id: "ngo",
    label: "NGO",
    color: THREAD_META[1].color,
    reality: "Groups like Blue Cross of India, PFA, Karuna Society and Animal Aid Unlimited have run rescue, sterilisation and vaccination for decades — but no unified, machine-readable directory exists.",
    strayPaw: "We keep a growing, verified directory of real organisations linked by city and state.",
    you: "Find who's actually working where you live on Take Action.",
  },
  {
    id: "community",
    label: "Community",
    color: THREAD_META[2].color,
    reality: "The freshest picture of India's street dogs lives in the eyes of neighbours, feeders and volunteers. Until now, there's no easy way for that ground-level knowledge to add up.",
    strayPaw: "The map and the one-tap report flow are exactly that pipeline — timestamped, geo-tagged sightings from anyone who sees a dog.",
    you: "Open the map, spot a dog, tap Report. That's it.",
  },
  {
    id: "research",
    label: "Research",
    color: THREAD_META[3].color,
    reality: "Independent modelling puts India's true rabies burden around 19,000 deaths a year — roughly 350x the officially reported figure. Findings like this rarely leave academic journals.",
    strayPaw: "Every claim on Insights traces to a real, linkable source — with the modelling caveats intact, never summarised away.",
    you: "See the evidence — and the gaps — on Research and Insights.",
  },
];

export function TangledHero() {
  const [active, setActive] = useState(0);
  const stopRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.stop));
          }
        }
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
    );
    stopRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative grid gap-2 pt-2 sm:pt-6 lg:grid-cols-2 lg:gap-12 lg:pt-10">
      {/* Pinned 3D scene — sticky on both mobile and desktop so it's the
         first thing you see and stays visible while stops scroll past.
         Opaque background on mobile so text stops scroll cleanly beneath. */}
      <div className="sticky top-[4.5rem] z-10 h-[42vh] bg-paper dark:bg-ink lg:top-16 lg:h-[calc(100vh-4rem)] lg:bg-transparent lg:dark:bg-transparent">
        {/* Subtle bottom fade on mobile so the sticky edge feels intentional, not clipped */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-b from-transparent to-paper dark:to-ink lg:hidden" />
        <div className="relative h-full">
          <TangledScene active={active} labelRefs={labelRefs} />
          {/* Floating labels — DOM elements positioned in screen-space by TangledScene per frame */}
          {STOPS.map((s, i) => (
            <div
              key={s.id}
              ref={(el) => { labelRefs.current[i] = el; }}
              className="pointer-events-none absolute left-0 top-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.08] bg-paper/95 px-2.5 py-1 text-[11px] font-semibold shadow-card backdrop-blur-sm transition-opacity duration-300 dark:border-white/10 dark:bg-ink/90"
              style={{ opacity: 0 }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
              {s.label}
            </div>
          ))}
          {/* Small hint at the very start, fades once anything detangles */}
          <div
            className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-bark-900/85 px-3 py-1 text-[11px] font-medium text-white transition-opacity duration-500 dark:bg-white/85 dark:text-bark-900 ${
              active === 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            Scroll to untangle
          </div>
        </div>
      </div>

      {/* Scroll stops */}
      <div>
        <div
          data-stop={0}
          ref={(el) => { stopRefs.current[0] = el; }}
          className="flex min-h-[52vh] flex-col justify-center pt-2 lg:min-h-[calc(100vh-4rem)] lg:pt-0"
        >
          <SectionLabel>Street-dog data, intelligence &amp; action · India</SectionLabel>
          <h1 className="mt-4 font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
            It&apos;s all <span className="text-paw-600 dark:text-paw-400">tangled</span> — until it isn&apos;t.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-bark-600 dark:text-bark-300">
            Everything we already know about India&apos;s street dogs — the census, Supreme Court orders, welfare organisations, community sightings, peer-reviewed studies — is scattered across places that don&apos;t talk to each other. Scroll to see StrayPaw pull the threads apart.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/map" className="btn-primary px-6 py-3 text-base">Open the map <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/insights" className="btn-ghost px-6 py-3 text-base">Read the insights</Link>
          </div>
        </div>

        {STOPS.map((s, i) => (
          <div
            key={s.id}
            data-stop={i + 1}
            ref={(el) => { stopRefs.current[i + 1] = el; }}
            className="flex min-h-[48vh] flex-col justify-center border-t border-black/[0.07] py-8 dark:border-white/[0.08] lg:min-h-[calc(100vh-4rem)]"
          >
            <span
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: s.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold leading-snug tracking-tight sm:text-[26px]">
              {s.reality}
            </h2>
            <div className="mt-5 max-w-xl rounded-2xl border border-black/[0.07] p-4 dark:border-white/[0.1]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-paw-600 dark:text-paw-300">
                What StrayPaw does
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-bark-700 dark:text-bark-200">{s.strayPaw}</p>
            </div>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-bark-500">
              <span className="font-semibold text-bark-700 dark:text-bark-200">You →</span> {s.you}
            </p>
          </div>
        ))}

        {/* Final "now you can" summary */}
        <div
          data-stop={STOPS.length + 1}
          ref={(el) => { stopRefs.current[STOPS.length + 1] = el; }}
          className="flex min-h-[48vh] flex-col justify-center border-t border-black/[0.07] py-8 dark:border-white/[0.08] lg:min-h-[calc(100vh-4rem)]"
        >
          <SectionLabel>Now you can</SectionLabel>
          <h2 className="mt-2 font-display text-3xl font-extrabold leading-snug tracking-tight sm:text-4xl">
            Do something with the untangled picture.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">
            Explore where the gaps are worst. Read the evidence. Find the real organisations working near you. Add what you see on the ground. Every action tightens the picture for the next person.
          </p>
          <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
            <Link href="/explore" className="btn-ghost justify-center px-4 py-3">Explore data</Link>
            <Link href="/take-action" className="btn-ghost justify-center px-4 py-3">Take action</Link>
            <Link href="/report" className="btn-primary justify-center px-4 py-3">Report a sighting</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
