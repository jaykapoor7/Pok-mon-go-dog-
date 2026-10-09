import Link from "next/link";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { animalSubtitle, animalTitle, givenName } from "@/lib/animal-name";

/* ════════════════════════════════════════════════════════════════════
   An animal, as the record knows it.

   Fewer than one profile in two hundred has a photograph. Repeating a
   placeholder image for the rest makes every animal look the same and
   pretends a picture is missing rather than never taken. So a tile leads
   with whatever identifies the animal best: its photograph when there is
   one; otherwise the place it is known by, set large, with its StrayPaw ID
   and what the record says about it. A real photograph always wins.
   ════════════════════════════════════════════════════════════════════ */

export type TileAnimal = {
  id: string; name: string | null; straypaw_id: string | null; cover_photo: string | null;
  zone: string | null; last_seen: string | null; status?: string | null; needs_help?: boolean | null;
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function seenWhen(iso: string | null) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  if (d < 1) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  const date = new Date(t);
  return `${MON[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** A given name, or null when the field holds a filing label. */
export const realName = givenName;

export function AnimalTile({ a, size = "m", state }: { a: TileAnimal; size?: "s" | "m"; state?: { label: string; tone: "hot" | "care" | "open" | "" } }) {
  const seen = seenWhen(a.last_seen);
  const hot = !!a.needs_help || a.status === "injured";
  const st = state ?? (hot ? { label: a.status === "injured" ? "Injured" : "Needs help", tone: "hot" as const } : null);
  const title = animalTitle(a);
  return (
    <Link href={`/dog/${a.id}`} className={`at2 at2-${size}${hot ? " is-hot" : ""}`}>
      <span className="at2-media">
        <DogPhoto src={a.cover_photo} alt={title} seed={a.id} className="at2-ph" width={480} />
        {st && <span className={`at2-state is-${st.tone || "quiet"}`}>{st.label}</span>}
        {!a.cover_photo && <span className="at2-ill">Illustration</span>}
      </span>
      <span className="at2-cap">
        <b>{title}</b>
        <small>{animalSubtitle(a)}</small>
        {seen && <small className="at2-seen">Seen {seen}</small>}
      </span>
    </Link>
  );
}
