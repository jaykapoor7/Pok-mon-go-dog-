/* After a case changes, the map, the analytics and the dashboard should
   say so — not after the ten-minute cache, and not only after a reload.

   A write that changes the register calls spatialChanged(). It asks the
   server to rebuild the public dataset (a signed-in request; see
   /api/spatial/refresh), then tells every open map, report and dashboard
   in this browser to read its dataset again. */

import { getSupabase } from "@/lib/supabase";

type Listener = () => void;
const listeners = new Set<Listener>();

export function onSpatialChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Several writes in one action (a status and a follow-up) are one refresh. */
export function spatialChanged(): void {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    try {
      const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (token) await fetch("/api/spatial/refresh", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch {
      /* The server copy catches up on its own; this browser still reloads. */
    }
    listeners.forEach((fn) => fn());
  }, 250);
}
