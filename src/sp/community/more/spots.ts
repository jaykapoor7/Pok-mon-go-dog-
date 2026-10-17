import { latLngToCell } from "h3-js";
import type { FeedingZone } from "@/lib/types";
import type { PublicSpot } from "./Feeding";

/* The pin never leaves the server: pages receive the area only. */
export const toPublic = (z: FeedingZone): PublicSpot => ({ id: z.id, name: z.name, description: z.description, zone: z.zone, h3: Number.isFinite(z.lat) && Number.isFinite(z.lng) && (z.lat || z.lng) ? latLngToCell(z.lat, z.lng, 8) : null, last_fed_at: z.last_fed_at, volunteer_count: z.volunteer_count, created_at: z.created_at });
