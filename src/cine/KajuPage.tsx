"use client";

/* ════════════════════════════════════════════════════════════════════
   Meet Kaju: the same world, seen from its western ridge, with the map's
   lines showing through the grass. Four things Kaju does, each with its
   own demonstration: understand, investigate, prepare, coordinate. Then
   the rules it keeps, which are what make it useful.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, FileCheck2, Network, Search } from "lucide-react";
import { CineNav } from "./CineNav";
import { CineFooter } from "./CineFooter";
import { World } from "./world/World";
import { ASKS, KajuDemo, type Cap } from "./KajuDemo";
import { LIVE_DEMO_URL } from "@/lib/demo-site";
import "./cine.css";

const CAPS: { id: Cap; t: string; d: string; I: typeof Eye }[] = [
  { id: "understand", t: "Understand", d: "Retrieves and reads programme records: what changed, what is missing, what is due.", I: Eye },
  { id: "investigate", t: "Investigate", d: "Examines evidence, identities and places: a possible duplicate, a gap in a chain, a cluster on the map.", I: Search },
  { id: "prepare", t: "Prepare", d: "Drafts summaries, report packages and tasks. A person reviews and confirms each one.", I: FileCheck2 },
  { id: "coordinate", t: "Coordinate", d: "Connects the work between partners: a hospital's request reaches the area's field team.", I: Network },
];
const RULES: [string, string][] = [
  ["Your permissions, never more", "Kaju reads only what the person asking can read. A hospital's patients never reach an NGO through Kaju."],
  ["Every step shown", "Each run lists what Kaju read and checked, with the time, while it works."],
  ["Every answer cited", "Answers name the records they rest on; each reference opens the record."],
  ["People decide", "Kaju prepares. It never approves a procedure, a package or a payment, and never prescribes."],
];

export function KajuPage() {
  const [cap, setCap] = useState<Cap>("understand");
  const [ok, setOk] = useState(true);
  const c = CAPS.find((x) => x.id === cap)!;
  return (
    <div className="cn8 cn8-kp">
      <CineNav />
      <main id="cn8-main">
        <section className="cn8-kp-hero">
          <div className={`cn8-world${ok ? "" : " is-flat"}`}>{ok ? <World view="kaju" onReady={setOk} /> : null}<span className="cn8-sky" aria-hidden /></div>
          <div className="cn8-kp-hero-in">
            <h1 className="cn8-h1"><span>Meet</span> <span>Kaju.</span></h1>
            <p className="cn8-sub">The intelligence built into StrayPaw. Kaju reads the record of the whole programme, shows its working, and prepares what your team would otherwise assemble by hand.</p>
            <div className="cn8-acts"><a href="#cn8-caps" className="cn8-btn is-primary is-lg">See what Kaju does<ArrowRight size={16} aria-hidden /></a><a href={LIVE_DEMO_URL} className="cn8-btn is-ghost is-lg">Try it in the live demo</a></div>
          </div>
        </section>

        <section id="cn8-caps" className="cn8-sec cn8-kp-caps" aria-labelledby="cn8-caps-h">
          <div className="cn8-wrap">
            <p className="cn8-k">Four things Kaju does</p>
            <h2 id="cn8-caps-h" className="cn8-h2">Understand, investigate, prepare, coordinate.</h2>
            <div className="cn8-kp-grid">
              <div className="cn8-kp-list" role="tablist" aria-label="What Kaju does">
                {CAPS.map((x, i) => (
                  <button key={x.id} type="button" role="tab" aria-selected={cap === x.id} aria-controls="cn8-kp-demo" onClick={() => setCap(x.id)}>
                    <span className="cn8-kp-n">0{i + 1}</span><x.I size={18} aria-hidden /><span><b>{x.t}</b><small>{x.d}</small></span>
                  </button>
                ))}
              </div>
              <div id="cn8-kp-demo" role="tabpanel" aria-label={c.t}>
                <KajuDemo key={cap} asks={[...ASKS.filter((a) => a.cap === cap), ...ASKS.filter((a) => a.cap !== cap)].slice(0, 3)} />
              </div>
            </div>
          </div>
        </section>

        <section className="cn8-sec cn8-kp-rules" aria-labelledby="cn8-rules-h">
          <div className="cn8-wrap">
            <p className="cn8-k">The rules Kaju keeps</p>
            <h2 id="cn8-rules-h" className="cn8-h2">Useful because it is answerable.</h2>
            <ul className="cn8-kp-rule-grid">{RULES.map(([t, d], i) => <li key={t} style={{ ["--i" as string]: i }}><b>{t}</b><p>{d}</p></li>)}</ul>
            <div className="cn8-acts"><a href={LIVE_DEMO_URL} className="cn8-btn is-primary is-lg">Explore live demo<ArrowRight size={16} aria-hidden /></a><Link href="/platform" className="cn8-btn is-line is-lg">See the platform</Link></div>
          </div>
        </section>
      </main>
      <CineFooter />
    </div>
  );
}
