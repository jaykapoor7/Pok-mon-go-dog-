import { NextResponse } from "next/server";
import { caller, capabilitiesFor } from "@/lib/connections/server";
import { kajuStatus, mailAppsReady } from "@/lib/kaju/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* What Kaju can use here, for the signed-in person: which capabilities work now and which need the owner's setup.
   Booleans and labels only; no setting's value, key or secret ever leaves the server. */
export async function GET(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  /* Whether this person has their own email connected with permission to send. Unknown, not false, when it cannot be read. */
  let mail: boolean | null = null;
  if (mailAppsReady()) try {
    const caps = await Promise.race([capabilitiesFor(c), new Promise<null>((r) => setTimeout(() => r(null), 3000))]);
    if (caps) mail = Object.values(caps).some((list) => (list ?? []).includes("mail.send"));
  } catch { mail = null; }
  const items = kajuStatus(process.env, mail);
  return NextResponse.json({ items, planning: items.find((i) => i.id === "model")?.state === "live" }, { headers: { "Cache-Control": "no-store" } });
}
