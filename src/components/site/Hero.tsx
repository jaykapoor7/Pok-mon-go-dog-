import Link from "next/link";
import { ArrowUpRight, Check, MapPin, Radio, Route } from "lucide-react";
import { dogLabel } from "@/lib/utils";
import type { Dog } from "@/lib/types";

/** The hero leads with the actual unit of value: a durable field record. It
 * deliberately does not pretend an illustrative map is the product. */
export function Hero({ dogs }: { dogs: Dog[] }) {
  const record = dogs.find((dog) => Number.isFinite(dog.lat) && Number.isFinite(dog.lng));
  const label = record ? dogLabel(record) : "A new animal";
  const place = record?.zone || "Your neighbourhood";

  return (
    <section className="product-hero product-hero-record" aria-labelledby="hero-title">
      <div className="product-hero-copy">
        <p className="field-eyebrow">The field record for India&apos;s street animals</p>
        <h1 id="hero-title">A street animal<br />should not have to<br /><em>start from zero.</em></h1>
        <p>StrayPaw gives each sighting a place to live: one record people can recognise, update and act on together.</p>
        <div className="product-hero-actions">
          <Link href="/report" className="field-button">Report a sighting <ArrowUpRight size={19} /></Link>
          <Link href="/map" className="field-text-link">See the live map <ArrowUpRight size={17} /></Link>
        </div>
        <p className="product-hero-note">A photo and a location are enough. No account required.</p>
      </div>

      <div className="hero-record-stage" aria-label="A StrayPaw field record taking shape">
        <div className="hero-coordinate hero-coordinate-one" aria-hidden />
        <div className="hero-coordinate hero-coordinate-two" aria-hidden />
        <div className="hero-record-line hero-record-line-one" aria-hidden />
        <div className="hero-record-line hero-record-line-two" aria-hidden />
        <span className="hero-record-place"><MapPin size={14} /> {place}</span>
        <div className="hero-record-file">
          <header>
            <span>STRAYPAW / FIELD RECORD</span>
            <span className="hero-record-live"><i /> LIVE</span>
          </header>
          <div className="hero-record-name">
            <div className="hero-record-mark"><Route size={20} /></div>
            <div><span>ANIMAL ON RECORD</span><b>{label}</b></div>
          </div>
          <dl>
            <div><dt>Last seen</dt><dd>{place}</dd></div>
            <div><dt>Visible care status</dt><dd>Still being recorded</dd></div>
            <div><dt>Shared context</dt><dd><Check size={13} /> Ready for the next visit</dd></div>
          </dl>
          <footer><Radio size={14} /> New information stays with the animal, not in another chat.</footer>
        </div>
        <div className="hero-record-caption"><span>ONE SIGHTING</span><i /><span>ONE SHARED MEMORY</span></div>
      </div>
    </section>
  );
}
