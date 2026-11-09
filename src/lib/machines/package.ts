/* The report package lifecycle, written down once.

   A package moves between the operator (the NGO that runs the programme) and
   the reviewing office (the municipality). The database function
   abc_package_act is the authority and refuses any move it does not allow;
   this table mirrors it so every screen, Kaju and the recording demo agree on
   what a status means, who holds the package, and which actions are offered.

     draft ──submitted──▶ submitted ──accepted──▶ accepted
                            │  ▲
                      query │  │ answer
                            ▼  │
                          queried
     submitted ──returned──▶ returned ──submitted──▶ submitted
     submitted ─(per-record review, closed by the office)─▶ partially_accepted

   partially_accepted is reached only through per-record review
   (operations_finalize_package), never through a single action here. */

export const PACKAGE_STATUSES = ["draft", "submitted", "queried", "returned", "accepted", "partially_accepted"] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

/** Who must act next. */
export type Holder = "operator" | "office" | "nobody";

export const PACKAGE_STATE: Record<PackageStatus, { label: string; holder: Holder; final: boolean }> = {
  draft: { label: "Draft", holder: "operator", final: false },
  submitted: { label: "Waiting for the office", holder: "office", final: false },
  queried: { label: "Query to the operator", holder: "operator", final: false },
  returned: { label: "Returned to the operator", holder: "operator", final: false },
  accepted: { label: "Accepted", holder: "nobody", final: true },
  partially_accepted: { label: "Partly accepted", holder: "nobody", final: true },
};

export type PackageAction = "submitted" | "answer" | "query" | "accepted" | "returned";
export type Side = "operator" | "reviewer";

export const PACKAGE_ACTIONS: Record<PackageAction, { side: Side; from: readonly PackageStatus[]; to: PackageStatus; label: string; needsNote: boolean }> = {
  submitted: { side: "operator", from: ["draft", "returned"], to: "submitted", label: "Submit package", needsNote: false },
  answer: { side: "operator", from: ["queried"], to: "submitted", label: "Send answer", needsNote: true },
  accepted: { side: "reviewer", from: ["submitted"], to: "accepted", label: "Accept", needsNote: false },
  query: { side: "reviewer", from: ["submitted"], to: "queried", label: "Ask a question", needsNote: true },
  returned: { side: "reviewer", from: ["submitted"], to: "returned", label: "Return", needsNote: true },
};

/** Actions this side may take on a package in this status, in display order. */
export function actionsFor(side: Side, status: PackageStatus): PackageAction[] {
  return (Object.keys(PACKAGE_ACTIONS) as PackageAction[]).filter((a) => PACKAGE_ACTIONS[a].side === side && PACKAGE_ACTIONS[a].from.includes(status));
}

/** The status an action leads to, or null when the action is not allowed from here. */
export function nextStatus(status: PackageStatus, action: PackageAction): PackageStatus | null {
  const a = PACKAGE_ACTIONS[action];
  return a.from.includes(status) ? a.to : null;
}

/** Narrows a status read from the server; anything unknown is reported as such, never guessed. */
export const isPackageStatus = (s: string): s is PackageStatus => (PACKAGE_STATUSES as readonly string[]).includes(s);

/* The groupings every screen and Kaju count by. They take raw strings so a
   status the client does not know yet falls in no group instead of a wrong one. */
export const isWaitingOnOffice = (s: string) => s === "submitted";
export const isWithOperator = (s: string) => isPackageStatus(s) && PACKAGE_STATE[s].holder === "operator" && s !== "draft";
export const isDecided = (s: string) => isPackageStatus(s) && PACKAGE_STATE[s].final;
