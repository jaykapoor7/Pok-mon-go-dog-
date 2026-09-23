/* The lab's data: a snapshot of StrayPaw's PUBLIC views, taken 23 Sep 2026.

   Nothing here is invented. Every figure, locality, date and photograph is
   read from public_animal_profiles, public_field_activity,
   public_case_stories and public_live_sightings — the same views the live
   site reads with the anonymous key. Positions are published to 0.01°
   (roughly a kilometre); points are spread deterministically inside their
   cell so a street does not render as one dot, and every surface that
   draws them says so. */
import raw from "./data/lab-data.json";

export type Ev = [lng: number, lat: number, day: number, kind: number];
export type Pt = [lng: number, lat: number, help: 0 | 1, sterilised: 0 | 1, vaccinated: 0 | 1];
export type Locality = { name: string; lng: number; lat: number; animals: number; help: number; sterilised: number; vaccinated: number; cases: number; open: number };
export type Sighting = { id: string; dog: string; lng: number; lat: number; zone: string; city: string; at: string; photo: string; status: string; help: boolean };
export type RecordEvent = { at: string; kind: string; title: string };
export type RecordCase = { at: string; category: string; status: string; title: string; outcome: string | null; resolved: string | null };
export type AnimalRecord = {
  id: string; name: string | null; zone: string; lat: number | null; lng: number | null; status: string;
  sterilisation: string; vaccination: string; firstSeen: string; lastSeen: string; photo: string | null; ngo: string | null;
  events: RecordEvent[]; cases: RecordCase[]; sensitivePhoto?: boolean; localityCentroid?: [number, number];
};
export type QueueItem = { id: string; dog: string; at: string; status: string; category: string; title: string; zone: string; photo: string | null };
export type Outcome = { id: string; dog: string; at: string; opened: string; category: string; zone: string; outcome: string };
export type City = { city: string; state: string; lat: number; lng: number; animals: number; reports: number };
export type Month = { m: string; cases: number; care: number; sterilised: number; vaccinated: number; rescue: number; resolved: number };

type Lab = {
  snapshot: string; epoch: string; note: string;
  totals: Record<string, number>;
  cbe: { box: [number, number, number, number]; events: Ev[]; animals: Pt[]; localities: Locality[]; categories: [string, number][]; monthly: Month[]; zones: Record<string, [number, number]> };
  sightings: Sighting[];
  records: { veerakeralam: AnimalRecord; rspuram: AnimalRecord };
  queue: QueueItem[];
  outcomes: Outcome[];
  india: City[];
};

export const LAB = raw as unknown as Lab;

/** Event kinds, in the order the snapshot encodes them. */
export const KIND = ["Case opened", "Treatment", "Sterilisation (ABC)", "Vaccination", "Surgery", "Diagnostic", "Rescue", "Wound care"] as const;

const EPOCH = Date.UTC(2024, 0, 1);
export const dayToDate = (d: number) => new Date(EPOCH + d * 86400000);
export const TODAY = new Date(Date.UTC(2026, 8, 23));

