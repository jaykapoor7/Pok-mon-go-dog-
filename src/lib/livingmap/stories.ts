/* ════════════════════════════════════════════════════════════════════
   Three connected stories.

   The map tells three stories about the same places, and every area
   carries all three at once, so moving between them never loses the
   thread:

     DOCUMENTED       where animals are on the record, and how good that
                      record is (the disc: how many, how well placed)
     CARED FOR        where care is happening (the ring around the disc:
                      sterilised · recorded not sterilised · not known)
     NEEDS ATTENTION  where the evidence says someone should look (the
                      pip: solid when the record confirms it, hollow when
                      the record only raises the question)

   Each story is read through lenses (the existing questions), and the
   active story decides which of the three marks leads; the other two
   stay visible, quieter.
   ════════════════════════════════════════════════════════════════════ */

import type { MapCell, NationalCity } from "./types";
import type { QuestionId } from "./questions";
import { haversineKm } from "@/components/livingmap/geo";
import { placeName } from "./reading";
import { kindOf } from "@/components/spatial/AtlasRegister";

export type StoryId = "documented" | "care" | "attention";
export type Story = { id: StoryId; label: string; ask: string; lenses: QuestionId[]; color: string };

export const STORIES: Story[] = [
  { id: "documented", label: "Documented", ask: "Where are animals on the record, and how good is that record?", lenses: ["animals", "gaps"], color: "#2457ce" },
  { id: "care", label: "Cared for", ask: "Where is care happening, and who is doing it?", lenses: ["care", "orgs"], color: "#1f6f80" },
  { id: "attention", label: "Needs attention", ask: "Where does the evidence say someone should look?", lenses: ["act", "needs"], color: "#c8371d" },
];

export const storyOf = (q: QuestionId): StoryId => STORIES.find((s) => s.lenses.includes(q))?.id ?? "documented";
export const story = (id: StoryId) => STORIES.find((s) => s.id === id) ?? STORIES[0];

/* ── the glyph ────────────────────────────────────────────────────── */

/** Attention, as the record supports it: 2 confirmed, 1 a question the record raises, 0 nothing flagged. */
export function attentionOf(c: MapCell): 0 | 1 | 2 {
  const waiting = c.open_30 - (c.open_30_unconfirmed ?? 0);
  const openKnown = c.open_cases - (c.open_unconfirmed ?? 0);
  if (waiting > 0 || (c.fu_missed_live ?? 0) > 0 || (c.needs_help > 0 && !c.open_cases) || (c.unassigned ?? 0) > 0 || openKnown > 0) return 2;
  if ((c.open_unconfirmed ?? 0) > 0 || c.status_unknown > 0) return 1;
  return 0;
}

/** Sterilisation as twelfths of the ring: [sterilised, recorded not sterilised]; the rest is "not known". */
export function careRing(c: MapCell): [number, number] | null {
  if (!c.animals) return null;
  const s = Math.round((c.ster_yes / c.animals) * 12), n = Math.round((c.ster_no / c.animals) * 12);
  return [Math.min(12, s), Math.min(12 - Math.min(12, s), n)];
}

export const glyphKey = (c: MapCell) => { const r = careRing(c); return `g:${r ? `${r[0]}-${r[1]}` : "x"}:${attentionOf(c)}`; };

/* ── attention clusters ───────────────────────────────────────────── */

export type Cluster = { cells: number[]; center: [number, number]; name: string; confirmed: number; unconfirmed: number; flagged: number; missed: number };

/** Where the record confirms work is waiting (open by StrayPaw's own record,
 *  missed rechecks on open requests, flagged animals with no request), with
 *  touching areas (centres within ~1 km) joined into one named place.
 *  Requests open only in an imported register are deliberately left out: they
 *  sit wherever the register worked, so a wash of them would only redraw the
 *  register's footprint. They are summarised by locality instead. */
export function attentionClusters(cells: MapCell[]): Cluster[] {
  const hot = cells.map((c, i) => ({ c, i })).filter(({ c }) => attentionOf(c) === 2);
  const parent = new Map<number, number>(hot.map(({ i }) => [i, i]));
  const find = (x: number): number => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(x, r); return r; };
  for (let a = 0; a < hot.length; a++) for (let b = a + 1; b < hot.length; b++) {
    if (haversineKm(hot[a].c.c, hot[b].c.c) < 1.0) parent.set(find(hot[a].i), find(hot[b].i));
  }
  const groups = new Map<number, number[]>();
  for (const { i } of hot) { const r = find(i); groups.set(r, [...(groups.get(r) ?? []), i]); }
  return [...groups.values()].map((g) => {
    const zones = new Map<string, number>();
    let x = 0, y = 0, confirmed = 0, unconfirmed = 0, flagged = 0, missed = 0;
    for (const i of g) {
      const c = cells[i];
      x += c.c[0]; y += c.c[1];
      const unc = c.open_unconfirmed ?? 0;
      confirmed += c.open_cases - unc; unconfirmed += unc; missed += c.fu_missed_live ?? 0;
      if (!c.open_cases) flagged += c.needs_help;
      const z = placeName(c.zone); if (z) zones.set(z, (zones.get(z) ?? 0) + c.open_cases + c.needs_help + 1);
    }
    const name = [...zones.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unnamed locality";
    return { cells: g, center: [x / g.length, y / g.length] as [number, number], name, confirmed, unconfirmed, flagged, missed };
  }).sort((a, b) => b.confirmed + b.flagged + b.missed - (a.confirmed + a.flagged + a.missed) || b.unconfirmed - a.unconfirmed);
}

/* ── one line per story, for the story tabs ───────────────────────── */

