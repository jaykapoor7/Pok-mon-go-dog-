import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { authorizeUrl, caller, configured, missingEnv, policy, signState } from "@/lib/connections/server";
import { isProvider, PROVIDERS } from "@/lib/connections/providers";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST: begin connecting. Returns the provider's consent URL; the PKCE
   verifier and a nonce go into a short-lived httpOnly cookie, and the
   state is signed, so the callback can only complete this person's own
   attempt from this browser. */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  if (!(await allowRequest(clientIp(req), "conn-start", 10, 600))) return NextResponse.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!configured(provider)) return NextResponse.json({ error: `${PROVIDERS[provider].name} is not available yet: an administrator must finish setting it up.`, missing: missingEnv(provider) }, { status: 503 });
  if (!(await policy(c.ngoId, provider)).allowed) return NextResponse.json({ error: `${PROVIDERS[provider].name} is switched off for your organisation.` }, { status: 403 });
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const back = new URL(req.url).searchParams.get("back") ?? "";
  const state = signState({ u: c.userId, p: provider, n: nonce, r: back.startsWith("/") && !back.startsWith("//") ? back : "/ngo/settings/connections" });
  const res = NextResponse.json({ url: authorizeUrl(req, provider, state, challenge) });
  res.cookies.set(`sp_conn_${provider}`, `${nonce}.${verifier}`, { httpOnly: true, secure: true, sameSite: "lax", path: `/api/connections/${provider}`, maxAge: 600 });
  return res;
}
