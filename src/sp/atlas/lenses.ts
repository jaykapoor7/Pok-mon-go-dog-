/* ════════════════════════════════════════════════════════════════════
   The four public lenses (decision 018) and the municipal layers (034).

   A lens is a reading of the same complete, bounded area aggregates: it
   changes the representation and its explanation, never the evidence.
   The four lenses are mutually exclusive measures:

     Animals        recorded animal profiles (a record, not a census)
     Needs help     where the record says someone should look
     Open requests  the current request cohort; imported-and-unconfirmed
                    is shown apart
     Care           sterilisation, vaccination and treatment as recorded;
                    a record of care given, never population coverage

   Municipal layers reuse the same classifications under programme names
   (ABC = sterilisation, ARV = vaccination), plus record quality.
   ════════════════════════════════════════════════════════════════════ */

import type { QuestionId } from "@/lib/livingmap/questions";
import type { MapCell, NationalCity } from "@/lib/livingmap/types";
import { kindOf } from "./evidence";

export type LensId = "animals" | "help" | "requests" | "care" | "abc" | "arv" | "treat" | "quality" | "orgs" | "followups";
export type Lens = { id: LensId; label: string; q: QuestionId; facet?: string; ink: string; unit: string; define: string; timed?: boolean };

export const LENSES: Record<LensId, Lens> = {
  animals: { id: "animals", label: "Animals", q: "animals", facet: "all", ink: "#2457ce", unit: "animal profiles",
    define: "Animal profiles on the record. A profile is a record, not a census: one animal can have several, and most animals are never recorded." },
  help: { id: "help", label: "Needs help", q: "act", ink: "#c8371d", unit: "places to look",
    define: "Where the record says someone should look: an animal flagged as needing help, a request confirmed open, a missed recheck. Nothing reported is not the same as fine." },
  requests: { id: "requests", label: "Open requests", q: "needs", facet: "open", ink: "#b0702a", unit: "open requests", timed: true,
    define: "Requests for help that are open by StrayPaw's own record. Open only in an imported register, never confirmed since, is shown apart as unconfirmed." },
  care: { id: "care", label: "Care", q: "care", facet: "ster", ink: "#1f6f80", unit: "care records", timed: true,
    define: "Sterilisation, vaccination and treatment as recorded on animal records and dated care events. A record of care given, never coverage of a population; unknown is never counted as no." },
  abc: { id: "abc", label: "ABC · sterilisation", q: "care", facet: "ster", ink: "#1f6f80", unit: "sterilisation records", timed: true,
    define: "Animal Birth Control as recorded: sterilisations on animal records and dated care events. Not a share of the city's animals." },
  arv: { id: "arv", label: "ARV · vaccination", q: "care", facet: "vacc", ink: "#2c9aa6", unit: "vaccination records", timed: true,
    define: "Anti-rabies vaccination as recorded. Campaign GPS is shown by area; a vaccination status is not a dated vaccination event." },
  treat: { id: "treat", label: "Treatment", q: "care", facet: "treat", ink: "#4b7f4f", unit: "treatment records", timed: true,
    define: "Treatments recorded as care events, by area and month." },
  followups: { id: "followups", label: "Follow-ups", q: "needs", facet: "followups", ink: "#9a6a0c", unit: "follow-ups",
    define: "Rechecks on requests: missed while the request is open is current work; missed before it closed is history." },
  quality: { id: "quality", label: "Record quality", q: "gaps", ink: "#5f6b7e", unit: "areas",
    define: "How well each area is placed and dated: exact map points versus approximate localities, and areas bordering the record with nothing in it." },
  orgs: { id: "orgs", label: "Who holds it", q: "orgs", ink: "#9b3149", unit: "organisations",
    define: "Which organisation keeps the records in each area. Several organisations in one area are ringed in ink." },
};

export const PUBLIC_LENSES: LensId[] = ["animals", "help", "requests", "care"];
export const MORE_LENSES: LensId[] = ["quality", "orgs"];
export const CITY_LAYERS: LensId[] = ["abc", "arv", "requests", "followups", "quality", "animals"];
export const NGO_LENSES: LensId[] = ["help", "requests", "followups", "animals", "care"];

const f = (n: number) => n.toLocaleString("en-IN");

