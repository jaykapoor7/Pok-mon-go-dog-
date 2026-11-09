/* Where one ABC case stands on its way to a claim, and who moves it next.

   The stage is derived from the database's own flags by stageOf() in
   lib/abc.ts; it is never stored or guessed. This table says, for each stage,
   which role acts next and what they do, so screens, Kaju and agents can say
   "waiting for the vet" without re-deriving it.

     evidence ─▶ vet ─▶ review ─▶ ready ─▶ packaged ─▶ accepted
                          │  ▲
                 returned ▼  │ evidence added
                        returned                                        */
import type { Stage } from "@/lib/abc";

/** Pipeline order, used for filters and counts. */
export const STAGE_ORDER: readonly Stage[] = ["evidence", "vet", "review", "returned", "ready", "packaged", "accepted"];

export const STAGE_NEXT: Record<Stage, { who: "field" | "vet" | "coordinator" | "office" | "nobody"; does: string }> = {
  evidence: { who: "field", does: "Add the missing evidence items" },
  vet: { who: "vet", does: "Authorise the procedure" },
  review: { who: "coordinator", does: "Check the evidence and approve for reporting" },
  returned: { who: "field", does: "Fix what the reviewer returned" },
  ready: { who: "coordinator", does: "Put it in the month's package" },
  packaged: { who: "office", does: "Decide on the package" },
  accepted: { who: "nobody", does: "Done: accepted by the office" },
};
