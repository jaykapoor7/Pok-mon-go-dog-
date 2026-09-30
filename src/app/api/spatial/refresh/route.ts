import { NextResponse } from "next/server";

/* Visitor traffic must never kick off global spatial materialisation. Spatial
 * rollups are rebuilt by controlled import/maintenance work, scoped to the
 * affected city. Retain this route as an explicit, harmless compatibility
 * response for older browsers rather than leaving a global invalidation API. */
export async function POST() {
  return NextResponse.json({ ok: true, queued: false, reason: "Spatial rollups refresh outside visitor requests." });
}
