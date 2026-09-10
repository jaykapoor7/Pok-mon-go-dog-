import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, Check, MapPin } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import type { Dog } from "@/lib/types";

/** The product is the hero. A real map and real records make the promise
 * legible before anyone needs to read a feature list. */
export function Hero({ dogs }: { dogs: Dog[] }) {
  const first = dogs.find((dog) => Number.isFinite(dog.lat) && Number.isFinite(dog.lng));
  return (
    <section className="product-hero" aria-labelledby="hero-title">
      <div className="product-hero-copy">
        <p className="field-eyebrow">A shared record for India&apos;s street animals</p>
        <h1 id="hero-title">One sighting can<br />change what happens <em>next.</em></h1>
        <p>StrayPaw turns a photo and a place into a record that neighbours, feeders, and animal-welfare teams can return to.</p>
        <div className="product-hero-actions">
          <Link href="/report" className="field-button">Report a sighting <ArrowUpRight size={19} /></Link>
          <Link href="/map" className="field-text-link">Explore the live map <ArrowUpRight size={17} /></Link>
        </div>
        <p className="product-hero-note">No account needed to report. A shared history begins with what you saw.</p>
      </div>

      <div className="hero-product" aria-label="A StrayPaw report placed on the live map">
        <div className="hero-product-top"><span>LIVE MAP</span><span>India</span></div>
        <div className="hero-live-map">
          <MapCanvas dogs={dogs} center={first ? { lat: first.lat, lng: first.lng } : { lat: 28.6139, lng: 77.209 }} />
        </div>
        <div className="hero-location"><MapPin size={15} /><span>{first?.zone || "Your neighbourhood"}</span><i>Pin placed</i></div>
        <div className="hero-report-card">
          <Image src="/straypaw-night-street.png" alt="A dog photographed for a StrayPaw sighting" width={72} height={72} priority />
          <div className="hero-report-copy"><span>NEW SIGHTING</span><b>Photo, place, what you know</b><small>Saved to the shared map</small></div>
          <Check size={18} className="hero-report-check" />
        </div>
        <div className="hero-capture"><Camera size={15} /> Report from the street</div>
      </div>
    </section>
  );
}
