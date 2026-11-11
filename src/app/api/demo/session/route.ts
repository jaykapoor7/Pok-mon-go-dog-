import { NextResponse } from "next/server";
import { DEMO_SITE } from "@/lib/demo-site";

/* Signs a visitor in to one of the five sample accounts on the STAGING
   database, for the guided demo on demo.straypaw.org. It answers only on a
   demonstration build (staging database), never on Vercel's production
   environment, and only when the demo password is configured for that
   deployment. The password stays on the server; the browser receives a
   session for a sample account and nothing else. */

export const dynamic = "force-dynamic";

const ROLES = new Set(["field", "vet", "coordinator", "lead", "municipal"]);
/* One Health demonstration people (docs/one-health/DEMO.md). Their accounts
   exist only where the One Health demo has been set up; elsewhere sign-in
   simply fails and the page says so. */
const OH_ROLES = new Set(["oh-programme", "oh-municipal", "oh-clinician", "oh-nurse", "oh-phc", "oh-lab", "oh-field", "oh-ngo", "oh-analyst", "oh-state", "oh-coimbatore"]);
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  const ohPassword = process.env.DEMO_ONEHEALTH_PASSWORD || password;
  if (!DEMO_SITE || process.env.VERCEL_ENV === "production" || !url || !key || !password) {
    return NextResponse.json({ error: "not_available" }, { status: 404, headers: NO_STORE });
  }
  let role: unknown = null;
  try { role = ((await req.json()) as { role?: unknown }).role; } catch { /* handled below */ }
  if (typeof role !== "string" || !(ROLES.has(role) || OH_ROLES.has(role))) {
    return NextResponse.json({ error: "unknown_role" }, { status: 400, headers: NO_STORE });
  }
  let r: Response;
  try {
    r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: `demo-${role}@straypaw.invalid`, password: OH_ROLES.has(role) ? ohPassword : password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "sign_in_unreachable" }, { status: 502, headers: NO_STORE });
  }
  if (!r.ok) return NextResponse.json({ error: "sign_in_failed", status: r.status }, { status: 502, headers: NO_STORE });
  const s = (await r.json()) as { access_token?: string; refresh_token?: string };
  if (!s.access_token || !s.refresh_token) return NextResponse.json({ error: "sign_in_failed" }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ access_token: s.access_token, refresh_token: s.refresh_token }, { headers: NO_STORE });
}
