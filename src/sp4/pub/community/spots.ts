import { latLngToCell } from "h3-js";
import type { FeedingZone } from "@/lib/types";

/* A feeding spot as the public sees it. The pin never leaves the server:
   pages receive the area (an H3 cell of about 0.74 km²) only. */
export type PublicSpot = { id: string; name: string; description: string | null; zone: string | null; h3: string | null; last_fed_at: string | null; volunteer_count: number; created_at: string };

export const toPublic = (z: FeedingZone): PublicSpot => ({
  id: z.id, name: z.name, description: z.description, zone: z.zone,
  h3: Number.isFinite(z.lat) && Number.isFinite(z.lng) && (z.lat || z.lng) ? latLngToCell(z.lat, z.lng, 8) : null,
  last_fed_at: z.last_fed_at, volunteer_count: z.volunteer_count, created_at: z.created_at,
});
