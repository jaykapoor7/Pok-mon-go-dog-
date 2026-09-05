/* ════════════════════════════════════════════════════════════════════
   Who is using StrayPaw.

   Three audiences share one console but arrive wanting different things,
   so the role decides what gets surfaced first, not what is permitted.
   Permission is a separate question, answered by NGO membership, and it
   only ever gates *writing*: every read surface stays open.
   ════════════════════════════════════════════════════════════════════ */

export type Role = "individual" | "ngo" | "funder";

export const ROLES: Role[] = ["individual", "ngo", "funder"];

export const ROLE_META: Record<
  Role,
  {
    /** How this role is offered in the picker: what you came here to do. */
    label: string;
    /** One word for the chip in the side nav, where a sentence will not fit. */
    short: string;
    blurb: string;
    /** Where this role lands after choosing. */
    home: string;
    /** Console routes hoisted to the top of the sidebar for this role. */
    priority: string[];
    /** The application route this role starts from, if any. */
    apply: string | null;
    applyLabel: string | null;
  }
> = {
  individual: {
    label: "I want to report an animal",
    short: "Resident",
    blurb:
      "You see street animals where you live and want to report one, follow what happens to it, or help out.",
    home: "/map",
    priority: ["/map", "/report", "/following", "/get-involved"],
    apply: null,
    applyLabel: null,
  },
  ngo: {
    label: "I work at an organisation",
    short: "Organisation",
    blurb:
      "You run field work: ABC drives, vaccination, rescue, feeding. You need the records to hold together.",
    home: "/partner",
    priority: ["/partner", "/partner/incoming", "/partner/drives", "/partner/cases"],
    apply: "/partner-apply",
    applyLabel: "Apply to partner",
  },
  funder: {
    label: "I fund this work",
    short: "Funder",
    blurb:
      "You are placing CSR or grant money and need a programme that is scoped, costed and measurable.",
    home: "/what-would-it-take",
    priority: ["/what-would-it-take", "/gaps", "/outcomes", "/studies"],
    apply: "/contact?subject=Fund%20a%20programme",
    applyLabel: "Start a funding conversation",
  },
};

export const ROLE_KEY = "straypaw.role";

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

/** Reads the stored role. Returns null when nothing has been chosen yet. */
export function readStoredRole(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(ROLE_KEY);
    return isRole(v) ? v : null;
  } catch {
    // Private mode and blocked site-data both throw here; no stored role is
    // a perfectly good answer, so fall through rather than breaking render.
    return null;
  }
}

export function storeRole(role: Role) {
  try {
    window.localStorage.setItem(ROLE_KEY, role);
  } catch {
    /* nothing to do, the picker just reappears next visit */
  }
}
