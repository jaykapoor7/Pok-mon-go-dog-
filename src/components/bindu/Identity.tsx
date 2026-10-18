/* ════════════════════════════════════════════════════════════════════
   Every animal, one identity. Real register animals travel sideways
   through depth. Off centre each is a halftone in StrayPaw blue, a
   screen of dots; as it reaches the centre the dots grow until they
   close into the photograph, and the record (its ID, its place, how
   long it has been known) rises beneath it. All of it is the stage's
   --p in CSS: nothing re-renders while you scroll.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";

export type IdCard = { id: string; name: string; place: string; photo: string; sid: string | null; since: string | null };

const TINT = ["#2457ce", "#1f6f80", "#f05b40", "#5b8cf0", "#0b1e3d", "#2457ce", "#f05b40"];

export function Identity({ cards }: { cards: IdCard[] }) {
  return (
    <div className="id-track" style={{ ["--n" as string]: cards.length }}>
      {cards.map((c, i) => (
        <Link key={c.id} href={`/animal/${c.id}`} className="id-card" style={{ ["--i" as string]: i }} aria-label={`${c.name}, on the record in ${c.place}. Open the profile.`}>
          <div className="id-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="id-photo" src={c.photo} alt="" loading={i < 2 ? "eager" : "lazy"} referrerPolicy="no-referrer" />
            <span className="id-tint" style={{ background: TINT[i % TINT.length] }} aria-hidden />
          </div>
          <div className="id-meta">
            <b>{c.name}</b>
            <span>{c.place}</span>
            <code>{c.sid ?? "On the record"}{c.since ? ` · known since ${c.since}` : ""}</code>
          </div>
        </Link>
      ))}
    </div>
  );
}
