/* ════════════════════════════════════════════════════════════════════
   Work next: what needs attention here, who is responsible, and what
   can be done about it.

   Not a score from a model — a short list of plain rules, each one a
   reason a person could check against the record:

     waiting   requests open more than 30 days
     missed    follow-ups recorded as missed
     flagged   animals flagged as needing help with no request open
     outcome   requests with no status recorded at all
     survey    a well-recorded area where sterilisation status is
               unknown for most animals
     revisit   an area with animals on the record and nothing new for
               over a year
     place     requests whose place has no city, so no area

   An item says why it is on the list (with its numbers), who holds the
   record (the organisation with the open requests, or the one keeping
   the animals), and what each kind of reader can do next. The order is
   the rule's urgency first, then its size: an animal waiting for help
   comes before a gap in the paperwork, always.
   ════════════════════════════════════════════════════════════════════ */

import type { MapCell, NationalCity, Unplaced } from "./types";
import { placeName } from "./reading";

export type WorkKind = "waiting" | "unassigned" | "missed" | "flagged" | "outcome" | "survey" | "revisit" | "place";
export type Audience = "all" | "member";
export type WorkAction = { label: string; href?: string; copy?: boolean; audience: Audience };
export type WorkItem = {
  key: string; kind: WorkKind; cell: number | null; city: string | null; place: string;
  score: number; reason: string; who: string[]; whoNote: string; actions: WorkAction[];
};

export const WORK_META: Record<WorkKind, { label: string; short: string; color: string; why: string }> = {
  waiting: { label: "Requests waiting over 30 days", short: "Waiting", color: "#a8230f", why: "An animal reported for help, with the request still open after a month." },
  unassigned: { label: "Open requests nobody holds", short: "Nobody holds", color: "#7a1f10", why: "Open requests with no one assigned: until someone takes them, nobody is responsible." },
  missed: { label: "Follow-ups missed", short: "Follow-up missed", color: "#e0472b", why: "Treatment that needed a return visit, recorded as missed." },
  flagged: { label: "Flagged, no request open", short: "Flagged", color: "#f29a83", why: "Animals marked as needing help with no request open for them." },
  outcome: { label: "Outcome not recorded", short: "No outcome", color: "#c98a12", why: "Requests with no status: whether they were closed is not known." },
  survey: { label: "Sterilisation status unknown", short: "Survey", color: "#3c98a8", why: "Most animals here have no recorded sterilisation status; an ear-notch check would settle it." },
  revisit: { label: "Nothing new in over a year", short: "Revisit", color: "#8a6a3b", why: "Animals are on the record here but nobody has recorded anything for over a year." },
  place: { label: "Requests waiting to be placed", short: "Place", color: "#5d6b80", why: "Requests whose recorded place has no city, so they are on no map." },
};
const URGENCY: Record<WorkKind, number> = { waiting: 600, unassigned: 560, missed: 500, flagged: 450, place: 400, outcome: 300, survey: 200, revisit: 100 };

const days = (iso: string | null, now: number) => (iso ? Math.round((now - Date.parse(iso)) / 86_400_000) : 0);
const n = (x: number, one: string, many = `${one}s`) => `${x.toLocaleString("en-IN")} ${x === 1 ? one : many}`;

/** Who holds the open work here (or, failing that, who keeps the animals). */
function holders(c: MapCell, open: boolean): { who: string[]; note: string } {
  /* On an organisation's own map, the people who hold the open requests. */
  if (open && c.people) {
    const named = c.people.filter((p) => p.name !== "Unassigned");
    const nobody = c.people.find((p) => p.name === "Unassigned")?.o ?? 0;
    return { who: named.slice(0, 3).map((p) => `${p.name} (${p.o})`), note: nobody ? `${nobody} with nobody assigned` : "" };
  }
  const pick = c.orgs.filter((o) => (open ? (o.o ?? 0) > 0 : o.a > 0 || o.c > 0));
  const named = pick.filter((o) => o.name).map((o) => o.name!);
  const unnamed = pick.length - named.length;
  if (!pick.length) return { who: [], note: open ? "No organisation is named on these requests." : "No organisation keeps records here yet." };
  return { who: named.slice(0, 3), note: unnamed ? `${n(unnamed, "organisation")} that has not published its name` : "" };
}

