export const DIRECTIONS = [
  { id: "atlas", letter: "A", name: "Living Field Atlas", line: "The city drawn by its animals: editorial cartography, contour terrain of care, photographs as plates." },
  { id: "civic", letter: "B", name: "Civic Animal Infrastructure", line: "A public register with the authority of a transit system: signage, numerals, coverage hexes, dockets." },
  { id: "journal", letter: "C", name: "Field Operations Journal", line: "The field team's working notebook: typed entries, stamps that accumulate, survey sheets, taped photographs." },
] as const;

export const SCREENS = [
  { id: "landing", name: "Landing" },
  { id: "home", name: "Community home" },
  { id: "animal", name: "Animal profile" },
  { id: "map", name: "Field map" },
  { id: "ngo", name: "NGO dashboard" },
] as const;

export type DirectionId = (typeof DIRECTIONS)[number]["id"];
export type ScreenId = (typeof SCREENS)[number]["id"];
