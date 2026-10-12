"use client";

/* A self-contained product story for StrayPaw's WhatsApp reporting flow.
   The conversation is built from the same bounded landing-page record as
   the rest of the page. Motion only explains the order of events: every
   message remains in the document and is immediately visible when reduced
   motion is preferred. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  Camera,
  Check,
  CheckCheck,
  ChevronLeft,
  LockKeyhole,
  MapPin,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  ShieldCheck,
  Siren,
  Video,
} from "lucide-react";
import { sized } from "@/lib/photo/src";
import { StrayPawMark } from "@/components/site/SiteHeader";

type Report = { date: string; condition: string; locality: string; straypawId: string; photo?: string | null };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const at = (iso: string, addDays = 0) => {
  const d = new Date(Date.parse(iso) + addDays * 86_400_000);
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
};

const FACTS = [
  { icon: ShieldCheck, t: "Private by design", d: "Partner teams receive the report, not your phone number." },
  { icon: Siren, t: "Urgency is clear", d: "Safety guidance appears first when an animal may be in danger." },
  { icon: BellRing, t: "The loop gets closed", d: "You hear when a team takes it on, treats and follows up." },
];

const MESSAGE_STEPS = 7;

export function CareStory({ report, city }: { report: Report | null; city: string | null }) {
  const phone = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(99);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = phone.current;
    if (!node) return;
    setShown(0);
    let timer = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      let nextStep = 0;
      const reveal = () => {
        nextStep += 1;
        setShown(nextStep);
        if (nextStep < MESSAGE_STEPS) {
          const pause = nextStep === 2 || nextStep === 4 ? 720 : 520;
          timer = window.setTimeout(reveal, pause);
        }
      };
      timer = window.setTimeout(reveal, 300);
    }, { threshold: 0.22 });
    io.observe(node);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const r = report ?? {
    date: new Date().toISOString(),
    condition: "Injured paw",
    locality: "the market",
    straypawId: "SP-D-…",
    photo: null,
  };
  const place = [r.locality, city].filter(Boolean).join(", ");
  const message = (step: number, classes: string) => `wa-msg ${classes}${shown >= step ? " is-in" : ""}`;

  return (
    <section className="ld-sec ld-sec-bone ld-wa" aria-labelledby="ld-wa-title">
      <div className="ld-wa-glow" aria-hidden />
      <div className="ld-wa-grid">
        <div className="ld-wa-copy sys-head">
          <p className="ld-wa-state"><i aria-hidden />StrayPaw on WhatsApp</p>
          <h2 id="ld-wa-title">One message. <em>Care in motion.</em></h2>
          <p className="ld-wa-lede">Share a photo and location in the chat you already use. StrayPaw turns it into a case, routes it to a partner NGO and keeps you with the story until the animal is cared for.</p>
          <ul className="ld-wa-facts">
            {FACTS.map(({ icon: Icon, t, d }, index) => (
              <li key={t} style={{ ["--fact" as string]: index }}>
                <span className="ld-wa-fact-icon"><Icon size={18} aria-hidden /></span>
                <span><b>{t}</b>{d}</span>
              </li>
            ))}
          </ul>
          <p className="ld-wa-acts">
            <Link href="/report" className="sys-btn is-flame">Report a stray animal <ArrowUpRight size={15} /></Link>
            <Link href="/for-ngos" className="ld-wa-link">Connect your NGO <ArrowUpRight size={14} /></Link>
          </p>
          <p className="ld-wa-note"><LockKeyhole size={13} aria-hidden /> A report becomes a StrayPaw record. Contact details stay private.</p>
        </div>

        <figure className="ld-wa-fig">
          <div className="wa-orbit" aria-hidden>
            <span className="wa-orbit-dot is-one" />
            <span className="wa-orbit-dot is-two" />
            <span className="wa-orbit-label is-top"><b>01</b> Report received</span>
            <span className="wa-orbit-label is-bottom"><b>03</b> Care recorded</span>
          </div>
          <div className="wa-phone" ref={phone} aria-hidden>
            <span className="wa-button is-silent" />
            <span className="wa-button is-volume-up" />
            <span className="wa-button is-volume-down" />
            <span className="wa-button is-power" />
            <div className="wa-screen">
              <div className="wa-status">
                <span>9:41</span>
                <span className="wa-island" />
                <span className="wa-status-icons"><i className="is-signal" /><i className="is-wifi" /><i className="is-battery" /></span>
              </div>
              <div className="wa-top">
                <ChevronLeft className="wa-back" size={24} />
                <span className="wa-av"><StrayPawMark size={18} /></span>
                <span className="wa-who"><b>StrayPaw Care</b><small>with a partner NGO</small></span>
                <Video size={19} />
                <Phone size={18} />
                <MoreVertical size={19} />
              </div>
              <div className="wa-thread">
                <p className="wa-encrypted"><LockKeyhole size={9} /> Messages are private and securely routed</p>
                <p className="wa-day is-first">{at(r.date)}</p>
                <div className={message(1, "is-out is-photo")}>
                  <span className="wa-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.photo ? sized(r.photo, 480) : "/pinky-bengaluru.jpg"} alt="" loading="lazy" />
                    <span className="wa-photo-scan" />
                  </span>
                  <span className="wa-text">{r.condition} near {r.locality}. Still there this morning.</span>
                  <span className="wa-meta">09:12 <CheckCheck size={13} /></span>
                </div>
                <div className={message(2, "is-out is-pin")}>
                  <span className="wa-pin">
                    <span className="wa-pin-map"><i /><MapPin size={16} /></span>
                    <span><b>Current location</b>{place}</span>
                  </span>
                  <span className="wa-meta">09:12 <CheckCheck size={13} /></span>
                </div>
                <div className={message(3, "is-in-msg is-received")}>
                  <span className="wa-kicker"><Check size={11} /> REPORT RECEIVED</span>
                  <span className="wa-text">We&apos;ve opened record <b className="wa-id">{r.straypawId}</b>. If the animal is in immediate danger, call a local emergency helpline.</span>
                  <span className="wa-meta">09:13</span>
                </div>
                <div className={message(4, "is-in-msg is-assigned")}>
                  <span className="wa-assignee"><i>RK</i><span><b>A rescue team has taken this on</b><small>One person now owns the case</small></span></span>
                  <span className="wa-meta">10:40</span>
                </div>
                <p className={`wa-day${shown >= 5 ? " is-in" : ""}`}>{at(r.date, 1)}</p>
                <div className={message(6, "is-in-msg is-good")}>
                  <span className="wa-good-icon"><Check size={14} /></span>
                  <span className="wa-text"><b>Treated today.</b> Care is now on the animal&apos;s record. Recheck booked for {at(r.date, 4)}.</span>
                  <span className="wa-meta">16:05</span>
                </div>
                <div className={message(7, "is-in-msg is-followup")}>
                  <span className="wa-text"><b>Follow-up complete.</b> Recovering well in the same location. Thanks for helping us find them.</span>
                  <span className="wa-meta">11:26</span>
                  <span className="wa-heart">♥</span>
                </div>
              </div>
              <div className="wa-compose">
                <span className="wa-compose-field"><span>Message</span><Paperclip size={17} /><Camera size={17} /></span>
                <span className="wa-mic"><Mic size={17} /></span>
              </div>
              <span className="wa-home" />
            </div>
          </div>
          <figcaption>A sample StrayPaw conversation based on record {r.straypawId}. The report, ownership and outcome stay connected.</figcaption>
        </figure>
      </div>
    </section>
  );
}
