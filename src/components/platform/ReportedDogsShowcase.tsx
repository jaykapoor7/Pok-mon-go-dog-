"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, MapPin, Syringe, Scissors } from "lucide-react";
import type { Dog } from "@/lib/types";

/* ───────────────────────────────────────────────────────────────────
   Real reported dogs — horizontal flythrough carousel. Each card comes
   into focus as it nears the center of the viewport and recedes at the
   edges, echoing the "image tunnel" reference without the WebGL cost.
   Real photos and real fields only; renders an honest empty state if
   no dogs have a photo yet, no fabricated entries.
─────────────────────────────────────────────────────────────────── */

function ShowcaseCard({ dog, containerRef }: { dog: Dog; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const { scrollXProgress } = useScroll({
    container: containerRef,
    target: cardRef,
    axis: "x",
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollXProgress, [0, 0.5, 1], [0.9, 1, 0.9]);
  const opacity = useTransform(scrollXProgress, [0, 0.5, 1], [0.5, 1, 0.5]);

  const location = dog.zone || dog.city || "India";

  return (
    <Link
      href={`/dog/${dog.id}`}
      ref={cardRef}
      className="group relative shrink-0 snap-center overflow-hidden rounded-2xl border border-white/10"
      style={{ width: "min(78vw, 320px)" }}
    >
      <motion.div style={{ scale, opacity }} className="relative aspect-[4/5] w-full">
        <Image
          src={dog.cover_photo}
          alt={dog.name ? `${dog.name}, a street dog in ${location}` : `A street dog in ${location}`}
          fill
          sizes="320px"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          {dog.name && (
            <p className="font-display text-lg font-bold text-white">
              {dog.name}
            </p>
          )}
          <p className="mt-0.5 flex items-center gap-1 text-xs text-white/70">
            <MapPin className="h-3 w-3" /> {location}
          </p>
          {(dog.sterilised || dog.vaccinated) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dog.sterilised && (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-sterilised/20 px-2 py-0.5 text-[11px] font-semibold text-status-sterilised">
                  <Scissors className="h-2.5 w-2.5" /> Sterilised
                </span>
              )}
              {dog.vaccinated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-vaccinated/20 px-2 py-0.5 text-[11px] font-semibold text-status-vaccinated">
                  <Syringe className="h-2.5 w-2.5" /> Vaccinated
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export function ReportedDogsShowcase({ dogs }: { dogs: Dog[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (dogs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
        <p className="font-display text-lg font-bold tracking-tight">
          No reported dogs have a photo yet.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-bark-600 dark:text-bark-300">
          This is where real, reported street dogs will show up as the community adds
          them. Be the first.
        </p>
        <Link
          href="/report"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-paw-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-paw-600"
        >
          Report a dog <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {dogs.map((dog) => (
        <ShowcaseCard key={dog.id} dog={dog} containerRef={containerRef} />
      ))}
    </div>
  );
}
