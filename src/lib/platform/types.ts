// ════════════════════════════════════════════════════════════════
// StrayPaw data platform - normalized data model.
//
// Every value in the platform carries full provenance so that reported data,
// estimates, derived analysis and unknowns are always distinguishable, and so
// future CSV / Excel / public / NGO datasets can be normalized into the same
// shape without rebuilding the product.
// ════════════════════════════════════════════════════════════════

/** Where a number comes from - always shown next to the number. */
export type SourceType =
  | "government"
  | "research"
  | "ngo"
  | "community"
  | "estimate"
  | "derived";

/** How much to trust a value. */
export type Confidence = "high" | "medium" | "low";

/** Administrative levels, coarse → fine. Data exists at different depths. */
export type GeoLevel = "national" | "state" | "district" | "city" | "ward";

export interface GeoRef {
  level: GeoLevel;
  /** Stable code, e.g. "IN", "IN-MH", "IN-MH-PUNE". */
  code: string;
  name: string;
  /** Parent code (state for a district, etc.). */
  parent?: string;
}

/** A single normalized observation. */
export interface DataPoint {
  metric: string; // metric id, see METRICS
  value: number;
  unit: string; // "%", "dogs", "deaths/yr", "count"
  geo: GeoRef;
  year: number;
  sourceType: SourceType;
  /** Human-readable source label, e.g. "20th Livestock Census (2019)". */
  source: string;
  confidence?: Confidence;
  /** True when the figure is illustrative sample data, not an official value. */
  sample?: boolean;
  note?: string;
}

/** A dataset groups points that share a metric + provenance story. */
export interface Dataset {
  id: string;
  title: string;
  metric: string;
  description: string;
  sourceType: SourceType;
  source: string;
  sourceUrl?: string;
  year: number | string;
  /** Finest geographic level this dataset resolves to. */
  resolution: GeoLevel;
  /** Whole dataset is illustrative sample data. */
  sample: boolean;
  points: DataPoint[];
  /** National-level headline figures for this metric, kept separate from the
   *  state-resolution `points[]` so ranking/coverage math over states stays clean. */
  national?: DataPoint[];
}

export interface MetricDef {
  id: string;
  label: string;
  short: string;
  unit: string;
  /** Higher is better (coverage) vs. higher is worse (deaths). */
  direction: "higher-better" | "lower-better" | "neutral";
  description: string;
}

export const SOURCE_META: Record<SourceType, { label: string; color: string; dot: string }> = {
  government: { label: "Government", color: "text-[#2f63c2]", dot: "#2f63c2" },
  research: { label: "Research", color: "text-[#6b3f90]", dot: "#8b5ea8" },
  ngo: { label: "NGO", color: "text-[#2d6b5e]", dot: "#3e8473" },
  community: { label: "Community", color: "text-[#9c7010]", dot: "#d9a441" },
  estimate: { label: "Estimate", color: "text-bark-500", dot: "#97a0b2" },
  derived: { label: "Derived", color: "text-[#a83620]", dot: "#c0492e" },
};

export const CONFIDENCE_META: Record<Confidence, { label: string }> = {
  high: { label: "High confidence" },
  medium: { label: "Medium confidence" },
  low: { label: "Low confidence" },
};
