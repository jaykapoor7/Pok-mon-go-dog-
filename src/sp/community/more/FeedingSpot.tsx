"use client";

/* Community · one feeding spot: who feeds here and on which days, when
   it was last fed, and the two things a feeder does: say "I feed here"
   (with days) and record "fed today". Each waits for the record. */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { FEEDING_DAYS, type FeedingDay, type FeedingZoneCheckin, type FeedingZoneVolunteer } from "@/lib/types";
import { AreaMap } from "../../atlas/AreaMap";
import { publicLocality } from "../../ui/place";
import { Btn, Head, Page, Panel, Row, Rows, Section, Split } from "@/ws/kit";
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
    <Page>
      <Head title={s.name} eyebrow={<>{publicLocality(s.zone) ?? "Locality not given"} · added {day(s.created_at)}</>}
        sum={<>{s.last_fed_at ? <>Last recorded as fed <b>{since(s.last_fed_at)}</b>.</> : "No feeding recorded here yet."}{s.description ? ` ${s.description}` : ""}</>} />
      <Split side={<>
        {s.h3 && <div className="cmo-map is-s"><AreaMap cells={[{ h3: s.h3, value: 1, hot: 0, label: "" }]} selected={s.h3} onPick={() => {}} label="The spot's area" ink="#b65a3a" empty="" /></div>}
        {!actor ? <p className="cmo-prose"><Link className="cmo-link" href="/join">Sign in</Link> to say you feed here or record a feeding.</p> : (
          <>
            <Section title={me ? "Your days here" : "Do you feed here?"}>
              <div className="cmo-form">
                <div className="cmo-days" role="group" aria-label="Days">{FEEDING_DAYS.map((d) => <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{DAY[d]}</button>)}</div>
                {!me && <div className="cmo-field"><label htmlFor="fs-c">Contact <span>optional, never shown publicly</span></label><input id="fs-c" value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" /></div>}
                <div className="cmo-row"><Btn variant="primary" disabled={!!busy} onClick={() => go("v", () => feedHere(s.id, actor, days, contact))}>{me ? "Update my days" : "I feed here"}</Btn>{me && <Btn variant="quiet" disabled={!!busy} onClick={() => go("w", () => stopFeeding(s.id, actor))}>Stop listing me</Btn>}</div>
              </div>
            </Section>
            <Section title="Fed today?">
              <div className="cmo-form">
                <div className="cmo-field"><label htmlFor="fs-n">A note <span>optional</span></label><input id="fs-n" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 6 dogs, one limping" /></div>
                <div className="cmo-row"><Btn disabled={!!busy} onClick={() => go("c", () => fedToday(s.id, actor, note.trim()))}>Record: fed today</Btn></div>
                <p className="cmo-fine">If an animal here needs help, <Link className="cmo-link" href="/community/report?help=1">report it</Link>; a note here does not alert anyone.</p>
              </div>
            </Section>
          </>
        )}
        <div aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not saved: {r.error}</Ack>) : null}</div>
      </>}>
        <Section title="The week">
          <ol className="cmo-week">{cover.map(({ d, n }) => <li key={d} className={n ? "is-on" : ""}><b>{DAY[d]}</b><span>{n ? `${n} feeder${n === 1 ? "" : "s"}` : "nobody yet"}</span></li>)}</ol>
        </Section>
        <Section title="Feeders" count={volunteers.length}>
          <Panel>{volunteers.length ? <Rows>{volunteers.map((v) => <Row key={v.id} title={v.user_name} meta={v.days.length ? v.days.map((d) => DAY[d]).join(", ") : "days not given"} />)}</Rows> : <p className="cmo-quiet">No one is listed yet.</p>}</Panel>
        </Section>
        <Section title="Recently" count={checkins.length || null}>
          <Panel>{checkins.length ? <Rows>{checkins.slice(0, 8).map((c) => <Row key={c.id} title={<>Fed{c.actor_name ? ` by ${c.actor_name}` : ""}</>} meta={c.note || undefined} end={<time>{day(c.created_at)}</time>} />)}</Rows> : <p className="cmo-quiet">Nothing recorded yet.</p>}</Panel>
        </Section>
      </Split>
    </Page>
  );
}
