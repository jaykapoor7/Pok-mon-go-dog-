import "./atlas.css";
import { HOME, LAB, around, ago, coord, dateLabel, photo } from "../data";
import { Masthead } from "./parts";
import { Neighbourhood, type NFig } from "./Neighbourhood";

export function AtlasHome() {
  const near = around(HOME.lat, HOME.lng, 9, LAB.sightings.filter((s) => s.city === "Delhi"))
    .sort((a, b) => b.s.at.localeCompare(a.s.at))
    .slice(0, 14);
  const figs: NFig[] = near.map(({ s, d }, i) => ({
    id: s.id, n: i + 1, lng: s.lng, lat: s.lat, zone: s.zone, km: d, when: s.at, ago: ago(s.at), status: s.status, help: s.help || s.status === "injured",
    img: photo(s.photo, 130), coord: coord(s.lat, s.lng),
  }));
  const last = near[0]?.s.at;
  const byZone = new Map<string, { lng: number; lat: number; n: number }>();
  for (const f of figs) { const z = byZone.get(f.zone) ?? { lng: 0, lat: 0, n: 0 }; z.lng += f.lng; z.lat += f.lat; z.n++; byZone.set(f.zone, z); }
  const places = [...byZone].map(([name, z]) => ({ name, lng: z.lng / z.n, lat: z.lat / z.n, n: z.n }));
  return (
    <main className="la">
      <Masthead current="/lab/atlas/home" />
      <div className="la-page">
        <div className="la-title">
          <div>
            <span className="cap">Your area · South Delhi</span>
            <h1>Around Hauz Khas</h1>
            <p>{figs.length} observations within 9 km{last ? ` · the latest ${dateLabel(last)}` : ""} · {figs.filter((f) => f.help).length ? `${figs.filter((f) => f.help).length} reported injured` : "none reported injured"}</p>
          </div>
          <div className="la-desk-cta">
            <button type="button" className="la-cta"><span className="dot" />Add an observation</button>
            <a className="la-cta-2" href="#">Use my location</a>
          </div>
        </div>
        <Neighbourhood figs={figs} home={{ ...HOME }} places={places} />
      </div>
      <div className="la-mobile-cta"><button type="button" className="la-cta"><span className="dot" />Add an observation</button></div>
    </main>
  );
}
