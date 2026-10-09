import { NIGHT, PAPER, type Palette } from "@/components/map/basemap";

// Atlas-specific cartography. Shared landing palettes remain untouched.
/* Night: the landing plate's ground, quieter. Streets are a hairline so
   the evidence carries the colour; place names stay legible but recede. */
export const ATLAS_NIGHT: Palette = {
  ...NIGHT, bg: "#081631", land: "#081631", water: "#0c2548", park: "#0a1d38", building: "#0d2142",
  roadMajor: "rgba(239,231,218,0.16)", road: "rgba(239,231,218,0.06)", rail: "rgba(239,231,218,0.06)",
  labelOpacity: 0.5, showRoadNames: false, buildings: false, boundary: "rgba(185,199,221,0.26)",
  seq: ["#1c3a80", "#2457ce", "#4f86f0", "#8fb7ff", "#e8f0ff"],
};
export const ATLAS_PAPER: Palette = {
  ...PAPER, bg: "#f4efe6", land: "#f2ede3", water: "#c8dbf3", park: "#dfe9d2",
  labelHalo: "#f7f3ec", cellEdge: "#f4efe6", road: "rgba(11,30,61,.09)",
  roadMajor: "rgba(11,30,61,.24)", boundary: "rgba(11,30,61,.3)",
  seq: ["#dbe5f8", "#a9c0ef", "#6f93e2", "#2f62d3", "#163f9a"],
  showRoadNames: false, buildings: false, labelOpacity: 0.65,
};
