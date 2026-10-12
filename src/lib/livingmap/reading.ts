/* What the map says, in words: class tallies, a headline per question and
 * the localities ranked by it, all from the same classification the map
 * is coloured by. */

import { lastActivity, treatments, type Ctx, type Facet, type Question } from "./questions";
import type { MapCell } from "./types";

export const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

export type Tally = Map<string, { areas: number; v: number }>;

export function tally(cells: MapCell[], q: Question, f: Facet, ctx: Ctx): { tally: Tally; classOf: string[] } {
  const t: Tally = new Map();
  const classOf: string[] = [];
  cells.forEach((c, i) => {
    const { k, v } = q.classify(c, f, ctx, i);
    classOf.push(k);
    const row = t.get(k) ?? { areas: 0, v: 0 };
    row.areas++; row.v += v;
    t.set(k, row);
  });
  return { tally: t, classOf };
}

export type Totals = ReturnType<typeof totals>;
export function totals(cells: MapCell[]) {
  const s = { areas: cells.length, animals: 0, photos: 0, residents: 0, needs: 0, cases: 0, open: 0, open30: 0, oldest: null as string | null, closed: 0, handed: 0, noAction: 0, statusUnknown: 0, fuDone: 0, fuMissed: 0, fuDue: 0, sterYes: 0, sterNo: 0, sterUnknown: 0, vaccYes: 0, vaccUnknown: 0, care: 0, treat: 0, exact: 0, last: null as string | null };
  for (const c of cells) {
    s.animals += c.animals; s.photos += c.photos; s.residents += c.residents; s.needs += c.needs_help;
    s.cases += c.cases; s.open += c.open_cases; s.open30 += c.open_30; s.closed += c.closed_field; s.handed += c.handed_on; s.noAction += c.no_action; s.statusUnknown += c.status_unknown ?? 0;
    s.fuDone += c.fu_done; s.fuMissed += c.fu_missed; s.fuDue += c.fu_upcoming;
    s.sterYes += c.ster_yes; s.sterNo += c.ster_no; s.sterUnknown += c.ster_unknown; s.vaccYes += c.vacc_yes; s.vaccUnknown += c.vacc_unknown;
    s.care += c.care; s.treat += treatments(c); s.exact += c.exact_loc;
    if (c.open_oldest && (!s.oldest || c.open_oldest < s.oldest)) s.oldest = c.open_oldest;
    const l = lastActivity(c); if (l && (!s.last || l > s.last)) s.last = l;
  }
  return s;
}

const ago = (iso: string | null, today: number) => {
  if (!iso) return null;
  const d = Math.round((today - Date.parse(iso)) / 86_400_000);
  return d < 1 ? "today" : d < 45 ? `${d} days` : d < 540 ? `${Math.round(d / 30)} months` : `${(d / 365).toFixed(1).replace(/\.0$/, "")} years`;
};