const f = (n: number) => Math.round(n).toLocaleString("en-IN");

export function storyFigures(cells: MapCell[]): Record<StoryId, { big: string; small: string }> {
  let animals = 0, exact = 0, ster = 0, sterNo = 0, sterUnk = 0, care12 = 0, confirmed = 0, unconf = 0, flagged = 0, missed = 0;
  for (const c of cells) {
    animals += c.animals; exact += c.exact_loc; ster += c.ster_yes; sterNo += c.ster_no; sterUnk += c.ster_unknown; care12 += c.care_12m;
    const u = c.open_unconfirmed ?? 0; confirmed += c.open_cases - u; unconf += u; missed += c.fu_missed_live ?? 0; if (!c.open_cases) flagged += c.needs_help;
  }
  const known = ster + sterNo;
  return {
    documented: { big: f(animals), small: `animals in ${f(cells.length)} area${cells.length === 1 ? "" : "s"} · ${animals ? Math.round((exact / animals) * 100) : 0}% placed from a map point` },
    /* Of all animals, the share recorded sterilised; the share not known is named, never counted as "not". */
    care: { big: animals ? `${Math.round((ster / animals) * 100)}%` : "—", small: animals ? `recorded sterilised · ${Math.round((sterUnk / animals) * 100)}% not known${sterNo ? ` · ${f(sterNo)} recorded not` : ""}${care12 ? ` · ${f(care12)} care record${care12 === 1 ? "" : "s"} this year` : ""}` : "no animals on the record" },
    attention: { big: f(confirmed + flagged + missed), small: `confirmed open, flagged or missed${unconf ? ` · ${f(unconf)} more unconfirmed` : ""}` },
  };
}

export function nationalStoryFigures(cities: NationalCity[]): Record<StoryId, { big: string; small: string }> {
  /* A clinical register is not a count of street animals and is never added to one. */
  const street = cities.filter((c) => kindOf(c.city, c.cells) !== "clinical");
  let animals = 0, ster = 0, sterNo = 0, confirmed = 0, unconf = 0;
  for (const c of cities) {
    const u = c.open_unconfirmed ?? 0; confirmed += c.open_cases - u; unconf += u;
  }
  for (const c of street) { animals += c.animals; ster += c.sterilised; sterNo += c.ster_no; }
  const known = ster + sterNo;
  return {
    documented: { big: f(animals), small: `street-animal profiles in ${f(street.length)} cities` },
    care: { big: animals ? `${Math.round((ster / animals) * 100)}%` : "—", small: `of street-animal profiles recorded sterilised${known < animals ? ` · ${Math.round(((animals - known) / animals) * 100)}% not known` : ""}` },
    attention: { big: f(confirmed), small: `requests confirmed open${unconf ? ` · ${f(unconf)} more unconfirmed` : ""}` },
  };
}

/** A concentration's one-line reason, in the record's own terms. */
export function clusterLine(k: Cluster): string {
  return [
    k.confirmed ? `${f(k.confirmed)} open` : null,
    k.missed ? `${f(k.missed)} follow-up${k.missed > 1 ? "s" : ""} missed` : null,
    k.flagged ? `${f(k.flagged)} flagged` : null,
    k.unconfirmed ? `${f(k.unconfirmed)} unconfirmed` : null,
  ].filter(Boolean).join(" · ") + (k.cells.length > 1 ? ` · ${k.cells.length} areas` : "");
}

/** Requests open only in an imported register, by locality: where a status review would settle the most. */
export function unconfirmedByLocality(cells: MapCell[]): { name: string; n: number; areas: number; first: number }[] {
  const by = new Map<string, { name: string; n: number; areas: number; first: number }>();
  cells.forEach((c, i) => {
    const u = c.open_unconfirmed ?? 0; if (!u) return;
    const name = placeName(c.zone) || "Unnamed locality";
    const x = by.get(name) ?? { name, n: 0, areas: 0, first: i };
    x.n += u; x.areas += 1; if (u > (cells[x.first].open_unconfirmed ?? 0)) x.first = i;
    by.set(name, x);
  });
  return [...by.values()].sort((a, b) => b.n - a.n);
}

/** All three stories for one area, in three short lines (the hover card and the area's opening). */
export function glance(c: MapCell): { id: StoryId; label: string; text: string; tone: 0 | 1 | 2 }[] {
  const unc = c.open_unconfirmed ?? 0, open = c.open_cases - unc, live = c.fu_missed_live ?? 0;
  const att = [open ? `${f(open)} open` : null, live ? `${f(live)} follow-up${live > 1 ? "s" : ""} missed` : null, c.needs_help && !c.open_cases ? `${f(c.needs_help)} flagged` : null, unc ? `${f(unc)} unconfirmed` : null].filter(Boolean).join(" · ");
  return [
    { id: "documented", label: "Documented", tone: 0, text: `${f(c.animals)} animal${c.animals === 1 ? "" : "s"}${c.animals ? `, ${Math.round((c.exact_loc / c.animals) * 100)}% placed from a map point` : ""}${c.cases ? ` · ${f(c.cases)} request${c.cases === 1 ? "" : "s"}` : ""}` },
    { id: "care", label: "Cared for", tone: 0, text: `${c.animals ? `${Math.round((c.ster_yes / c.animals) * 100)}% recorded sterilised, ${Math.round((c.ster_unknown / c.animals) * 100)}% not known` : "no animals on the record"}${c.care_12m ? ` · ${f(c.care_12m)} care record${c.care_12m === 1 ? "" : "s"} this year` : ""}` },
    { id: "attention", label: "Attention", tone: attentionOf(c), text: att || "nothing flagged on the record" },
  ];
}
