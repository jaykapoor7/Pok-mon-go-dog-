import { NextResponse } from "next/server";
import { caller, listFor } from "@/lib/connections/server";
import { NATIVE_FILES, PLANNED, PROVIDERS, PROVIDER_IDS, SERVICES, type ConnectionView } from "@/lib/connections/providers";
import { smsConfigured } from "@/lib/connections/sms";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET: every provider as the signed-in person sees it, the organisation's
   policies, native file support and what is planned. Never returns tokens. */
export async function GET(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in to manage connections." }, { status: 401 });
  /* Without the server key nothing can be linked here: show every provider as not available yet rather than failing the page. */
  const linkable = !!getSupabaseAdmin();
  const views = linkable ? await listFor(c) : [];
  const { data: pol } = c.ngoId ? await c.db.from("org_connection_policies").select("provider,allowed,allow_org_sharing").eq("ngo_id", c.ngoId) : { data: [] };
  return NextResponse.json({
    me: { org: !!c.ngoId, admin: c.role === "admin" },
    providers: PROVIDER_IDS.map((id) => ({ ...PROVIDERS[id], scopes: undefined, env: undefined, oauth: undefined, view: linkable ? views.find((v) => v.provider === id) : ({ provider: id, status: "unavailable", account_email: null, capabilities: [], connected_at: null, last_used_at: null, last_error: null, share_with_org: false } satisfies ConnectionView), policy: pol?.find((p) => p.provider === id) ?? { allowed: true, allow_org_sharing: false } })),
    native: NATIVE_FILES,
    services: {
      maps: { ...SERVICES.maps, status: "ready" },
      sms: { id: "sms", name: SERVICES.sms.name, line: SERVICES.sms.line, status: smsConfigured() ? "configured" : "unavailable", policy: pol?.find((p) => p.provider === "sms") ?? { allowed: false, allow_org_sharing: false } },
    },
    planned: PLANNED,
  });
}
