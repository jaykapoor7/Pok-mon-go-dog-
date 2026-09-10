import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";

export function Hero() {
  return (
    <section className="record-hero" aria-labelledby="hero-title">
      <div className="record-hero-image"><Image src="/straypaw-night-street.png" alt="An Indian indie dog walking through a neighbourhood street at blue hour" fill priority sizes="100vw" /></div>
      <div className="record-hero-shade" aria-hidden="true" />
      <div className="record-hero-copy">
        <p className="field-eyebrow">One ordinary evening. One shared neighbourhood.</p>
        <h1 id="hero-title"><span>They live</span><span>here, <em>too.</em></span></h1>
        <p>When someone notices, the city can remember. StrayPaw turns a moment on the street into a place people can return to.</p>
        <div className="record-hero-actions"><Link href="/map" className="field-button">Explore the map <ArrowUpRight size={20}/></Link><Link href="/report" className="field-text-link">Report a sighting <ArrowUpRight size={17}/></Link></div>
      </div>
      <div className="record-hero-progress" aria-hidden="true"><span>01</span><i /><span>03</span></div>
      <aside className="record-hero-card" aria-label="An example of how a StrayPaw record begins">
        <div className="record-card-kicker"><span>FIELD RECORD</span><span>STARTING NOW</span></div>
        <h2>A moment worth keeping.</h2>
        <dl><div><dt>What happened</dt><dd>Someone was noticed</dd></div><div><dt>What comes next</dt><dd>Photo · place · follow-up</dd></div></dl>
        <p>Scroll to see how a memory becomes useful.</p>
      </aside>
      <a href="#record-sequence" className="record-hero-scroll"><ArrowDown size={17}/><span>Follow the record</span></a>
    </section>
  );
}