/** The lens's own measure for a city at national scale. */
export function nationalMeasure(id: LensId, c: NationalCity): number {
  const street = kindOf(c.city, c.cells) !== "clinical";
  switch (id) {
    case "help": return c.open_cases - (c.open_unconfirmed ?? 0) + c.needs_help + (c.fu_missed_live ?? 0);
    case "requests": case "followups": return c.open_cases - (c.open_unconfirmed ?? 0);
    case "care": case "abc": return street ? c.sterilised : 0;
    case "arv": return street ? c.vaccinated : 0;
    case "treat": return c.treatments;
    default: return street ? c.animals : 0;
  }
}

/** The lens's figure for the national index or a city's complete aggregates. */
export function lensFigure(id: LensId, cells: MapCell[] | null, cities: NationalCity[] | null): { big: string; small: string } {
  if (cities) {
    /* The same count the landing and product pages print: every animal record
       in every city. A clinical register is drawn hollow and kept out of the
       map's sizing, but it is still on the record, so it is counted and named. */
    let animals = 0, clinical = 0, help = 0, open = 0, unconf = 0, ster = 0, vacc = 0, cster = 0, treat = 0;
    for (const c of cities) {
      const u = c.open_unconfirmed ?? 0, isClinical = kindOf(c.city, c.cells) === "clinical";
      animals += c.animals; ster += c.sterilised; vacc += c.vaccinated;
      if (isClinical) { clinical += c.animals; cster += c.sterilised; }
      open += c.open_cases - u; unconf += u; help += c.needs_help + (c.fu_missed_live ?? 0); treat += c.treatments;
    }
    const held = cities.filter((c) => c.animals > 0).length;
    if (id === "animals") return { big: f(animals), small: `animal records in ${held} cities${clinical ? ` · ${f(clinical)} in a clinical register` : ""}` };
    if (id === "help") return { big: f(open + help), small: "open, flagged or missed" };
    if (id === "requests" || id === "followups") return { big: f(open), small: unconf ? `confirmed open · ${f(unconf)} unconfirmed` : "confirmed open" };
    if (id === "arv") return { big: f(vacc), small: "recorded vaccinated" };
    if (id === "treat") return { big: f(treat), small: "treatment records" };
    return { big: f(ster), small: `recorded sterilised · ${f(vacc)} vaccinated${cster ? ` · ${f(cster)} in a clinical register` : ""}` };
  }
  let animals = 0, open = 0, unconf = 0, flagged = 0, missed = 0, ster = 0, vacc = 0, care12 = 0, exact = 0, due = 0, treat = 0;
  const orgs = new Set<string>();
  for (const c of cells ?? []) {
    animals += c.animals; const u = c.open_unconfirmed ?? 0; open += c.open_cases - u; unconf += u;
    missed += c.fu_missed_live ?? 0; if (!c.open_cases) flagged += c.needs_help; ster += c.ster_yes; vacc += c.vacc_yes; care12 += c.care_12m;
    exact += c.exact_loc; due += c.fu_upcoming;
    treat += Object.entries(c.care_kinds).reduce((s2, [k, v]) => (k === "sterilisation" || k === "vaccination" ? s2 : s2 + v), 0);
    for (const o of c.orgs) if (o.name) orgs.add(o.name);
  }
  if (id === "quality") return { big: animals ? `${Math.round((exact / animals) * 100)}%` : "—", small: "placed from a map point" };
  if (id === "followups") return { big: f(missed + due), small: `${f(missed)} missed on open requests · ${f(due)} due` };
  if (id === "treat") return { big: f(treat), small: "treatment records" };
  if (id === "orgs") return { big: f(orgs.size), small: "organisations keep records" };
  if (id === "animals") return { big: f(animals), small: `profiles in ${f(cells?.length ?? 0)} areas` };
  if (id === "help") return { big: f(open + flagged + missed), small: "open, flagged or missed" };
  if (id === "requests") return { big: f(open), small: unconf ? `confirmed · ${f(unconf)} unconfirmed` : "confirmed open" };
  if (id === "arv") return { big: f(vacc), small: "recorded vaccinated" };
  return { big: f(ster), small: care12 ? `sterilised · ${f(care12)} care records in 12 months` : "recorded sterilised" };
}
