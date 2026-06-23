"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Clock, Heart, Utensils, ArrowRight } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { StatusBadge, TrustRing } from "@/components/ui/Badges";
import { timeAgo } from "@/lib/utils";
import type { Dog } from "@/lib/types";

export function DogQuickCard({
  dog,
  onAction,
}: {
  dog: Dog;
  onAction?: (kind: "saw" | "fed") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-[280px] overflow-hidden rounded-3xl bg-white"
    >
      <div className="relative h-36">
        <DogPhoto
          src={dog.cover_photo}
          alt={dog.name ?? "Street dog"}
          seed={dog.id}
          className="h-full w-full"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute left-3 top-3">
          <StatusBadge status={dog.status} />
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/90 p-0.5">
          <TrustRing score={dog.trust_score} size={40} />
        </div>
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between text-white">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">
              {dog.name ?? "Unnamed dog"}
            </h3>
            <p className="flex items-center gap-1 text-xs opacity-90">
              <MapPin className="h-3 w-3" /> {dog.zone}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between text-xs text-bark-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {timeAgo(dog.last_seen)}
          </span>
          <span>{dog.sightings_count} sightings</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onAction?.("saw")}
            className="btn-ghost py-2 text-xs"
          >
            <Heart className="h-3.5 w-3.5" /> I saw this
          </button>
          <button
            onClick={() => onAction?.("fed")}
            className="btn-ghost py-2 text-xs"
          >
            <Utensils className="h-3.5 w-3.5" /> I fed this
          </button>
        </div>

        <Link
          href={`/dog/${dog.id}`}
          className="btn-primary w-full py-2 text-xs"
        >
          View full profile <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