/** One sentence that answers the question for these areas, and one that qualifies it. */
export function headline(q: Question, f: Facet, ctx: Ctx, cells: MapCell[], t: Tally): { lead: string; qualify: string } {
  const s = totals(cells);
  const areas = (k: string) => t.get(k)?.areas ?? 0;
  const rng = ctx.range ? " in this period" : "";
  switch (q.id) {
    case "act": {
      const urgent = areas("waiting") + areas("missed") + areas("flagged");
      const records = areas("outcome") + areas("survey") + areas("revisit");
      return {
        lead: urgent ? `${plural(urgent, "place")} where animals are waiting on someone: open requests past 30 days, missed follow-ups or flagged animals with no request.` : "No place here has an animal recorded as waiting on someone.",
        qualify: `${plural(records, "more place")} where the record itself needs work: an outcome, a status survey or a revisit. Each item below says why, and who holds the record.`,
      };
    }
    case "animals": {
      const v = f === "photos" ? s.photos : f === "residents" ? s.residents : s.animals;
      const where = cells.length - areas("none");
      return {
        lead: `${plural(v, f === "photos" ? "animal with a photo" : f === "residents" ? "animal reported by residents" : "animal", f === "photos" ? "animals with photos" : f === "residents" ? "animals reported by residents" : "animals")} on the record, across ${plural(where, "area")}.`,
        qualify: "Recorded profiles, not a count of every animal living here.",
      };
    }
    case "needs": {
      if (f === "followups") return {
        lead: s.fuMissed ? `${plural(s.fuMissed, "follow-up")} missed and ${fmt(s.fuDue)} due, in ${plural(areas("missed") + areas("due"), "area")}.` : s.fuDue ? `${plural(s.fuDue, "follow-up")} due; none recorded as missed.` : "No follow-up is due or missed on the record here.",
        qualify: `${fmt(s.fuDone)} follow-ups recorded as done. Areas without requests are shown hatched, not clear.`,
      };
      if (ctx.range) {
        const n = ctx.inRange?.reduce((a, r) => a + r[0], 0) ?? 0;
        return { lead: `${plural(n, "request")} for help opened${rng}, in ${plural(areas("opened"), "area")}.`, qualify: "Opened in the period, whatever became of them since." };
      }
      return {
        lead: s.open ? `${plural(s.open, "request")} open in ${plural(areas("waiting") + areas("open"), "area")}${s.open30 ? `; ${fmt(s.open30)} waiting over 30 days` : ""}.`
          : s.statusUnknown ? `No request is recorded as open, but ${plural(s.statusUnknown, "request")} ${s.statusUnknown === 1 ? "has" : "have"} no status at all: whether ${s.statusUnknown === 1 ? "it is" : "they are"} still open is not known.`
          : s.needs ? `No open requests; ${plural(s.needs, "animal")} flagged as needing help.` : "No open request on the record here.",
        qualify: s.oldest ? `The longest open was reported ${ago(s.oldest, ctx.today)} ago. Hatched areas have no requests on record, which is not the same as no need.` : "Hatched areas have no requests on record, which is not the same as no need.",
      };
    }
    case "care": {
      if (ctx.range) {
        const col = f === "ster" ? 3 : f === "vacc" ? 4 : 5;
        const n = ctx.inRange?.reduce((a, r) => a + r[col], 0) ?? 0;
        return { lead: `${plural(n, f === "ster" ? "dated sterilisation" : f === "vacc" ? "dated vaccination" : "dated treatment")}${rng}, in ${plural(areas("c1") + areas("c2") + areas("c3"), "area")}.`, qualify: "Only care with a recorded date can be placed in time. Care noted on an animal without a date is shown hatched." };
      }
      if (f === "ster") {
        const known = s.sterYes + s.sterNo;
        return {
          lead: `${plural(s.sterYes, "animal")} recorded sterilised${s.sterNo ? `, ${fmt(s.sterNo)} recorded not sterilised` : ""}.`,
          qualify: `Status is unknown for ${fmt(s.sterUnknown)} of ${fmt(s.animals)} animals${known ? ` (${Math.round((s.sterUnknown / Math.max(1, s.animals)) * 100)}%)` : ""}; those areas are hatched rather than counted as unsterilised.`,
        };
      }
      if (f === "vacc") return {
        lead: `${plural(s.vaccYes, "animal")} recorded vaccinated, in ${plural(areas("c1") + areas("c2") + areas("c3"), "area")}.`,
        qualify: "The record notes vaccination only when it happened. Hatched means not recorded, never unvaccinated.",
      };
      return { lead: `${plural(s.treat, "treatment")} recorded, in ${plural(areas("c1") + areas("c2") + areas("c3"), "area")}.`, qualify: "Treatments, surgeries, diagnostics and medicines on animal records." };
    }
    case "gaps": {
      const stale = areas("stale"), status = areas("status"), approx = areas("approx");
      return {
        lead: `${plural(stale, "area")} with nothing new in over a year; ${plural(status, "area")} where most sterilisation status is unknown.`,
        qualify: `${plural(approx, "area")} are placed by locality name only. The latest record here is from ${ago(s.last, ctx.today) ?? "an unknown date"} ago.`,
      };
    }
    case "orgs": {
      const names = new Set<string>(); let unnamed = 0, multi = 0;
      for (const c of cells) { for (const o of c.orgs) if (o.name) names.add(o.name); else unnamed++; if (c.orgs.length > 1) multi++; }
      return {
        lead: `${plural(names.size, "organisation")} ${names.size === 1 ? "keeps" : "keep"} records here${multi ? `; ${plural(multi, "area")} have more than one` : ""}.`,
        qualify: unnamed ? "Some records come from organisations that have not published their name." : "Where organisations overlap, an animal's history can continue across them.",
      };
    }
  }
}

export type Locality = { name: string; cells: number[]; v: number; animals: number; center: [number, number] };

/** Localities (the first part of each area's recorded place), ranked by the question. */
export function localities(cells: MapCell[], centers: [number, number][], q: Question, f: Facet, ctx: Ctx): Locality[] {
  const by = new Map<string, Locality>();
  cells.forEach((c, i) => {
    const name = placeName(c.zone);
    const l = by.get(name) ?? { name, cells: [], v: 0, animals: 0, center: [0, 0] };
    l.cells.push(i); l.v += q.measure(c, f, ctx, i); l.animals += c.animals;
    l.center = [l.center[0] + centers[i][0], l.center[1] + centers[i][1]];
    by.set(name, l);
  });
  return [...by.values()].map((l) => ({ ...l, center: [l.center[0] / l.cells.length, l.center[1] / l.cells.length] as [number, number] }))
    .sort((a, b) => b.v - a.v || b.animals - a.animals);
}

/** The first part of a recorded place, with a source's doubled words tidied ("Ward Ward 14" → "Ward 14"). */
export function placeName(zone: string | null | undefined): string {
  const first = (zone ?? "").split(",")[0].trim().replace(/\b(\w+)\s+\1\b/gi, "$1");
  return first || "Unnamed area";
}
