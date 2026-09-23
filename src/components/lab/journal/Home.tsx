import "./journal.css";
import { HOME, LAB, around, dateLabel, photo, shortId } from "../data";
import { Mast } from "./parts";
import { Today, type TRow } from "./Today";

export function JournalHome() {
  const near = around(HOME.lat, HOME.lng, 7, LAB.sightings.filter((s) => s.city === "Delhi")).sort((a, b) => b.s.at.localeCompare(a.s.at)).slice(0, 12);
  const rows: TRow[] = near.map(({ s, d }, i) => ({
    id: s.id, n: i + 1, lng: s.lng, lat: s.lat, zone: s.zone, when: dateLabel(s.at), km: d, img: photo(s.photo, 70),
    record: shortId(s.dog), status: s.help || s.status === "injured" ? "needs help" : "no help asked",
  }));
  // The sheet is fitted to the entries and the reader's own position, not to a fixed radius.
  const lngs = [HOME.lng, ...rows.map((r) => r.lng)], lats = [HOME.lat, ...rows.map((r) => r.lat)];
  const m = 0.006;
  return (
    <main className="fj">
      <Mast current="/lab/journal/home" right={`Today · ${dateLabel(LAB.snapshot)}`} />
      <Today rows={rows} home={HOME} box={[Math.min(...lngs) - m, Math.min(...lats) - m, Math.max(...lngs) + m, Math.max(...lats) + m]} />
    </main>
  );
}
