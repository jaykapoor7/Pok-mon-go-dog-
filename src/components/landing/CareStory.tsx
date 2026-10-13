"use client";

/* A compact WhatsApp reporting story. It uses its own photograph instead
   of the request in the relay, so each landing section has a distinct
   animal and a distinct job. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
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
  Video,
} from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";

const MESSAGE_STEPS = 4;
const FLOW = ["Sent", "Filed", "Assigned", "Treated"];

export function CareStory() {
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
        if (nextStep < MESSAGE_STEPS) timer = window.setTimeout(reveal, nextStep === 1 ? 760 : 620);
      };
      timer = window.setTimeout(reveal, 350);
    }, { threshold: 0.25 });
    io.observe(node);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const message = (step: number, classes: string) => `wa-msg ${classes}${shown >= step ? " is-in" : ""}`;

  return (
    <section className="ld-sec ld-sec-bone ld-wa ld-wa-v2" aria-labelledby="ld-wa-title">
      <header className="ld-wa-copy" data-ld-reveal="head">
        <p className="ld-wa-state"><i aria-hidden />WhatsApp reporting · live</p>
        <h2 id="ld-wa-title">Send a photo.<span>See what happens.</span></h2>
        <p className="ld-wa-lede">Send a photo and location. StrayPaw opens the report, assigns the case and returns care updates in the same thread.</p>
        <p className="ld-wa-acts">
          <Link href="/report" className="sys-btn is-flame">Start a report <ArrowUpRight size={15} /></Link>
          <Link href="/for-ngos" className="ld-wa-link">For NGOs <ArrowUpRight size={14} /></Link>
        </p>
      </header>

      <figure className="ld-wa-fig" data-ld-reveal="stage">
        <div className="wa-stage">
          <ol className="wa-flow" aria-hidden>
            {FLOW.map((label, index) => (
              <li key={label} className={shown >= index + 1 ? "is-on" : ""}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{label}</b>
                <i />
              </li>
            ))}
          </ol>

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
                <span className="wa-who"><b>StrayPaw Care</b><small>online</small></span>
                <Video size={19} />
                <Phone size={18} />
                <MoreVertical size={19} />
              </div>

              <div className="wa-thread">
                <p className="wa-day is-first">Today</p>
                <div className={message(1, "is-out is-photo")}>
                  <span className="wa-photo">
                    {/* This image belongs only to the WhatsApp reporting story. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/seed-dogs/dog6.jpg" alt="" loading="lazy" />
                    <span className="wa-photo-scan" />
                  </span>
                  <span className="wa-report-line"><b>Street dog outside the café</b><small><MapPin size={11} /> Rajouri Garden</small></span>
                  <span className="wa-meta">09:12 <CheckCheck size={13} /></span>
                </div>

                <div className={message(2, "is-in-msg is-received")}>
                  <span className="wa-kicker"><Check size={11} /> REPORT OPENED</span>
                  <span className="wa-record">SP–0428</span>
                  <span className="wa-meta">09:13</span>
                </div>

                <div className={message(3, "is-in-msg is-assigned")}>
                  <span className="wa-assignee"><i>RK</i><span><b>Rhea is on it</b><small>Rescue partner assigned</small></span></span>
                  <span className="wa-meta">10:40</span>
                </div>

                <div className={message(4, "is-in-msg is-good")}>
                  <span className="wa-good-icon"><Check size={15} /></span>
                  <span className="wa-text"><b>Treated</b><small>Recheck in 3 days</small></span>
                  <span className="wa-meta">16:05</span>
                </div>
              </div>

              <div className="wa-compose">
                <span className="wa-compose-field"><span>Message</span><Paperclip size={17} /><Camera size={17} /></span>
                <span className="wa-mic"><Mic size={17} /></span>
              </div>
              <span className="wa-home" />
            </div>
          </div>
        </div>
        <figcaption><LockKeyhole size={12} aria-hidden /> Reporter details stay private. The case record stays with the animal.</figcaption>
      </figure>
    </section>
  );
}
