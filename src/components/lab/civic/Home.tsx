import "./civic.css";
import { HOME, LAB, around, dateLabel, photo, shortId } from "../data";
import { hexbin } from "../geo";
import { Band } from "./parts";
import { Ward, type WRow, type WHex } from "./Ward";

export function CivicHome() {
  const near = around(HOME.lat, HOME.lng, 9, LAB.sightings.filter((s) => s.city === "Delhi")).sort((a, b) => b.s.at.localeCompare(a.s.at)).slice(0, 16);
  const hx = hexbin(near, (x) => [x.s.lng, x.s.lat], HOME.lat, 0.55);
  const keyOf = new Map(hx.flatMap((h) => h.items.map((x) => [x.s.id, h.key] as const)));
  const rows: WRow[] = near.map(({ s, d }, i) => ({
    id: s.id, n: i + 1, lng: s.lng, lat: s.lat, zone: s.zone, km: d, when: dateLabel(s.at), img: photo(s.photo, 70),
    injured: s.status === "injured" || s.help, record: shortId(s.dog), hex: keyOf.get(s.id) ?? "",
  }));
  const hexes: WHex[] = hx.map((h) => ({ key: h.key, ring: h.ring, count: h.items.length }));
  return (
    <main className="ci" style={{ display: "flex", flexDirection: "column" }}>
      <Band current="/lab/civic/home" code="WARD VIEW · SOUTH DELHI" />
      <Ward rows={rows} hexes={hexes} home={{ lng: HOME.lng, lat: HOME.lat }} />
      <div className="ci-report-bar">
        <div><b>Report an animal</b> <span>· a location is required, a photograph helps</span></div>
        <button type="button" className="ci-btn">Start a report →</button>
      </div>
    </main>
  );
}
