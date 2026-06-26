"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, PlusCircle, PawPrint } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import type { Dog } from "@/lib/types";

export function Hero({ dogs }: { dogs: Dog[] }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 md:pt-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="text-center md:text-left">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="chip mb-5 bg-white text-paw-600 shadow-card"
          >
            <PawPrint className="h-3.5 w-3.5" /> India&apos;s community dog map
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Every dog has a story.
            <span className="block bg-gradient-to-r from-paw-500 to-status-friendly bg-clip-text text-transparent">
              Start seeing them.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-5 max-w-md text-pretty text-base text-bark-600 md:mx-0 md:text-lg"
          >
            Spot a street dog? Snap a photo. Every sighting builds a living map
            that helps volunteers and NGOs feed, vaccinate and rescue India&apos;s
            street dogs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-7 flex flex-col items-center gap-3 sm:flex-row md:items-start md:justify-start"
          >
            <Link href="/report" className="btn-primary w-full px-6 py-3 sm:w-auto">
              <PlusCircle className="h-5 w-5" /> Report a Dog
            </Link>
            <Link href="/map" className="btn-ghost w-full px-6 py-3 sm:w-auto">
              <MapPin className="h-5 w-5" /> Explore Map
            </Link>
          </motion.div>
        </div>

        {/* live map preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="relative h-[340px] overflow-hidden rounded-[2rem] border-4 border-white shadow-warm sm:h-[420px]">
            <MapCanvas dogs={dogs} />
          </div>
          <div className="pointer-events-none absolute -bottom-4 -left-4 hidden rotate-[-6deg] rounded-2xl bg-white px-4 py-2 shadow-card sm:block">
            <p className="text-xs font-semibold text-bark-700">🐾 Live across India</p>
            <p className="text-[10px] text-bark-400">tap a pin to meet a dog</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
