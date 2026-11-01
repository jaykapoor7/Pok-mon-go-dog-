import { NextResponse } from "next/server";
import { audit, exchange, readState, saveConnection, siteUrl, whoAmI, type Caller } from "@/lib/connections/server";
import { isProvider } from "@/lib/connections/providers";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET: the provider sends the person back here. Checks the signed state
   and the cookie from the same browser, exchanges the code (PKCE), stores
   the tokens encrypted, then returns the person to Connections. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const home = (q: string, back = "/ngo/settings/connections") => NextResponse.redirect(`${siteUrl(req)}${back}?${q}`);
  if (!isProvider(provider)) return home("connection=error&reason=provider");
  let state;
  try { state = readState(url.searchParams.get("state")); } catch { state = null; }
  const back = state?.r ?? "/ngo/settings/connections";
  if (url.searchParams.get("error")) return home(`connection=cancelled&provider=${provider}`, back);
  const cookie = req.headers.get("cookie")?.match(new RegExp(`(?:^|; )sp_conn_${provider}=([^;]+)`))?.[1];
  const [nonce, verifier] = decodeURIComponent(cookie ?? "").split(".");
  const code = url.searchParams.get("code");
  if (!state || state.p !== provider || !nonce || nonce !== state.n || !verifier || !code) return home(`connection=error&provider=${provider}&reason=state`, back);
  const admin = getSupabaseAdmin();
  if (!admin) return home(`connection=error&provider=${provider}&reason=config`, back);
  const { data: m } = await admin.from("ngo_members").select("ngo_id, role").eq("user_id", state.u).order("created_at").limit(1).maybeSingle();
  const c: Caller = { userId: state.u, email: null, ngoId: m?.ngo_id ?? null, role: m?.role ?? null, db: admin };
  try {
    const t = await exchange(req, provider, code, verifier);
    const who = await whoAmI(provider, t.access_token);
    await saveConnection(c, provider, t, who);
    const res = home(`connection=connected&provider=${provider}`, back);
    res.cookies.set(`sp_conn_${provider}`, "", { path: `/api/connections/${provider}`, maxAge: 0 });
    return res;
  } catch (e) {
    await audit({ user_id: c.userId, ngo_id: c.ngoId, provider, action: "connect_failed", detail: { error: (e as Error).message.slice(0, 200) } });
    return home(`connection=error&provider=${provider}&reason=exchange`, back);
  }
}
