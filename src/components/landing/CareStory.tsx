"use client";

/* ════════════════════════════════════════════════════════════════════
   Report on WhatsApp, hear what happened.

   WhatsApp intake is being built for the founding NGO pilot and is not
   live (docs/CAREOS-INTEGRATION.md: nothing presents it as live until
   careos_health() says connected). So this section shows the flow as an
   illustration, labelled as one, built around a real request from the
   sample city (its condition, locality, date and StrayPaw ID). Every
   reply in the thread is one of the five notices the backend contract
   allows (received · team assigned · treated · follow-up · closed): the
   reporter never gets free text, and NGOs never see their number. The
   live way to report today is the web form, and the primary action says so.

   The thread fills in once as the phone comes into view. Every message is
   in the page from the start, so nothing is hidden behind a timer, and
   under reduced motion it is simply all there.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, CheckCheck, MapPin, PhoneOff, Siren, BellRing } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { StrayPawMark } from "@/components/site/SiteHeader";

type Report = { date: string; condition: string; locality: string; straypawId: string; photo?: string | null };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const at = (iso: string, addDays = 0) => { const d = new Date(Date.parse(iso) + addDays * 86_400_000); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };

const FACTS = [
  { icon: PhoneOff, t: "Your number stays private", d: "The NGO sees your photo, place and words. Never your phone number." },
  { icon: Siren, t: "Not an emergency line", d: "The first reply gives local helplines for an animal in danger right now." },
  { icon: BellRing, t: "Updates only when something happens", d: "Taken on, treated, recheck booked, closed. Nothing else, ever." },
];

export function CareStory({ report, city }: { report: Report | null; city: string | null }) {
  const phone = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(99);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = phone.current; if (!node) return;
    setShown(0);
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      let n = 0;
      const next = () => { n += 1; setShown(n); if (n < 5) timer = window.setTimeout(next, n === 1 ? 700 : 900); };
      timer = window.setTimeout(next, 250);
    }, { threshold: 0.3 });
    io.observe(node);
    return () => { io.disconnect(); window.clearTimeout(timer); };
  }, []);

  const r = report ?? { date: new Date().toISOString(), condition: "Injured paw", locality: "the market", straypawId: "SP-D-…", photo: null };
  const place = [r.locality, city].filter(Boolean).join(", ");
  const msg = (i: number) => `wa-msg${shown >= i ? " is-in" : ""}`;

  return (
    <section className="ld-sec ld-sec-bone ld-wa" aria-labelledby="ld-wa-title">
      <div className="ld-wa-grid">
        <div className="ld-wa-copy sys-head">
          <p className="ld-wa-state"><i aria-hidden />WhatsApp · founding NGO pilot · in development</p>
          <h2 id="ld-wa-title">Report on WhatsApp. <em>Hear what happened.</em></h2>
          <p className="ld-wa-lede">Send a photo and a place to a partner NGO. Your message becomes a case one person owns, the care is written onto the animal&apos;s StrayPaw record, and you get a short update when it is treated. Not silence.</p>
          <ul className="ld-wa-facts">
            {FACTS.map(({ icon: Icon, t, d }) => <li key={t}><Icon size={18} aria-hidden /><span><b>{t}</b>{d}</span></li>)}
          </ul>
          <p className="ld-wa-acts">
            <Link href="/report" className="sys-btn is-flame">Report on the web today <ArrowUpRight size={15} /></Link>
            <Link href="/for-ngos" className="ld-wa-link">Bring your NGO into the pilot <ArrowUpRight size={14} /></Link>
          </p>
        </div>

        <figure className="ld-wa-fig">
          <div className="wa-phone" ref={phone} aria-hidden>
            <div className="wa-top">
              <span className="wa-av"><StrayPawMark size={18} /></span>
              <span className="wa-who"><b>StrayPaw · partner NGO</b><small>replies with record updates</small></span>
            </div>
            <div className="wa-thread">
              <p className="wa-day">{at(r.date)}</p>
              <div className={`${msg(1)} is-out`}>
                <span className="wa-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.photo ? sized(r.photo, 480) : "/pinky-bengaluru.jpg"} alt="" loading="lazy" />
                </span>
                <span className="wa-text">{r.condition} near {r.locality}. Still there this morning.</span>
                <span className="wa-meta">09:12 <CheckCheck size={13} /></span>
              </div>
              <div className={`${msg(2)} is-out is-pin`}>
                <span className="wa-pin"><MapPin size={15} /><span><b>Location</b>{place}</span></span>
                <span className="wa-meta">09:12 <CheckCheck size={13} /></span>
              </div>
              <div className={`${msg(3)} is-in-msg`}>
                <span className="wa-text">Received: record <b className="wa-id">{r.straypawId}</b>. Not an emergency service; if the animal is in danger now, call a local helpline.</span>
                <span className="wa-meta">09:12</span>
              </div>
              <div className={`${msg(4)} is-in-msg`}>
                <span className="wa-text">A team has taken this on. One person owns the case.</span>
                <span className="wa-meta">10:40</span>
              </div>
              <p className={`wa-day${shown >= 5 ? " is-in" : ""}`}>{at(r.date, 1)}</p>
              <div className={`${msg(5)} is-in-msg is-good`}>
                <span className="wa-text"><Check size={14} aria-hidden /> Treated today, and on the animal&apos;s record. Recheck booked for {at(r.date, 4)}.</span>
                <span className="wa-meta">16:05</span>
              </div>
            </div>
          </div>
          <figcaption>Illustration of the pilot&apos;s message flow, around a real {city ?? ""} request ({r.straypawId}). Replies are the only five updates a reporter can receive.</figcaption>
        </figure>
      </div>
    </section>
  );
}
