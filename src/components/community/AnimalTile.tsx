import Link from "next/link";
import { DogPhoto } from "@/components/ui/DogPhoto";

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

/** A generated label such as "Dog · Sanganoor · Dec 2024" is not a name. */
export function realName(name: string | null) {
  if (!name) return null;
  const n = name.trim();
  if (!n || /·/.test(n) || /^(dog|animal|puppy|unknown|unnamed)\b/i.test(n)) return null;
  return n;
}

export function AnimalTile({ a, size = "m", state }: { a: TileAnimal; size?: "s" | "m"; state?: { label: string; tone: "hot" | "care" | "open" | "" } }) {
  const name = realName(a.name);
  const place = a.zone?.split(",")[0]?.trim() || null;
  const seen = seenWhen(a.last_seen);
  const hot = !!a.needs_help || a.status === "injured";
  const st = state ?? (hot ? { label: a.status === "injured" ? "Injured" : "Needs help", tone: "hot" as const } : null);
  return (
    <Link href={`/dog/${a.id}`} className={`at at-${size}${a.cover_photo ? " has-photo" : ""}${hot ? " is-hot" : ""}`}>
      {a.cover_photo ? (
        <DogPhoto src={a.cover_photo} alt={name ?? `Dog recorded near ${place ?? "here"}`} seed={a.id} className="at-photo" width={480} />
      ) : (
        <span className="at-plate" aria-hidden>
          <span className="at-id">{a.straypaw_id ?? "ID pending"}</span>
          <span className="at-place">{name ?? place ?? "Place not recorded"}</span>
          <span className="at-nophoto">No photograph on record</span>
        </span>
      )}
      <span className="at-cap">
        {st && <span className={`x-state ${st.tone ? `is-${st.tone}` : ""}`}>{st.label}</span>}
        <b>{name ?? (place ? `Dog near ${place}` : "Unnamed dog")}</b>
        <small>{[a.cover_photo || name ? a.straypaw_id : null, name && place ? place : null, seen ? `seen ${seen}` : null].filter(Boolean).join(" · ") || "On the record"}</small>
      </span>
    </Link>
  );
}
