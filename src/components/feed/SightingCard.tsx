"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MapPin, MessageCircle, Share2 } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { MoodChip } from "@/components/ui/Badges";
import { timeAgo, formatNumber, cn } from "@/lib/utils";
import { likeSighting } from "@/lib/actions";
import { DeleteSightingButton } from "@/components/sighting/DeleteSightingButton";
import type { Sighting } from "@/lib/types";

export function SightingCard({ sighting }: { sighting: Sighting }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(sighting.likes);
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  function toggleLike() {
    if (!liked) likeSighting(sighting.id).catch(() => {});
    setLiked((v) => !v);
    setLikes((n) => (liked ? n - 1 : n + 1));
  }

  const initials = sighting.user_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="card overflow-hidden"
    >
      {/* header */}
      <div className="flex items-center gap-3 p-3">
        {sighting.user_avatar ? (
          <img
            src={sighting.user_avatar}
            alt={sighting.user_name}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-paw-100"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paw-200 text-xs font-bold text-paw-700">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{sighting.user_name}</p>
          <p className="flex items-center gap-1 text-xs text-bark-400">
            <MapPin className="h-3 w-3" /> {sighting.zone} · {timeAgo(sighting.created_at)}
          </p>
        </div>
        <DeleteSightingButton
          sightingId={sighting.id}
          onDeleted={() => setDeleted(true)}
        />
      </div>

      {/* photo */}
      <Link href={sighting.dog_id ? `/dog/${sighting.dog_id}` : "#"}>
        <div className="relative">
          <DogPhoto
            src={sighting.photo_url}
            alt={sighting.nickname ?? "Street dog sighting"}
            seed={sighting.id}
            className="aspect-square w-full"
          />
          {sighting.nickname && (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
              {sighting.nickname}
            </span>
          )}
        </div>
      </Link>

      {/* actions */}
      <div className="flex items-center gap-4 px-3 pt-3">
        <button
          onClick={toggleLike}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Heart
            className={cn(
              "h-6 w-6 transition-all",
              liked ? "fill-status-injured text-status-injured scale-110" : "text-bark-600"
            )}
          />
          {formatNumber(likes)}
        </button>
        <Link
          href={sighting.dog_id ? `/dog/${sighting.dog_id}` : "#"}
          className="flex items-center gap-1.5 text-sm font-medium text-bark-600"
        >
          <MessageCircle className="h-6 w-6" />
        </Link>
        <button className="ml-auto text-bark-600">
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* caption */}
      <div className="space-y-2 p-3 pt-2">
        {sighting.notes && (
          <p className="text-sm text-bark-700">
            <span className="font-semibold">{sighting.user_name.split(" ")[0]}</span>{" "}
            {sighting.notes}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {sighting.mood_tags.map((m) => (
            <MoodChip key={m} mood={m} />
          ))}
        </div>
      </div>
    </motion.article>
  );
}
