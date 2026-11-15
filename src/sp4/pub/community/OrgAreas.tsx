"use client";

import type { PublicOrgH3Cell } from "@/lib/org-public";
import { AreaBlooms } from "../map";

export function OrgAreas({ cells }: { cells: PublicOrgH3Cell[] }) {
  return <AreaBlooms cells={cells.map((c) => ({ h3: c.h3, value: c.records }))} label="Where the organisation's records sit" ink="#1f6f80" empty="No mapped record." />;
}
