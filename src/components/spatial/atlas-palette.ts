import { NIGHT, PAPER, type Palette } from "@/components/map/basemap";

// Atlas-specific cartography. Shared landing palettes remain untouched.
export const ATLAS_NIGHT: Palette = {
  ...NIGHT, roadMajor: "rgba(143,183,255,0.20)", road: "rgba(143,183,255,0.08)",
  labelOpacity: 0.46, showRoadNames: false, buildings: false,
  water: "#07142b", land: "#10243b", park: "#142d3b", boundary: "rgba(143,183,255,0.30)",
};
export const ATLAS_PAPER: Palette = {
  ...PAPER, bg: "#f4f3eb", land: "#eceee5", water: "#dae2dc", park: "#e0e7d8",
  labelHalo: "#f4f3eb", cellEdge: "#f4f3eb", road: "rgba(11,30,61,.09)",
  roadMajor: "rgba(11,30,61,.24)", boundary: "rgba(11,30,61,.3)",
  seq: ["#d6dfd1", "#a8bdb0", "#729995", "#3e717a", "#153f55"],
  showRoadNames: false, buildings: false, labelOpacity: 0.65,
};
