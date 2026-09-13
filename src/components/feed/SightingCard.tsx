"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MapPin, MessageCircle, Pencil, Share2 } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { MoodChip } from "@/components/ui/Badges";
import { timeAgo, formatNumber, cn, displayReporter } from "@/lib/utils";
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
      typeof window !== "undefined" ? window.location.origin : "https://straypaw.org";
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

  /* null when nobody put a name to it, which is normal: reporting needs no
     account. The card says so rather than inventing a person. */
  const reporter = displayReporter(sighting.user_name);
  const initials = reporter
    ? reporter.split(" ").map((w) => w[0]).slice(0, 2).join("")
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="sighting-row"
    >
      {/* A sighting is a piece of field evidence, not a social post. The
          photo stays present, but occupies a fixed thumbnail so people can
          scan reports, place, care context and action in one pass. */}
      <PhotoWrap dogId={sighting.dog_id}>
        <DogPhoto
          src={sighting.photo_url}
          alt={nickname ?? "Street dog sighting"}
          seed={sighting.id}
          className="sighting-row-photo"
        />
      </PhotoWrap>

      <div className="sighting-row-main">
        <div className="sighting-row-kicker">
          <span>{sighting.dog_id ? "Linked animal" : "New observation"}</span>
          <span>{timeAgo(sighting.created_at)}</span>
        </div>
        <div className="sighting-row-title">
          <h2>{nickname ?? "Street animal, not named yet"}</h2>
          {sighting.user_avatar ? (
            <img src={sighting.user_avatar} alt="" className="sighting-reporter-avatar" />
          ) : initials ? (
            <span className="sighting-reporter-avatar sighting-reporter-initials">{initials}</span>
          ) : null}
        </div>
        <Link href={`/map?lat=${sighting.lat}&lng=${sighting.lng}`} className="sighting-place">
          <MapPin className="h-3.5 w-3.5" /> {sighting.zone}
        </Link>
        {notes && <p className="sighting-note">{notes}</p>}
        <div className="sighting-row-meta">
          <span>{reporter ? `Reported by ${reporter}` : "Reported anonymously"}</span>
          {moods.map((m) => <MoodChip key={m} mood={m} />)}
        </div>
      </div>

      <div className="sighting-row-actions">
        <button
          onClick={toggleLike}
          aria-pressed={liked}
          className="sighting-action"
        >
          <motion.span
            key={liked ? "on" : "off"}
            initial={false}
            animate={{ scale: liked ? [1, 1.35, 1] : 1 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                liked ? "fill-status-injured text-status-injured" : "text-bark-600"
              )}
            />
          </motion.span>
          <span>{formatNumber(likes)}</span>
        </button>
        {sighting.dog_id && (
          <Link
            href={`/dog/${sighting.dog_id}`}
            className="sighting-action"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Record</span>
          </Link>
        )}
        <button
          onClick={shareWhatsApp}
          aria-label="Share on WhatsApp"
          className="sighting-action"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
        {accountOwned && (
          <button onClick={() => setEditing(true)} aria-label="Edit your sighting" className="sighting-action sighting-action-icon">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <DeleteSightingButton sightingId={sighting.id} ownerUserId={sighting.user_id} onDeleted={() => setDeleted(true)} />
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

/** Wraps the photo in a link to the dog profile when one exists, else a plain div. */
function PhotoWrap({ dogId, children }: { dogId: string | null; children: React.ReactNode }) {
  return dogId ? <Link href={`/dog/${dogId}`}>{children}</Link> : <div>{children}</div>;
}
