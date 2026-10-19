import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { INDIA_PATH, INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";
import type { NationalCity } from "@/lib/livingmap/types";

/** Real public city rollups, drawn on the app's actual geographic outline. No demo markers. */
export function HeroRecord({ cities }: { cities: NationalCity[] }) {
  const placed = cities.filter((city) => city.animals > 0 && Number.isFinite(city.lng) && Number.isFinite(city.lat));
  return <div className="hm-record" data-ui>
    <header><span className="hm-brand"><MapPin size={18} aria-hidden /><b>Living Map</b></span><span className="hm-public">Public record</span></header>
    <div className="hm-body">
      <div className="hm-map"><svg viewBox={`-8 -6 ${INDIA_VIEW.w + 16} ${INDIA_VIEW.h + 12}`} role="img" aria-label={placed.length ? "India, showing cities with animal records. City locations are approximate; this is not a population census." : "Geographic outline of India. Public record coverage is unavailable right now."}>
        <path d={INDIA_PATH} className="hm-land" />
        {placed.map(city => {
          const [x, y] = indiaXY(city.lng!, city.lat!);
          return <circle key={city.city} cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.45" className="hm-city"><title>{city.city}</title></circle>;
        })}
      </svg></div>
      <aside><b>Cities on the record</b>{placed.length ? <ul>{placed.slice(0, 5).map(city => <li key={city.city}><span aria-hidden /><span>{city.city}</span></li>)}</ul> : <p>Public coverage is unavailable right now.</p>}<p className="hm-definition">Imported history and community reports. Coverage varies by place.</p></aside>
    </div>
    <footer><span>Recorded places, with gaps in view.</span><Link href="/explore">Open the map <ArrowUpRight size={15} aria-hidden /></Link></footer>
  </div>;
}
