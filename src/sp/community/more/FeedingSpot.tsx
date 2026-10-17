"use client";

/* Community · one feeding spot: who feeds here and on which days, when
   it was last fed, and the two things a feeder does: say "I feed here"
   (with days) and record "fed today". Each waits for the record. */

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { FEEDING_DAYS, type FeedingDay, type FeedingZoneCheckin, type FeedingZoneVolunteer } from "@/lib/types";
import { AreaMap } from "../../atlas/AreaMap";
import { publicLocality } from "../../ui/place";
import { Ack, day, since } from "../../ui";
import { feedHere, fedToday, stopFeeding, type Receipt } from "../../data/work";
import type { PublicSpot } from "./Feeding";
import "./more.css";

const DAY: Record<FeedingDay, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export function FeedingSpot({ s, volunteers, checkins }: { s: PublicSpot; volunteers: FeedingZoneVolunteer[]; checkins: FeedingZoneCheckin[] }) {
  const { user } = useAuth();
  const router = useRouter();
  const me = volunteers.find((v) => v.user_id === user?.id);
  const [days, setDays] = useState<FeedingDay[]>(me?.days ?? []);
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [r, setR] = useState<Receipt | null>(null);
  const actor = user ? { id: user.id, name: user.name } : null;
  const go = async (k: string, fn: () => Promise<Receipt>) => { setBusy(k); setR(null); const x = await fn(); setR(x); setBusy(null); if (x.ok) router.refresh(); };
  const cover = FEEDING_DAYS.map((d) => ({ d, n: volunteers.filter((v) => v.days.includes(d)).length }));
  return (
    <article className="mo">
      <header className="mo-head">
        <Link className="link small" href="/community/feeding"><ArrowLeft size={13} aria-hidden /> Feeding spots</Link>
        <p className="k">{publicLocality(s.zone) ?? "Locality not given"} · added {day(s.created_at)}</p>
        <h1 className="display">{s.name}</h1>
        {s.description && <p className="lede">{s.description}</p>}
        <p className="body">{s.last_fed_at ? <>Last recorded as fed <b>{since(s.last_fed_at)}</b>.</> : "No feeding recorded here yet."}</p>
      </header>
      <div className="og-body">
        <section className="og-col">
          <h2 className="h3">The week</h2>
          <ol className="fs-week">{cover.map(({ d, n }) => <li key={d} className={n ? "is-on" : ""}><b>{DAY[d]}</b><span>{n ? `${n} feeder${n === 1 ? "" : "s"}` : "nobody yet"}</span></li>)}</ol>
          <h2 className="h3">Feeders</h2>
          {volunteers.length ? <ul className="fs-people">{volunteers.map((v) => <li key={v.id}><b>{v.user_name}</b><small>{v.days.length ? v.days.map((d) => DAY[d]).join(", ") : "days not given"}</small></li>)}</ul> : <p className="small">No one is listed yet.</p>}
          <h2 className="h3">Recently</h2>
          {checkins.length ? <ol className="chrono">{checkins.map((c) => <li key={c.id} className="is-care"><time className="mono">{day(c.created_at)}</time><span>Fed{c.actor_name ? ` by ${c.actor_name}` : ""}{c.note ? `: ${c.note}` : ""}</span></li>)}</ol> : <p className="small">Nothing recorded yet.</p>}
        </section>
        <aside className="og-col">
          {s.h3 && <div className="og-map"><AreaMap cells={[{ h3: s.h3, value: 1, hot: 0, label: "" }]} selected={s.h3} onPick={() => {}} label="The spot's area" ink="#b65a3a" empty="" /></div>}
          {!actor ? <p className="body"><Link className="link" href="/join">Sign in</Link> to say you feed here or record a feeding.</p> : (
            <div className="fz-card">
              <h3 className="h3">{me ? "Your days here" : "Do you feed here?"}</h3>
              <div className="fs-days" role="group" aria-label="Days">{FEEDING_DAYS.map((d) => <button key={d} type="button" className="chip" aria-pressed={days.includes(d)} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{DAY[d]}</button>)}</div>
              {!me && <div className="field"><label htmlFor="fs-c">Contact <span className="small">optional, never shown publicly</span></label><input id="fs-c" className="input" value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" /></div>}
              <div className="row"><button type="button" className="btn is-ink is-s" disabled={!!busy} onClick={() => go("v", () => feedHere(s.id, actor, days, contact))}>{me ? "Update my days" : "I feed here"}</button>{me && <button type="button" className="btn is-ghost is-s" disabled={!!busy} onClick={() => go("w", () => stopFeeding(s.id, actor))}>Stop listing me</button>}</div>
              <hr className="fs-rule" />
              <div className="field"><label htmlFor="fs-n">Fed today? <span className="small">a note is optional</span></label><input id="fs-n" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 6 dogs, one limping" /></div>
              <button type="button" className="btn is-s" disabled={!!busy} onClick={() => go("c", () => fedToday(s.id, actor, note.trim()))}>Record: fed today</button>
              <p className="small">If an animal here needs help, <Link className="link" href="/community/report?help=1">report it</Link>; a note here does not alert anyone.</p>
            </div>
          )}
          <div aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not saved: {r.error}</Ack>) : null}</div>
        </aside>
      </div>
    </article>
  );
}
