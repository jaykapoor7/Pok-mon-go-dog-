/* After a case changes, the open workspace should update its local derived
   views without turning one field write into a global public-data rebuild. */

type Listener = () => void;
const listeners = new Set<Listener>();

export function onSpatialChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Several writes in one action are one local refresh.
 *
 * This deliberately does not invalidate the shared public spatial cache.
 * That cache is an aggregate of the whole register and invalidating it from
 * a field user's case write made the next visitor rebuild tens of thousands
 * of records. Imports and the scheduled aggregate refresh own that work.
 */
export function spatialChanged(): void {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    listeners.forEach((fn) => fn());
  }, 250);
}
