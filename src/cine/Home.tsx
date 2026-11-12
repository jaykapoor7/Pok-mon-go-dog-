/* ════════════════════════════════════════════════════════════════════
   The cinematic homepage: "The whole world, connected."

     01 + 02  the world, then the world made legible (one held scene)
     03       Meet Kaju: the intelligence in that network, asked a question
     04       the actual platform: a point on the map opens into the software
     05       one connected ecosystem: One Health as one system
     06       proof, kept honest, and the way in

   Shown only when next.config.mjs says "cinematic"; the earlier
   homepage is untouched and comes back with one value.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { STORIES, fieldPartnerStrip } from "@/sp3/customers";
import { LIVE_DEMO_URL } from "@/lib/demo-site";
import { CineNav } from "./CineNav";
import { CineFooter } from "./CineFooter";
import { Story } from "./Story";
import { KajuDemo } from "./KajuDemo";
import { Platform } from "./Platform";
import { Ecosystem } from "./Ecosystem";
import "./cine.css";

export const CINEMATIC_METADATA = {
  title: "StrayPaw · The whole world, connected",
  description: "One connected platform for animal care, programme verification and public-health intelligence. Every animal, treatment and report on one record, with Kaju to read it.",
};

/* What exists today, kept apart from what is shown with sample records and from what is not connected yet. */
const STATUS: { s: "live" | "demo" | "planned"; label: string; items: string[] }[] = [
  { s: "live", label: "In the product today", items: ["Field capture on phones, with offline records", "Animal register and register imports, labelled by source", "Veterinary sign-off and release evidence", "Report packages for a reviewing office", "Kaju, reading with each person's own permissions"] },
  { s: "demo", label: "In the live demo, with sample records", items: ["A city One Health programme: hospitals, laboratory, coordination", "Bite records and dose courses at a hospital", "Laboratory samples, from collection to result", "Municipal review of packages"] },
  { s: "planned", label: "Not connected yet", items: ["WhatsApp intake, waiting for Meta approval", "Hospital and laboratory information systems", "Photo identification of animals"] },
];

export const metadata = CINEMATIC_METADATA;

export default function CinematicHome() {
  const partners = fieldPartnerStrip();
  const story = STORIES[0];
  return (
    <div className="cn8">
      <PageView name="landing_view" />
      <CineNav />
      <main id="cn8-main">
        <Story />

        {/* 03 · Meet Kaju */}
        <section className="cn8-sec cn8-kaju" aria-labelledby="cn8-kaju-h">
          <div className="cn8-wrap cn8-kaju-grid">
            <div>
              <p className="cn8-k">Meet Kaju</p>
              <h2 id="cn8-kaju-h" className="cn8-h2">The intelligence in the network, answerable to the record.</h2>
              <p className="cn8-lede">Kaju is built into StrayPaw. It reads what your role can read, shows each step it takes, names the records behind every answer, and prepares work for a person to confirm. It never approves a procedure or a payment.</p>
              <Link href="/kaju" className="cn8-btn is-line">Meet Kaju<ArrowRight size={15} aria-hidden /></Link>
            </div>
            <KajuDemo asks={undefined} />
          </div>
        </section>

        <Platform />
        <Ecosystem />

        {/* 06 · proof, kept honest */}
        <section className="cn8-sec cn8-proof" aria-labelledby="cn8-proof-h">
          <div className="cn8-wrap">
            <p className="cn8-k">Proof</p>
            <h2 id="cn8-proof-h" className="cn8-h2">What is real today, and what is not yet.</h2>
            <div className="cn8-proof-grid">
              <article className="cn8-story-card">
                <p className="cn8-tagline"><span className="cn8-tag is-green">Operational</span>{story.city}</p>
                <h3>{story.name}</h3>
                <p>{story.summary}</p>
                <Link href={`/customers/${story.slug}`} className="cn8-link">Read how<ArrowRight size={13} aria-hidden /></Link>
              </article>
              {STATUS.map((g) => (
                <article key={g.s} className={`cn8-status is-${g.s}`}>
                  <p className="cn8-tagline"><span className={`cn8-tag is-${g.s === "live" ? "green" : g.s === "demo" ? "blue" : "plain"}`}>{g.s === "live" ? "Live" : g.s === "demo" ? "Illustrative" : "Planned"}</span>{g.label}</p>
                  <ul>{g.items.map((x) => <li key={x}>{x}</li>)}</ul>
                </article>
              ))}
            </div>
            <ul className="cn8-partners" aria-label="Field partners">
              {partners.slice(0, 8).map((p) => <li key={p.name}><b>{p.name}</b><small>{p.city}{p.relationship === "operational" ? " · operational" : p.relationship === "imported" ? " · records imported" : " · field partner"}</small></li>)}
            </ul>
          </div>
        </section>

        {/* the way in */}
        <section className="cn8-sec cn8-close" aria-labelledby="cn8-close-h">
          <div className="cn8-wrap">
            <h2 id="cn8-close-h" className="cn8-h2">See the whole world, connected.</h2>
            <p className="cn8-lede">The live demo is the real product with sample records. Choose a role and do the work.</p>
            <div className="cn8-acts is-centre">
              <a href={LIVE_DEMO_URL} className="cn8-btn is-primary is-lg">Explore live demo<ArrowRight size={16} aria-hidden /></a>
              <Link href="/sign-in" className="cn8-btn is-line is-lg">Sign in</Link>
            </div>
          </div>
        </section>
      </main>
      <CineFooter />
    </div>
  );
}
