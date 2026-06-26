"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MapPin, MessageCircle, Pencil } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { MoodChip } from "@/components/ui/Badges";
import { timeAgo, formatNumber, cn } from "@/lib/utils";
import { likeSighting } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/components/auth/AuthProvider";
import { DeleteSightingButton } from "@/components/sighting/DeleteSightingButton";
import { EditSightingSheet } from "@/components/sighting/EditSightingSheet";
import type { MoodTag, Sighting } from "@/lib/types";

export function SightingCard({ sighting }: { sighting: Sighting }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(sighting.likes);
  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  // Editable fields kept in local state so saved edits show immediately.
  const [nickname, setNickname] = useState(sighting.nickname);
  const [moods, setMoods] = useState<MoodTag[]>(sighting.mood_tags);
  const [notes, setNotes] = useState(sighting.notes);

  const accountOwned = Boolean(
    user && sighting.user_id && user.id === sighting.user_id
  );

  if (deleted) return null;

  function shareWhatsApp() {
    haptic("light");
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://straypaw.kapoorjay.com";
    const url = sighting.dog_id ? `${origin}/dog/${sighting.dog_id}` : `${origin}/feed`;
    const who = nickname ? `${nickname}, a street dog` : "a street dog";
    const text = `Spotted ${who} near ${sighting.zone} on StrayPaw 🐾\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  function toggleLike() {
    if (!liked) {
      likeSighting(sighting.id).catch(() => {});
      haptic("success");
    } else {
      haptic("select");
    }
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
        <div className="flex items-center gap-1.5">
          {accountOwned && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit your sighting"
              title="Edit your sighting"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-bark-600 shadow-sm transition-colors hover:bg-bark-900 hover:text-white"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <DeleteSightingButton
            sightingId={sighting.id}
            ownerUserId={sighting.user_id}
            onDeleted={() => setDeleted(true)}
          />
        </div>
      </div>

      {/* photo */}
      <Link href={sighting.dog_id ? `/dog/${sighting.dog_id}` : "#"}>
        <div className="relative">
          <DogPhoto
            src={sighting.photo_url}
            alt={nickname ?? "Street dog sighting"}
            seed={sighting.id}
            className="aspect-square w-full"
          />
          {nickname && (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
              {nickname}
            </span>
          )}
        </div>
      </Link>

      {/* actions */}
      <div className="flex items-center gap-4 px-3 pt-3">
        <button
          onClick={toggleLike}
          aria-pressed={liked}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <motion.span
            key={liked ? "on" : "off"}
            initial={false}
            animate={{ scale: liked ? [1, 1.35, 1] : 1 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <Heart
              className={cn(
                "h-6 w-6 transition-colors",
                liked ? "fill-status-injured text-status-injured" : "text-bark-600"
              )}
            />
          </motion.span>
          {formatNumber(likes)}
        </button>
        <Link
          href={sighting.dog_id ? `/dog/${sighting.dog_id}` : "#"}
          className="flex items-center gap-1.5 text-sm font-medium text-bark-600"
        >
          <MessageCircle className="h-6 w-6" />
        </Link>
        <button
          onClick={shareWhatsApp}
          aria-label="Share on WhatsApp"
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-status-sterilised"
        >
          <WhatsAppIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* caption */}
      <div className="space-y-2 p-3 pt-2">
        {notes && (
          <p className="text-sm text-bark-700">
            <span className="font-semibold">{sighting.user_name.split(" ")[0]}</span>{" "}
            {notes}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {moods.map((m) => (
            <MoodChip key={m} mood={m} />
          ))}
        </div>
      </div>

      {accountOwned && (
        <EditSightingSheet
          open={editing}
          sightingId={sighting.id}
          initial={{ nickname, mood_tags: moods, notes }}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setNickname(next.nickname);
            setMoods(next.mood_tags);
            setNotes(next.notes);
          }}
        />
      )}
    </motion.article>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}
