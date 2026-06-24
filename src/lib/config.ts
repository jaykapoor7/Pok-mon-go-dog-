// ─────────────────────────────────────────────────────────────
// App configuration flags.
// ─────────────────────────────────────────────────────────────

/**
 * Demo Mode — overlays a fixed set of realistic sample dog sightings on the
 * map so the product looks active even when there's little/no real data.
 *
 * Demo data is READ-ONLY and strictly isolated: it is never written to the
 * database and never mixed into real submissions (demo ids are prefixed
 * "demo-" and all write paths skip them).
 *
 * Toggle: set NEXT_PUBLIC_DEMO_MODE="false" to turn it off (defaults on).
 */
export const DEMO_MODE =
  (process.env.NEXT_PUBLIC_DEMO_MODE ?? "true").toLowerCase() === "true";

/** All demo records carry this id prefix so writes can safely ignore them. */
export const DEMO_ID_PREFIX = "demo-";

export const isDemoId = (id: string | null | undefined) =>
  !!id && id.startsWith(DEMO_ID_PREFIX);
