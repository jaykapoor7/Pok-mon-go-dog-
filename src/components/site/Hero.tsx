"use client";

import Link from "next/link";
import { ORGS } from "@/lib/platform/orgs";
import { STATES } from "@/lib/platform/geography";

const ORG_COUNT = ORGS.length;
const STATE_COUNT = STATES.length;
import { useEffect } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * Cinematic hero. A real field photograph sits behind a parallax wash; a
 * three-plane "depth spine" on the right stands in for the evidence stack the
 * product builds. Both track scroll through the --sp-progress custom property,
 * so the whole scene moves as one system rather than as separate animations.
 */
export function Hero() {
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = Math.min(window.scrollY / Math.max(window.innerHeight * 1.1, 1), 1);
        document.documentElement.style.setProperty("--sp-progress", p.toFixed(3));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="sp-hero" id="top">
      <div
        className="sp-hero-canvas"
        aria-label="A street-level observation moving through the StrayPaw evidence system"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="sp-hero-img"
          src="/hero/skyline-dog.jpg"
          alt="A street dog on a rooftop overlooking an Indian city at golden hour"
        />
        <div className="sp-hero-wash" />
        <div className="sp-hero-grain" />

        <div className="sp-spine" aria-hidden="true">
          <span className="sp-spine-plane p1" />
          <span className="sp-spine-plane p2" />
          <span className="sp-spine-plane p3" />
          <span className="sp-spine-core" />
        </div>

        {/* Pan-India figures, not one city's. Both are real counts from the
            sourced datasets rather than a headline stat. */}
        <div className="sp-hero-caption">
          <span>PAN-INDIA</span>
          <span>
            {STATE_COUNT} STATES / {ORG_COUNT} ORGANISATIONS MAPPED
          </span>
        </div>
        <div className="sp-hero-signal left" aria-hidden="true">
          OBSERVE <i />
        </div>
        <div className="sp-hero-signal right" aria-hidden="true">
          OUTCOME <i />
        </div>
      </div>

      <div className="sp-hero-copy">
        <div className="sp-eyebrow">
          STRAYPAW / RECORD SYSTEM FOR STREET ANIMALS
        </div>
        <h1>
          Every street dog,
          <br />
          <em>on the record.</em>
        </h1>
        <p className="sp-hero-lede">
          StrayPaw gives India&rsquo;s street animals a permanent identity and
          a shared record — so NGOs, municipalities and funders finally work
          from the same data instead of three different notebooks.
        </p>
        <div className="sp-hero-ctas">
          <a href="#how" className="sp-btn sp-btn-primary">
            See how it works <ArrowDownRight size={16} />
          </a>
          <Link href="/map" className="sp-hero-link">
            Enter the living map <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      <div className="sp-hero-foot sp-mono">
        <span>ONE SIGNAL → ONE SYSTEM → ONE OUTCOME</span>
        <span>SCROLL TO TRACE</span>
      </div>
    </section>
  );
}
