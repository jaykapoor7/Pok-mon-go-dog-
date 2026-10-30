/* ════════════════════════════════════════════════════════════════════
   What a dot says first: does this animal need someone?

   One reading shared by the map's dots, its cards and its key, so a red
   dot, a red card and a red key entry always mean the same record:

     help   flagged as needing help on the record
     open   a request for help open or in progress on the record
     rec    on the record, with neither (not the same as fine)
   ════════════════════════════════════════════════════════════════════ */

import type { AreaAnimal } from "@/lib/livingmap/types";

export type Need = "help" | "open" | "rec";

export const NEED_INK: Record<Need, string> = { help: "#e5412b", open: "#e8a01f", rec: "#7f93b8" };
export const NEED_LABEL: Record<Need, string> = { help: "Needs help", open: "Open request", rec: "On the record" };

export const needOf = (a: Pick<AreaAnimal, "needs_help" | "facts">): Need =>
  a.needs_help ? "help" : (a.facts?.open ?? 0) > 0 ? "open" : "rec";

/** Most urgent first: the order dots are stacked and lists are read. */
export const NEED_RANK: Record<Need, number> = { help: 0, open: 1, rec: 2 };

/** From this zoom every area in view is read, so each dot is a real animal. */
export const LOAD_ZOOM = 12.6;
