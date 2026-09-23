import "./civic.css";
import { LAB } from "../data";
import { hexbin } from "../geo";
import { Band } from "./parts";
import { Coverage, type CHex, type CLoc } from "./Coverage";

export function CivicMap() {
  type It = { lng: number; lat: number; a: number; h: number; s: number; e: number };
  const items: It[] = [
    ...LAB.cbe.animals.map((a) => ({ lng: a[0], lat: a[1], a: 1, h: a[2], s: a[3], e: 0 })),
    ...LAB.cbe.events.map((e) => ({ lng: e[0], lat: e[1], a: 0, h: 0, s: 0, e: 1 })),
  ];
  const hx = hexbin(items, (x) => [x.lng, x.lat], 11, 0.55);
  const hexes: CHex[] = hx.map((h) => ({
    key: h.key, ring: h.ring, center: h.center,
    animals: h.items.reduce((n, x) => n + x.a, 0), help: h.items.reduce((n, x) => n + x.h, 0),
    sterilised: h.items.reduce((n, x) => n + x.s, 0), events: h.items.reduce((n, x) => n + x.e, 0),
  }));
  const locs: CLoc[] = LAB.cbe.localities.map((l) => ({ name: l.name, animals: l.animals, help: l.help, sterilised: l.sterilised, cases: l.cases }));
  return (
    <main className="ci">
      <Band current="/lab/civic/map" code="COVERAGE · SAMPLE CITY: COIMBATORE" />
      <Coverage hexes={hexes} locs={locs} box={[76.86, 10.88, 77.08, 11.12]} />
    </main>
  );
}
