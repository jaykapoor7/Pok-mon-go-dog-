import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";

export function Hero() {
  return (
    <section className="street-hero" aria-labelledby="hero-title">
      <div className="street-hero-top">
        <div className="street-hero-heading">
          <p className="field-eyebrow">India’s street animals. Our shared neighbourhoods.</p>
          <h1 id="hero-title"><span>They live</span><span>here, <em>too.</em></span></h1>
        </div>
        <div className="street-hero-intro">
          <p>Not every neighbour has an address.</p>
          <p>StrayPaw puts street animals on the map, with a record of the sightings and care that follow.</p>
          <Link href="/map" className="field-button">Explore the map <ArrowUpRight size={20}/></Link>
          <Link href="/report" className="field-text-link">Report a sighting <ArrowUpRight size={17}/></Link>
        </div>
      </div>
      <div className="street-hero-frame">
        <div className="street-hero-image"><Image src="/field-observation-atlas.png" alt="An illustrated Indian street, with a dog in the afternoon light" fill priority sizes="100vw" /></div>
        <div className="street-image-title" aria-hidden="true">A place in the neighbourhood.</div>
        <div className="street-image-bottom"><a href="#neighbourhood"><ArrowDown size={18}/> Start with your street</a><span>StrayPaw street illustration</span></div>
      </div>
      <div className="street-hero-foot"><span>A photo. A place. A little attention.</span><span>That’s a starting point.</span></div>
    </section>
  );
}
