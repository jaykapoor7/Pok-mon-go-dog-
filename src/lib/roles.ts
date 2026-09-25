/* ════════════════════════════════════════════════════════════════════
   Who is using StrayPaw.

   Four spaces: community, feeder, educator and organisation. A feeder's
   home is their route book (/feeder), an educator's the lessons (/learn).
   The funder experiment stays described below but is not a valid stored
   role; funders read the public evidence layer.
   ════════════════════════════════════════════════════════════════════ */

export type Role = "individual" | "feeder" | "educator" | "ngo" | "funder";

export const ROLES: Role[] = ["individual", "feeder", "educator", "ngo"];

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
    blurb: "Report an animal, follow what happens to it, and use the shared map.",
    home: "/app",
    priority: ["/app", "/map", "/report", "/following"],
    apply: null,
    applyLabel: null,
  },
  feeder: {
    label: "I feed or care for animals on my street",
    short: "Feeder",
    blurb: "Keep your route, its feeding spots and the animals on it together.",
    home: "/feeder",
    priority: ["/feeder", "/feeding", "/map", "/following"],
    apply: null,
    applyLabel: null,
  },
  educator: {
    label: "I teach people about street animals",
    short: "Educator",
    blurb: "Lessons and real local records for a class or a community session.",
    home: "/learn",
    priority: ["/learn", "/map", "/insights", "/stories"],
    apply: null,
    applyLabel: null,
  },
  ngo: {
    label: "I work at an organisation",
    short: "Organisation",
    blurb: "Run field work and keep your animal records in a verified workspace.",
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
