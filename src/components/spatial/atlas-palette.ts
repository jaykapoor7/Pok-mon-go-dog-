import { NIGHT, PAPER, type Palette } from "@/components/map/basemap";

// Atlas-specific cartography. Shared landing palettes remain untouched.
export const ATLAS_NIGHT: Palette = {
  ...NIGHT, roadMajor: "rgba(143,183,255,0.20)", road: "rgba(143,183,255,0.08)",
  labelOpacity: 0.46, showRoadNames: false, buildings: false,
  water: "#07142b", land: "#10243b", park: "#142d3b", boundary: "rgba(143,183,255,0.30)",
};
export const ATLAS_PAPER: Palette = { ...PAPER, showRoadNames: false, buildings: false, labelOpacity: 0.55 };