/** Every rule that applies to one area, most urgent first. */
export function areaWork(c: MapCell, i: number, city: string, now = Date.now()): WorkItem[] {
  const place = placeName(c.zone);
  const enc = encodeURIComponent(place);
  const items: WorkItem[] = [];
  const add = (kind: WorkKind, size: number, reason: string, open: boolean, actions: WorkAction[]) => {
    const h = holders(c, open);
    items.push({ key: `${kind}:${c.h3}`, kind, cell: i, city, place, score: URGENCY[kind] + Math.min(99, size), reason, who: h.who, whoNote: h.note, actions });
  };
  const report: WorkAction = { label: "Report what you see here", href: "/report", audience: "all" };
  if (c.open_30) {
    const age = days(c.open_oldest, now);
    add("waiting", c.open_30 * 4 + Math.min(40, age / 30), `${n(c.open_30, "request")} open for more than 30 days${age ? `; the oldest for ${age > 540 ? `${(age / 365).toFixed(1)} years` : `${Math.round(age / 30)} months`}` : ""}.`, true, [
      { label: "Open these requests", href: `/partner/cases?place=${enc}&sort=oldest`, audience: "member" },
      report,
    ]);
  }
  if (c.unassigned) add("unassigned", c.unassigned * 4, `${n(c.unassigned, "open request")} with nobody assigned.`, true, [
    { label: "Assign them", href: `/partner/cases?place=${enc}&lens=nobody`, audience: "member" },
  ]);
  if (c.fu_missed) add("missed", c.fu_missed * 3, `${n(c.fu_missed, "follow-up")} recorded as missed${c.fu_upcoming ? `, ${c.fu_upcoming} more due` : ""}.`, true, [
    { label: "Plan the follow-ups", href: "/partner/followups", audience: "member" },
    report,
  ]);
  if (c.needs_help && !c.open_cases) add("flagged", c.needs_help * 8, `${n(c.needs_help, "animal")} flagged as needing help, and no request is open here.`, false, [
    { label: "Open a request", href: "/partner/cases/new", audience: "member" },
    { label: "Report the animal's condition", href: "/report", audience: "all" },
  ]);
  if (c.status_unknown) add("outcome", c.status_unknown, `${n(c.status_unknown, "request")} with no status recorded: open or closed is not known.`, false, [
    { label: "Record their outcomes", href: `/partner/cases?place=${enc}`, audience: "member" },
  ]);
  if (c.animals >= 10 && c.ster_unknown >= c.animals / 2) add("survey", Math.round(c.ster_unknown / 5), `Sterilisation status is unknown for ${c.ster_unknown.toLocaleString("en-IN")} of ${n(c.animals, "animal")} (${Math.round((c.ster_unknown / c.animals) * 100)}%).`, false, [
    { label: "Plan a status survey", href: "/partner/surveys", audience: "member" },
    { label: "Share this area", copy: true, audience: "all" },
  ]);
  const last = [c.last_seen, c.last_case, c.care_last].filter(Boolean).sort().at(-1) ?? null;
  const quiet = days(last, now);
  if (c.animals >= 5 && quiet > 365) add("revisit", Math.round(c.animals / 4), `${n(c.animals, "animal")} on the record and nothing new for ${(quiet / 365).toFixed(1).replace(/\.0$/, "")} years.`, false, [
    { label: "Plan a field visit", href: "/partner/field", audience: "member" },
    { label: "Report a sighting here", href: "/report", audience: "all" },
  ]);
  return items.sort((a, b) => b.score - a.score);
}

/** A city's worklist: every area's rules, most urgent first, plus its unplaced requests. */
export function cityWork(cells: MapCell[], city: string, now = Date.now()): WorkItem[] {
  return cells.flatMap((c, i) => areaWork(c, i, city, now)).sort((a, b) => b.score - a.score);
}

/** The national worklist: per city, from the same definitions, plus unplaced requests. */
export function nationalWork(cities: NationalCity[], unplaced: Unplaced[]): WorkItem[] {
  const items: WorkItem[] = [];
  for (const c of cities) {
    if (c.open_30) items.push({ key: `waiting:${c.city}`, kind: "waiting", cell: null, city: c.city, place: c.city, score: URGENCY.waiting + Math.min(99, c.open_30), reason: `${n(c.open_30, "request")} open for more than 30 days.`, who: [], whoNote: "", actions: [] });
    if (c.needs_help) items.push({ key: `flagged:${c.city}`, kind: "flagged", cell: null, city: c.city, place: c.city, score: URGENCY.flagged + Math.min(99, c.needs_help), reason: `${n(c.needs_help, "animal")} flagged as needing help.`, who: [], whoNote: "", actions: [] });
    if (c.status_unknown) items.push({ key: `outcome:${c.city}`, kind: "outcome", cell: null, city: c.city, place: c.city, score: URGENCY.outcome + Math.min(99, c.status_unknown), reason: `${n(c.status_unknown, "request")} with no status recorded.`, who: [], whoNote: "", actions: [] });
  }
  for (const u of unplaced.filter((x) => x.open_cases > 0)) {
    items.push({
      key: `place:${u.zone}`, kind: "place", cell: null, city: null, place: u.zone, score: URGENCY.place + u.open_cases,
      reason: `${n(u.open_cases, "open request")} recorded at “${u.zone}” with no city, so on no map.`, who: [], whoNote: "",
      actions: [{ label: "Place these requests", href: `/partner/cases?q=${encodeURIComponent(u.zone)}`, audience: "member" }],
    });
  }
  return items.sort((a, b) => b.score - a.score);
}

/** The worklist as CSV, for a coordinator's spreadsheet or a ward meeting. */
export function workCsv(items: WorkItem[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [["Priority", "City", "Place", "What needs attention", "Why", "Who holds the record"].map(esc).join(",")];
  items.forEach((w, k) => rows.push([String(k + 1), w.city ?? "", w.place, WORK_META[w.kind].label, w.reason, [...w.who, w.whoNote].filter(Boolean).join("; ") || "Not named"].map(esc).join(",")));
  return rows.join("\n");
}
