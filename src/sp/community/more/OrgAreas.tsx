"use client";
import { AreaMap } from "../../atlas/AreaMap";
import type { PublicOrgH3Cell } from "@/lib/org-public";
export function OrgAreas({ cells }: { cells: PublicOrgH3Cell[] }) {
  return <div className="og-map"><AreaMap cells={cells.map((c) => ({ h3: c.h3, value: c.records, hot: 0, label: "" }))} selected={null} onPick={() => {}} label="Where the organisation's records sit" ink="#1f6f80" empty="No mapped record." /></div>;
}
