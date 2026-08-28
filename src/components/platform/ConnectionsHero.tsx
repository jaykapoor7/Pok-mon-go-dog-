"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimalMark } from "@/components/brand/Logo";
import { SectionLabel, Figure } from "@/components/platform/viz";
import { cn } from "@/lib/utils";

export interface ConnectionStop {
  id: string;
  label: string;
  dot: string;
  headline: string;
  body: string;
  stat: string;
  statLabel: string;
}

/** A scroll-driven 3D "connections" model: four data sources orbit StrayPaw's
 *  mark, and each is pulled forward as its explainer stop scrolls into view. */
export function ConnectionsHero({ stops }: { stops: ConnectionStop[] }) {
  const [active, setActive] = useState(0);
  const stopRefs = useRef<(HTMLDivElement | null)[]>([]);

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
    <section className="relative grid gap-2 pt-6 sm:pt-10 lg:grid-cols-2 lg:gap-16">
      {/* Pinned 3D scene */}
      <div className="pointer-events-none order-2 flex h-[46vh] items-center justify-center lg:sticky lg:top-16 lg:order-1 lg:h-[calc(100vh-4rem)]">
        <div className="connections-scene">
          <div
            className={cn("connections-ring", active === 0 ? "is-idle" : "is-locked")}
            style={active > 0 ? { transform: `rotateY(${-(active - 1) * 90}deg)` } : undefined}
          >
            {stops.map((s, i) => {
              // Counter-rotate each label so it stays upright and facing the
              // viewer, accounting for both the node's own orbit position and
              // any rotation the ring has been locked to.
              const counter = active > 0 ? (active - 1 - i) * 90 : -(i * 90);
              const isActive = active === i + 1;
              const isDimmed = active > 0 && !isActive;
              return (
                <div key={s.id} className="connections-node" style={{ "--angle": `${i * 90}deg` } as React.CSSProperties}>
                  <div
                    className={cn("connections-card", isActive && "is-active", isDimmed && "is-dimmed")}
                    style={{ transform: `translate(-50%, -50%) rotateY(${counter}deg) scale(${isActive ? 1.15 : isDimmed ? 0.8 : 1})` }}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.dot }} />
                    {s.label}
                  </div>
                </div>
              );
            })}
            <div className="connections-core">
              <AnimalMark className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll stops */}
      <div className="order-1 lg:order-2">
        <div data-stop={0} ref={(el) => { stopRefs.current[0] = el; }} className="flex min-h-[44vh] flex-col justify-center lg:min-h-[70vh]">
          <SectionLabel>Street-dog data, intelligence &amp; action · India</SectionLabel>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Better knowledge, <span className="text-paw-600 dark:text-paw-400">better action</span> for India&apos;s street dogs.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-bark-600 dark:text-bark-300">
            StrayPaw makes fragmented street-dog information understandable. Scroll to see the four kinds of data it connects.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/explore" className="btn-primary px-6 py-3 text-base">Explore the data <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/insights" className="btn-ghost px-6 py-3 text-base">Read the insights</Link>
          </div>
        </div>

        {stops.map((s, i) => (
          <div
            key={s.id}
            data-stop={i + 1}
            ref={(el) => { stopRefs.current[i + 1] = el; }}
            className="flex min-h-[40vh] flex-col justify-center border-t border-black/[0.07] py-8 dark:border-white/[0.08] lg:min-h-[60vh]"
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: s.dot }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} /> {s.label}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{s.headline}</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">{s.body}</p>
            <div className="mt-5"><Figure value={s.stat} label={s.statLabel} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
