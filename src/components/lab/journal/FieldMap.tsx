import "./journal.css";
import { LAB, KIND, dayToDate, dateLabel } from "../data";
import { contours, projector, pathOf, km, type Box } from "../geo";
import { Mast } from "./parts";
import { Survey, type SDay } from "./Survey";

const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function JournalMap() {
  const ev = LAB.cbe.events;
  const q = (a: number[], f: number) => a[Math.floor(f * (a.length - 1))];
  const xs = ev.map((e) => e[0]).sort((a, b) => a - b), ys = ev.map((e) => e[1]).sort((a, b) => a - b);
  const box: Box = [q(xs, 0.02) - 0.01, q(ys, 0.02) - 0.01, q(xs, 0.98) + 0.01, q(ys, 0.98) + 0.01];
  const W = 760, H = 760;
  const { p, kmPx } = projector(box, W, H, 16);
  const ct = contours(ev.map((e) => [e[0], e[1]] as [number, number]), box, { res: 0.003, sigma: 2.6, levels: 9 });
  const terrain = ct.features.map((f) => {
    const pr = f.properties as { l: number; of: number; index: boolean };
    return { d: pathOf((f.geometry as GeoJSON.MultiLineString).coordinates as [number, number][][], p), w: pr.index ? 1.1 : 0.6, o: 0.12 + 0.3 * (pr.l / pr.of) };
  });
  let stipple = "";
  for (const [lng, lat] of ev) { const [x, y] = p(lng, lat); if (x > 0 && x < W && y > 0 && y < H) stipple += `M${x.toFixed(1)} ${y.toFixed(1)}h0`; }

  const zones = Object.entries(LAB.cbe.zones);
  const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/[,(].*$/, "").trim();
  const nearest = (lng: number, lat: number) => {
    let best = "", bd = Infinity;
    for (const [name, [zl, za]] of zones) { const d = (zl - lng) ** 2 + (za - lat) ** 2; if (d < bd) { bd = d; best = name; } }
    return title(best);
  };
  // The busiest field days by number of distinct places visited.
  const by = new Map<number, typeof ev>();
  const inBox = (e: (typeof ev)[number]) => e[0] > box[0] && e[0] < box[2] && e[1] > box[1] && e[1] < box[3];
  for (const e of ev.filter(inBox)) (by.get(e[2]) ?? by.set(e[2], []).get(e[2])!).push(e);
  const ranked = [...by.entries()]
    .map(([day, list]) => ({ day, list, places: new Set(list.map((e) => `${e[0].toFixed(2)},${e[1].toFixed(2)}`)).size }))
    .sort((a, b) => b.places - a.places || b.list.length - a.list.length).slice(0, 8)
    .sort((a, b) => b.day - a.day);
  const days: SDay[] = ranked.map(({ day, list }) => {
    // Nearest-neighbour walk from the westernmost entry.
    const left = list.slice().sort((a, b) => a[0] - b[0]);
    const order = [left.shift()!];
    while (left.length) {
      const last = order[order.length - 1];
      let bi = 0, bd = Infinity;
      left.forEach((e, i) => { const d = km([e[0], e[1]], [last[0], last[1]]); if (d < bd) { bd = d; bi = i; } });
      order.push(left.splice(bi, 1)[0]);
    }
    // Then uncross it (2-opt), so the pen never doubles back over itself.
    const dist = (a: (typeof ev)[number], b: (typeof ev)[number]) => km([a[0], a[1]], [b[0], b[1]]);
    for (let improved = true, pass = 0; improved && pass < 20; pass++) {
      improved = false;
      for (let i = 1; i < order.length - 1; i++) for (let j = i + 1; j < order.length; j++) {
        const a = order[i - 1], b = order[i], c = order[j], d = order[j + 1];
        const before = dist(a, b) + (d ? dist(c, d) : 0), after = dist(a, c) + (d ? dist(b, d) : 0);
        if (after < before - 1e-9) { order.splice(i, j - i + 1, ...order.slice(i, j + 1).reverse()); improved = true; }
      }
    }
    let length = 0;
    for (let i = 1; i < order.length; i++) length += km([order[i][0], order[i][1]], [order[i - 1][0], order[i - 1][1]]);
    const date = dayToDate(day);
    return {
      day, date: dateLabel(date), weekday: WD[date.getUTCDay()], length,
      stops: order.map(([lng, lat, , k]) => { const [x, y] = p(lng, lat); return { x, y, kind: KIND[k] ?? "Entry", place: nearest(lng, lat) }; }),
    };
  });
  return (
    <main className="fj">
      <Mast current="/lab/journal/map" right="Survey sheets · Coimbatore" />
      <Survey days={days} W={W} H={H} terrain={terrain} stipple={stipple} kmPx={kmPx} total={ev.length} />
    </main>
  );
}
