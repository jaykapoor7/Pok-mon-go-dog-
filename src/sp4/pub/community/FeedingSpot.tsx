"use client";

/* One feeding spot (/community/feeding/[id]): who feeds here and on which
   days, when it was last fed, and the two things a feeder does: say "I
   feed here" with days (volunteer_for_feeding_zone, withdraw_feeding_
   volunteer) and record "fed today" (checkin_feeding_zone). Each waits for
   the record; the server requires the signed-in person to be the actor. */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { FEEDING_DAYS, type FeedingDay, type FeedingZoneCheckin, type FeedingZoneVolunteer } from "@/lib/types";
import { checkinFeedingZone, volunteerForZone, withdrawFeedingVolunteer } from "@/lib/feeding-actions";
import { Ack, Body, Btn, Head, List, Panel, Row, Sec, Split } from "../kit";
import { AreaBlooms } from "../map";
import { run, type Receipt } from "../receipt";
import { day, plural, publicLocality, since } from "../fmt";
import type { PublicSpot } from "./spots";

const DAY: Record<FeedingDay, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const DAY_LONG: Record<FeedingDay, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

export function FeedingSpot({ s, volunteers, checkins }: { s: PublicSpot; volunteers: FeedingZoneVolunteer[]; checkins: FeedingZoneCheckin[] }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const me = volunteers.find((v) => v.user_id === user?.id);
  const [days, setDays] = useState<FeedingDay[] | null>(null);
  const picked = days ?? me?.days ?? [];
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [r, setR] = useState<Receipt | null>(null);
  const actor = user ? { id: user.id, name: user.name } : null;
  const go = async (k: string, what: string, fn: () => Promise<boolean | void>) => { setBusy(k); setR(null); const x = await run(`${k}:${s.id}`, what, fn); setR(x); setBusy(null); if (x.ok) { router.refresh(); if (k === "c") setNote(""); } };
  const cover = FEEDING_DAYS.map((d) => ({ d, n: volunteers.filter((v) => v.days.includes(d)).length }));
  return (
    <>
      <Head back="/community/feeding" eyebrow={<>{publicLocality(s.zone) ?? "Locality not given"} · added {day(s.created_at)}</>} title={s.name}
        sum={<>{s.last_fed_at ? <>Last recorded as fed <b>{since(s.last_fed_at)}</b>.</> : "No feeding recorded here yet."}{s.description ? ` ${s.description}` : ""}</>} />
      <Body>
        <Split side={<>
          {s.h3 && <AreaBlooms cells={[{ h3: s.h3, value: 1 }]} selected={s.h3} label="The spot's area" ink="#b65a3a" empty="" />}
          {!ready ? null : !actor ? (
            <Panel><p className="pb-fine"><Link href={`/sign-in?next=/community/feeding/${s.id}`}>Sign in</Link> to say you feed here or to record a feeding.</p></Panel>
          ) : (
            <>
              <Sec title={me ? "Your days here" : "Do you feed here?"}>
                <Panel>
                  <div className="pb-chips" role="group" aria-label="The days you feed here">{FEEDING_DAYS.map((d) => <button key={d} type="button" aria-pressed={picked.includes(d)} aria-label={DAY_LONG[d]} onClick={() => setDays(picked.includes(d) ? picked.filter((x) => x !== d) : [...picked, d])}>{DAY[d]}</button>)}</div>
                  {!me && <div className="pb-field"><label htmlFor="fs-c">Contact <span className="pb-opt">optional, never shown publicly</span></label><input id="fs-c" className="pb-input" value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" autoComplete="tel" /></div>}
                  <div className="pb-actions">
                    <Btn variant="primary" disabled={!!busy} onClick={() => go("v", "You are listed as a feeder here", () => volunteerForZone(s.id, actor, picked, contact))}>{busy === "v" ? "Sending…" : me ? "Update my days" : "I feed here"}</Btn>
                    {me && <Btn variant="quiet" disabled={!!busy} onClick={() => go("w", "You are no longer listed here", () => withdrawFeedingVolunteer(s.id, actor))}>Stop listing me</Btn>}
                  </div>
                </Panel>
              </Sec>
              <Sec title="Fed today?">
                <Panel>
                  <div className="pb-field"><label htmlFor="fs-n">A note <span className="pb-opt">optional</span></label><input id="fs-n" className="pb-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="6 dogs, one limping" /></div>
                  <div className="pb-actions"><Btn disabled={!!busy} onClick={() => go("c", "Recorded: fed today", async () => { await checkinFeedingZone(s.id, actor, note.trim()); return true; })}>{busy === "c" ? "Sending…" : "Record: fed today"}</Btn></div>
                  <p className="pb-fine">If an animal here needs help, <Link href="/community/report?help=1">report it</Link>; a note here does not alert anyone.</p>
                </Panel>
              </Sec>
            </>
          )}
          <div aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}.</Ack> : <Ack state="failed">Not saved: {r.error}</Ack>) : null}</div>
        </>}>
          <Sec title="The week">
            <ol className="pb-week">{cover.map(({ d, n }) => <li key={d} className={n ? "is-on" : ""}><b>{DAY[d]}</b><span>{n ? `${n} ${plural(n, "feeder")}` : "nobody yet"}</span></li>)}</ol>
          </Sec>
          <Sec title="Feeders" count={volunteers.length}>
            {volunteers.length ? <List label="Feeders">{volunteers.map((v) => <Row key={v.id} title={v.user_name} meta={v.days.length ? v.days.map((d) => DAY[d]).join(", ") : "days not given"} />)}</List> : <p className="pb-fine">No one is listed yet.</p>}
          </Sec>
          <Sec title="Recently" count={checkins.length || null}>
            {checkins.length ? <List label="Recent feedings">{checkins.slice(0, 8).map((c) => <Row key={c.id} title={<>Fed{c.actor_name ? ` by ${c.actor_name}` : ""}</>} meta={c.note || undefined} end={<time dateTime={c.created_at}>{day(c.created_at)}</time>} />)}</List> : <p className="pb-fine">Nothing recorded yet.</p>}
          </Sec>
        </Split>
      </Body>
    </>
  );
}
