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
const FLOW = ["Report", "Review", "Coordinate", "Record"];

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
    <section id="one-request" className="ld-sec ld-sec-bone ld-wa ld-wa-v2" aria-labelledby="ld-wa-title">
      <header className="ld-wa-copy" data-ld-reveal="head">
        <p className="ld-wa-state"><i aria-hidden />Live on WhatsApp</p>
        <h2 id="ld-wa-title">One report. A connected record.</h2>
        <p className="ld-wa-lede">Send a photo and location through WhatsApp. CareOS connects the report, team review and recorded updates.</p>
        <p className="ld-wa-acts">
          <Link href="/contact?subject=WhatsApp%20CareOS%20access" className="sys-btn is-flame">Get WhatsApp access <ArrowUpRight size={15} aria-hidden /></Link>
          <Link href="/report" className="ld-wa-link">Report on the web <ArrowUpRight size={14} aria-hidden /></Link>
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
                <p className="wa-day is-first">Example conversation</p>
                <div className={message(1, "is-out is-photo")}>
                  <span className="wa-photo">
                    {/* This image belongs only to the WhatsApp reporting story. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/seed-dogs/dog6.jpg" alt="" loading="lazy" />
                    <span className="wa-photo-scan" />
                  </span>
                  <span className="wa-report-line"><b>Photo and observation</b><small><MapPin size={11} /> Shared location</small></span>
                  <span className="wa-meta">09:12 <CheckCheck size={13} /></span>
                </div>

                <div className={message(2, "is-in-msg is-received")}>
                  <span className="wa-kicker"><Check size={11} /> REPORT RECEIVED</span>
                  <span className="wa-record">Awaiting review</span>
                  <span className="wa-meta">09:13</span>
                </div>

                <div className={message(3, "is-in-msg is-assigned")}>
                  <span className="wa-assignee"><i><Check size={15} /></i><span><b>Team review</b><small>Assignment after acceptance</small></span></span>
                  <span className="wa-meta">10:40</span>
                </div>

                <div className={message(4, "is-in-msg is-good")}>
                  <span className="wa-good-icon"><Check size={15} /></span>
                  <span className="wa-text"><b>Care history</b><small>Updates when recorded</small></span>
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
        <figcaption><LockKeyhole size={12} aria-hidden /> Example conversation. Reports are reviewed; acceptance and care depend on participating teams.</figcaption>
        <p className="ld-wa-access">WhatsApp is available. Contact us for the channel, organisation setup and costs.</p>
      </figure>
    </section>
  );
}
