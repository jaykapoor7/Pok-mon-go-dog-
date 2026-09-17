/* ════════════════════════════════════════════════════════════════════
   Who is using StrayPaw.

   The product currently has two entry modes: community and organisation.
   Older feeder / educator / funder experiments remain described below so
   their route work is not destroyed, but they are intentionally not valid
   stored roles until those workflows earn their way back into the product.
   ════════════════════════════════════════════════════════════════════ */

export type Role = "individual" | "feeder" | "educator" | "ngo" | "funder";

export const ROLES: Role[] = ["individual", "ngo"];

export const ROLE_META: Record<
  Role,
  {
    label: string;
    short: string;
    blurb: string;
    home: string;
    priority: string[];
    apply: string | null;
    applyLabel: string | null;
  }
> = {
  individual: {
    label: "I want to report or follow street animals",
    short: "Community",
    blurb: "Report an animal, follow what happens to it, and use the shared map without joining an organisation.",
    home: "/app",
    priority: ["/app", "/map", "/report", "/following"],
    apply: null,
    applyLabel: null,
  },
  feeder: {
    label: "I care for dogs in my area",
    short: "Feeder",
    blurb: "Experimental role currently folded into Community.",
    home: "/app",
    priority: ["/app", "/map", "/report", "/following"],
    apply: null,
    applyLabel: null,
  },
  educator: {
    label: "I teach",
    short: "Educator",
    blurb: "Experimental role currently folded into Community.",
    home: "/app",
    priority: ["/app", "/map", "/report"],
    apply: null,
    applyLabel: null,
  },
  ngo: {
    label: "I work at an organisation",
    short: "Organisation",
    blurb: "Run field work, keep animal records together, and turn operational data into evidence.",
    home: "/partner",
    priority: ["/partner", "/partner/cases", "/partner/records", "/partner/drives"],
    apply: "/partner-apply",
    applyLabel: "Apply to partner",
  },
  funder: {
    label: "I fund this work",
    short: "Funder",
    blurb: "Experimental role currently folded into the public evidence layer.",
    home: "/app",
    priority: ["/app", "/map", "/outcomes", "/programmes"],
    apply: null,
    applyLabel: null,
  },
};

export const ROLE_KEY = "straypaw.role";

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

export function readStoredRole(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(ROLE_KEY);
    return isRole(v) ? v : null;
  } catch {
    return null;
  }
}

export function storeRole(role: Role) {
  try {
    window.localStorage.setItem(ROLE_KEY, role);
  } catch {
    /* The role picker can reappear next visit. */
  }
}
