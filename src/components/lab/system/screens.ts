export const SYSTEM_SCREENS = [
  { id: "landing", name: "Landing", group: "Public" },
  { id: "home", name: "Community home", group: "Residents" },
  { id: "animal", name: "Animal record", group: "Records" },
  { id: "case", name: "Case record", group: "Records" },
  { id: "map", name: "Field map", group: "Maps" },
  { id: "coverage", name: "Ward coverage", group: "Maps" },
  { id: "ngo", name: "NGO operations", group: "Organisations" },
  { id: "organisation", name: "Organisation", group: "Organisations" },
  { id: "project", name: "Project", group: "Organisations" },
  { id: "analytics", name: "Analytics", group: "Institutions" },
] as const;
export type SystemScreenId = (typeof SYSTEM_SCREENS)[number]["id"];
