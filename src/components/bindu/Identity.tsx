/* ════════════════════════════════════════════════════════════════════
   Drawn, photographed, on the record. Real animals from the register
   travel sideways through depth. Far from the centre each one is still a
   painting: the same Gond dog, its bands laid in that card's colours. As
   it comes to the centre the painting gives way to the photograph,
   first as a screen of dots that grow until they close, and then the
   record itself: its name or StrayPaw ID, its place, how long it has
   been known. All driven by the stage's --p in CSS; nothing re-renders.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { DOG_PATH } from "./dog";

export type IdCard = { id: string; name: string; place: string; photo: string; sid: string | null; since: string | null };

const HUES = [["#f05b40", "#f2b632", "#3f8f6a"], ["#2457ce", "#f28c38", "#fff3dc"], ["#d9738f", "#3f8f6a", "#f2b632"], ["#3f8f6a", "#f05b40", "#7fb3ff"], ["#f2b632", "#d9738f", "#2457ce"], ["#f28c38", "#2457ce", "#fff3dc"]];

/* The painting: the dog's outline laid inward in bands (a wide dashed band, a dotted band, the rim), over a field of dots. */
export function GondDog({ id, c }: { id: string; c: string[] }) {
  return (
    <svg className="id-draw" viewBox="0 6 100 88" aria-hidden>
      <defs>
        <clipPath id={`gd-${id}`}><path d={DOG_PATH} /></clipPath>
        <pattern id={`gp-${id}`} width="3.2" height="2.8" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.55" fill={c[2]} /><circle cx="2.6" cy="2.4" r="0.55" fill={c[2]} /></pattern>
      </defs>
      <g clipPath={`url(#gd-${id})`}>
        <path d={DOG_PATH} fill={`url(#gp-${id})`} />
        <path d={DOG_PATH} fill="none" stroke={c[0]} strokeWidth="11" strokeDasharray="2.2 1.4" />
        <path d={DOG_PATH} fill="none" stroke="#fff8ec" strokeWidth="6.4" strokeDasharray="0.1 1.6" strokeLinecap="round" />
        <path d={DOG_PATH} fill="none" stroke={c[1]} strokeWidth="3.4" strokeDasharray="1.6 1" />
      </g>
      <path d={DOG_PATH} fill="none" stroke="#fff8ec" strokeWidth="0.7" />
      <circle cx="18.6" cy="41" r="1.1" fill="#fff8ec" />
    </svg>
  );
}

export function Identity({ cards }: { cards: IdCard[] }) {
  return (
    <div className="id-track" style={{ ["--n" as string]: cards.length }}>
      {cards.map((c, i) => (
        <Link key={c.id} href={`/animal/${c.id}`} className="id-card" style={{ ["--i" as string]: i }} aria-label={`${c.name}, on the record in ${c.place}. Open the profile.`}>
          <div className="id-media">
            <GondDog id={`c${i}`} c={HUES[i % HUES.length]} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="id-photo" src={c.photo} alt="" loading={i < 2 ? "eager" : "lazy"} referrerPolicy="no-referrer" />
            <span className="id-tint" style={{ background: HUES[i % HUES.length][0] }} aria-hidden />
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