export const fmt = (n: number) => n.toLocaleString("en-IN");
export const pct = (n: number, d: number, dp = 1) => (d ? ((n / d) * 100).toFixed(dp) : "0");

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function dateLabel(iso: string | Date, style: "long" | "short" | "month" = "long") {
  const d = typeof iso === "string" ? new Date(iso.length <= 10 ? iso + "T00:00:00Z" : iso) : iso;
  const day = d.getUTCDate(), m = MON[d.getUTCMonth()], y = d.getUTCFullYear();
  if (style === "month") return `${m} ${y}`;
  if (style === "short") return `${day} ${m}`;
  return `${day} ${m} ${y}`;
}
export function daysBetween(a: string, b: string | Date = TODAY) {
  const A = new Date(a.slice(0, 10) + "T00:00:00Z").getTime();
  const B = typeof b === "string" ? new Date(b.slice(0, 10) + "T00:00:00Z").getTime() : b.getTime();
  return Math.round((B - A) / 86400000);
}
export function ago(iso: string) {
  const d = daysBetween(iso);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  const m = Math.round(d / 30.4);
  return m < 12 ? `${m} month${m === 1 ? "" : "s"} ago` : `${Math.round(m / 12)} yr ago`;
}
/** Coordinates as a cartographer writes them. */
export function dms(v: number, pos: string, neg: string) {
  const a = Math.abs(v), deg = Math.floor(a), min = Math.round((a - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′${v >= 0 ? pos : neg}`;
}
export const coord = (lat: number, lng: number) => `${dms(lat, "N", "S")} ${dms(lng, "E", "W")}`;
/** The record's own identifier, shortened. Not an invented code. */
export const shortId = (id: string) => `${id.slice(0, 4)}·${id.slice(4, 8)}`;

/** Photographs go through Next's optimiser, as they do on the live site. */
export function photo(src: string, width: number, q = 70) {
  if (!/^https?:\/\//.test(src)) return src;
  const allowed = [256, 384, 640, 750, 828, 1080, 1200, 1920];
  const w = allowed.find((a) => a >= width * 2) ?? 1920;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

/** Real sightings around a place, nearest first. */
export function around(lat: number, lng: number, km: number, list = LAB.sightings) {
  const k = Math.cos((lat * Math.PI) / 180);
  return list
    .map((s) => ({ s, d: Math.hypot((s.lat - lat) * 111, (s.lng - lng) * 111 * k) }))
    .filter((x) => x.d <= km)
    .sort((a, b) => a.d - b.d);
}

/** The community home is set around Hauz Khas, where most real uploads are. */
export const HOME = { name: "Hauz Khas", lat: 28.55, lng: 77.2 };

/** The field day with the most recorded events: a real day's work. */
export function busiestDay() {
  const by = new Map<number, Ev[]>();
  for (const e of LAB.cbe.events) (by.get(e[2]) ?? by.set(e[2], []).get(e[2])!).push(e);
  let best = 0, list: Ev[] = [];
  for (const [d, l] of by) {
    const places = new Set(l.map((e) => `${e[0].toFixed(2)},${e[1].toFixed(2)}`)).size;
    if (places > best || (places === best && l.length > list.length)) { best = places; list = l; }
  }
  return { day: list[0]?.[2] ?? 0, events: list };
}

/** Photographs chosen for composition, by sighting id. All are real uploads. */
export const FEATURED = ["89fd89e1", "bd746113", "58b60f89", "3574c6a3", "6c2067f1", "b70a2fc4", "d811de7b", "5412ba94", "9a32eeae", "8cc8bdf7"];
export const sighting = (prefix: string) => LAB.sightings.find((s) => s.id.startsWith(prefix))!;
export const featured = (n = FEATURED.length) => FEATURED.slice(0, n).map(sighting).filter(Boolean);

/** Day offsets and labels for the complete record used on every landing. */
export function veeraEntries() {
  const r = LAB.records.veerakeralam;
  const start = r.cases[0]?.at ?? r.events[0].at;
  const off = (d: string) => daysBetween(start, d);
  const seen = new Set<string>();
  const out: { day: number; date: string; label: string; kind: "case" | "abc" | "vacc" | "treat" | "close" }[] = [];
  for (const e of r.events) {
    const kind = e.kind === "case" ? "case" : e.kind === "sterilisation" ? "abc" : e.kind === "vaccination" ? "vacc" : "treat";
    const key = `${e.at}-${kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = kind === "case" ? "Case opened — maggot wound" : kind === "abc" ? "Sterilised · ABC" : kind === "vacc" ? "Vaccinated" : "Treated";
    out.push({ day: off(e.at), date: e.at, label, kind });
  }
  const c = r.cases[0];
  if (c?.resolved) out.push({ day: off(c.resolved), date: c.resolved, label: `Case closed · outcome recorded: ${c.outcome}`, kind: "close" });
  const order = { case: 0, abc: 1, treat: 2, vacc: 3, close: 4 } as const;
  out.sort((a, b) => a.day - b.day || order[a.kind] - order[b.kind]);
  return { start, entries: out, place: "Anantha Nagar, Veerakeralam" };
}

/** Where a locality is, from the centroid of everything recorded under its name. */
export const zoneAt = (name: string) => LAB.cbe.zones[name.trim().toLowerCase()] ?? null;

/** Where the register is, across India. Coimbatore is shown throughout as the sample city: it is the densest register we hold. */
export const SAMPLE = "Coimbatore";
export const CITIES = LAB.india;
