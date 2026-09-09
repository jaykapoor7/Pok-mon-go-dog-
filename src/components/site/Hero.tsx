"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/** A documentary-first welcome: a real observation, then a clear next step. */
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
      <div className="sp-hero-copy">
        <div className="sp-eyebrow"><span className="sp-eyebrow-dot" /> A SHARED RECORD FOR STREET ANIMALS</div>
        <h1>
          Start with
          <br />
          <em>what you see.</em>
        </h1>
        <p className="sp-hero-lede">
          A photo, a location and a few details can become a record that local
          people and welfare teams can return to over time.
        </p>
        <div className="sp-hero-ctas">
          <Link href="/report" className="sp-btn sp-btn-primary">
            Report a sighting <ArrowDownRight size={16} />
          </Link>
          <Link href="/map" className="sp-hero-link">
            Explore the map <ArrowUpRight size={16} />
          </Link>
        </div>
        <p className="sp-hero-note">Built for neighbours, feeders and field teams.</p>
      </div>

      <div className="sp-hero-observation">
        <div className="sp-hero-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="sp-hero-photo"
            src="/dogs/delhi/brown-on-ledge.jpg"
            width={756}
            height={1344}
            fetchPriority="high"
            alt="A street dog resting on a neighbourhood doorstep"
          />
          <div className="sp-hero-photo-caption">
            <span>FIELD NOTE / 01</span>
            <span>A photo. A place. A record.</span>
          </div>
        </div>
        <div className="sp-hero-route" aria-hidden="true"><i /><i /><i /></div>
        <div className="sp-hero-observation-copy">
          <span>ONE CLEAR START</span>
          <p>Observe carefully. Share only what helps someone respond well.</p>
        </div>
      </div>
    </section>
  );
}
