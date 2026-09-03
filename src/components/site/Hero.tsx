"use client";

import Link from "next/link";
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
          alt="A street dog on a rooftop overlooking Delhi at golden hour"
        />
        <div className="sp-hero-wash" />
        <div className="sp-hero-grain" />

        <div className="sp-spine" aria-hidden="true">
          <span className="sp-spine-plane p1" />
          <span className="sp-spine-plane p2" />
          <span className="sp-spine-plane p3" />
          <span className="sp-spine-core" />
        </div>

        <div className="sp-hero-caption">
          <span>FIELD RECORD / SP-1042</span>
          <span>DELHI NCR / 07:42 IST</span>
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
          <span className="sp-eyebrow-dot" />
          STRAYPAW / INFRASTRUCTURE FOR CARE
        </div>
        <h1>
          Make care
          <br />
          <em>measurable.</em>
        </h1>
        <p className="sp-hero-lede">
          The system connecting street-level evidence to the people who can act.
        </p>
        <div className="sp-hero-ctas">
          <a href="#companies" className="sp-btn sp-btn-primary">
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
