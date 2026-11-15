/* The screens Kaju can open for someone ("open field mode", "take me to packages"). Each names the workspace it belongs
   to and, where a screen is for some roles only, those roles, so Kaju never offers a screen the person cannot use. The
   database still decides what each screen shows. The keys are the ones Kaju's tools have always used. */

export type ScreenRole = "admin" | "coordinator" | "veterinarian" | "member";
export type Screen = { key: string; workspace: "ngo" | "government" | "healthcare" | "research" | "kaju" | "public"; href: string; label: string; aliases?: string[]; roles?: ScreenRole[]; reviewer?: boolean };

const LEADS: ScreenRole[] = ["admin", "coordinator"];

export const SCREENS: Screen[] = [
  /* NGO */
  { key: "work", workspace: "ngo", href: "/ngo/cases", label: "Cases", aliases: ["work queue", "work", "queue", "cases"] },
  { key: "new_case", workspace: "ngo", href: "/ngo/cases/new", label: "New case" },
  { key: "inbox", workspace: "ngo", href: "/ngo/inbox", label: "Inbox", aliases: ["intake", "inbox"] },
  { key: "animals", workspace: "ngo", href: "/ngo/animals", label: "Animals", aliases: ["register animals", "animal register"] },
  { key: "field", workspace: "ngo", href: "/ngo/field", label: "Field mode" },
  { key: "field_map", workspace: "ngo", href: "/ngo/operations?view=map", label: "Organisation map", aliases: ["map of my organisation", "animal and field map"] },
  { key: "care_ledger", workspace: "ngo", href: "/ngo/operations?view=care-log", label: "Care log", aliases: ["care ledger"] },
  { key: "verification", workspace: "ngo", href: "/ngo/submissions?tab=evidence", label: "Evidence readiness", aliases: ["treatment and sign-off", "sign-off", "verification"] },
  { key: "programmes", workspace: "ngo", href: "/ngo/programmes", label: "Programmes" },
  { key: "working_zones", workspace: "ngo", href: "/ngo/programmes?tab=zones", label: "Working zones" },
  { key: "reports", workspace: "ngo", href: "/ngo/submissions", label: "Packages", aliases: ["report packages", "submissions"], roles: LEADS },
  { key: "contracts", workspace: "ngo", href: "/ngo/submissions?tab=contracts", label: "Contracts", aliases: ["contracts and reconciliation"], roles: LEADS },
  { key: "report_exports", workspace: "ngo", href: "/ngo/submissions?tab=exports", label: "Exports", aliases: ["reports and proof", "proof"], roles: LEADS },
  { key: "quality", workspace: "ngo", href: "/ngo/submissions?tab=quality", label: "Record quality", aliases: ["data quality"], roles: LEADS },
  { key: "review", workspace: "ngo", href: "/ngo/cases", label: "Cases waiting on a decision", aliases: ["historical review"], roles: LEADS },
  { key: "team", workspace: "ngo", href: "/ngo/team", label: "Team", aliases: ["team and access"], roles: ["admin"] },
  { key: "import", workspace: "ngo", href: "/ngo/import", label: "Import", aliases: ["import your register"], roles: ["admin"] },
  { key: "settings", workspace: "ngo", href: "/ngo/settings", label: "Settings", roles: ["admin"] },
  /* Kaju */
  { key: "automations", workspace: "kaju", href: "/kaju/automations", label: "Automations", roles: LEADS },
  /* Government and programmes */
  { key: "insights", workspace: "government", href: "/gov/overview", label: "Overview" },
  { key: "city_programmes", workspace: "government", href: "/gov/programmes", label: "Programmes", aliases: ["city programmes"] },
  { key: "city_report", workspace: "government", href: "/gov/reports", label: "Reports", aliases: ["city reports"] },
  /* Public pages */
  { key: "city", workspace: "public", href: "/city", label: "Wards and map" },
  { key: "map", workspace: "public", href: "/community", label: "Map" },
  { key: "report_animal", workspace: "public", href: "/community/report", label: "Report an animal" },
  { key: "academy", workspace: "public", href: "/learn", label: "Learn" },
];

/** Whether this person may be offered the screen. Roles outside the NGO list (or none) see only unrestricted screens. */
export function canOpen(s: Screen, role: ScreenRole | null, reviewer = false) {
  return (!s.roles || (!!role && s.roles.includes(role))) && (!s.reviewer || reviewer);
}
