import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PROVIDERS, type Capability, type ConnectionView, type ProviderId } from "./providers";

/* ════════════════════════════════════════════════════════════════════
   Kaju Connections, server side: who is asking, encrypted token storage,
   signed OAuth state, token refresh, policy checks and the audit log.

   Tokens are encrypted with AES-256-GCM before they reach the database,
   stored in a table no client role can touch, and decrypted only here,
   only for the person who owns the connection (or, for a connection
   deliberately shared with the organisation, a member of that same
   organisation when the organisation's policy allows sharing).
   ════════════════════════════════════════════════════════════════════ */

export type Caller = { userId: string; email: string | null; ngoId: string | null; role: string | null; db: SupabaseClient };

/** The signed-in person behind a request (Authorization: Bearer <supabase access token>). */
export async function caller(req: Request): Promise<Caller | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!url || !anon || !token) return null;
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: m } = await db.from("ngo_members").select("ngo_id, role").eq("user_id", data.user.id).order("created_at").limit(1).maybeSingle();
  return { userId: data.user.id, email: data.user.email ?? null, ngoId: m?.ngo_id ?? null, role: m?.role ?? null, db };
}

/* ── configuration ─────────────────────────────────────────────────── */
export function missingEnv(p: ProviderId): string[] {
  return PROVIDERS[p].env.filter((k) => !process.env[k]?.trim());
}
export const configured = (p: ProviderId) => missingEnv(p).length === 0;
export function siteUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (env || new URL(req.url).origin).replace(/\/$/, "");
}
export const redirectUri = (req: Request, p: ProviderId) => `${siteUrl(req)}/api/connections/${p}/callback`;

/* ── encryption (AES-256-GCM, key = 32 bytes, base64 or hex) ───────── */
function key(): Buffer {
  const raw = process.env.CONNECTIONS_ENC_KEY?.trim();
  if (!raw) throw new Error("CONNECTIONS_ENC_KEY is not set");
  const k = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("CONNECTIONS_ENC_KEY must be 32 bytes");
  return k;
}
export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}
export function open(sealed: string): string {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unreadable token");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(body, "base64")), d.final()]).toString("utf8");
}

/* ── signed OAuth state: who started it, for which provider, expiry ─── */
export function signState(payload: { u: string; p: ProviderId; n: string; r: string }): string {
  const body = Buffer.from(JSON.stringify({ ...payload, e: Date.now() + 10 * 60_000 })).toString("base64url");
  const mac = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${mac}`;
}
export function readState(state: string | null): { u: string; p: ProviderId; n: string; r: string } | null {
  if (!state) return null;
  const [body, mac] = state.split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", key()).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  const v = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  return typeof v.e === "number" && v.e > Date.now() ? v : null;
}

/* ── storage ───────────────────────────────────────────────────────── */
function admin() {
  const a = getSupabaseAdmin();
  if (!a) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return a;
}

export async function audit(e: { connection_id?: string | null; user_id?: string | null; ngo_id?: string | null; provider: ProviderId; action: string; detail?: Record<string, unknown> }) {
  await admin().from("connection_audit").insert({ ...e, detail: e.detail ?? {} });
}

export async function policy(ngoId: string | null, p: ProviderId) {
  if (!ngoId) return { allowed: true, allow_org_sharing: false };
  const { data } = await admin().from("org_connection_policies").select("allowed, allow_org_sharing").eq("ngo_id", ngoId).eq("provider", p).maybeSingle();
  return data ?? { allowed: true, allow_org_sharing: false };
}

export async function saveConnection(c: Caller, p: ProviderId, t: { access_token: string; refresh_token?: string | null; expires_in?: number; scope?: string }, who: { email: string | null; name: string | null }) {
  const a = admin();
  const caps = PROVIDERS[p].capabilities;
  const { data, error } = await a.from("connections").upsert({
    user_id: c.userId, ngo_id: c.ngoId, provider: p, account_email: who.email, account_name: who.name,
    scopes: (t.scope ?? "").split(/\s+/).filter(Boolean), capabilities: caps, status: "connected", last_error: null,
    connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" }).select("id").single();
  if (error) throw new Error(error.message);
  const { data: old } = await a.from("connection_secrets").select("refresh_token_enc").eq("connection_id", data.id).maybeSingle();
  await a.from("connection_secrets").upsert({
    connection_id: data.id, access_token_enc: seal(t.access_token),
    /* Google sends a refresh token only on first consent: keep the old one. */
    refresh_token_enc: t.refresh_token ? seal(t.refresh_token) : old?.refresh_token_enc ?? null,
    expires_at: t.expires_in ? new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString() : null, updated_at: new Date().toISOString(),
  });
  await audit({ connection_id: data.id, user_id: c.userId, ngo_id: c.ngoId, provider: p, action: "connected", detail: { account: who.email, scopes: t.scope ?? "" } });
  return data.id as string;
}

/** Every provider, as this person sees it: available, connected, blocked, unavailable. */
export async function listFor(c: Caller): Promise<ConnectionView[]> {
  const a = admin();
  const { data: rows } = await a.from("connections").select("id,user_id,provider,account_email,capabilities,status,connected_at,last_used_at,last_error,share_with_org").eq("user_id", c.userId);
  const out: ConnectionView[] = [];
  for (const p of Object.keys(PROVIDERS) as ProviderId[]) {
    const row = rows?.find((r) => r.provider === p);
    const pol = await policy(c.ngoId, p);
    const missing = missingEnv(p);
    const base = { provider: p, account_email: row?.account_email ?? null, capabilities: (row?.capabilities ?? []) as Capability[], connected_at: row?.connected_at ?? null, last_used_at: row?.last_used_at ?? null, last_error: row?.last_error ?? null, share_with_org: !!row?.share_with_org };
    if (!pol.allowed) out.push({ ...base, status: "blocked" });
    else if (row && row.status !== "revoked") out.push({ ...base, status: row.status as ConnectionView["status"] });
    else if (missing.length) out.push({ ...base, status: "unavailable", missing_env: missing });
    else out.push({ ...base, status: "available" });
  }
  return out;
}

/** A usable access token for this person and provider, refreshed when expired. */
export async function accessToken(c: Caller, p: ProviderId): Promise<{ token: string; connectionId: string } | { error: string }> {
  const a = admin();
  if (!(await policy(c.ngoId, p)).allowed) return { error: `${PROVIDERS[p].name} is switched off for your organisation.` };
  const { data: conn } = await a.from("connections").select("id,status,ngo_id").eq("user_id", c.userId).eq("provider", p).maybeSingle();
  if (!conn || conn.status === "revoked") return { error: `Connect ${PROVIDERS[p].name} first, in Settings → Connections.` };
  /* A connection made in one organisation is never used from another. */
  if (conn.ngo_id && conn.ngo_id !== c.ngoId) return { error: "This connection belongs to a different organisation." };
  const { data: s } = await a.from("connection_secrets").select("access_token_enc,refresh_token_enc,expires_at").eq("connection_id", conn.id).maybeSingle();
  if (!s) return { error: `Reconnect ${PROVIDERS[p].name}.` };
  if (!s.expires_at || Date.parse(s.expires_at) > Date.now()) return { token: open(s.access_token_enc), connectionId: conn.id };
  if (!s.refresh_token_enc) { await markStatus(conn.id, "expired", "Access expired"); return { error: `Reconnect ${PROVIDERS[p].name}: access expired.` }; }
  try {
    const t = await refresh(p, open(s.refresh_token_enc));
    await a.from("connection_secrets").update({
      access_token_enc: seal(t.access_token), refresh_token_enc: t.refresh_token ? seal(t.refresh_token) : s.refresh_token_enc,
      expires_at: new Date(Date.now() + ((t.expires_in ?? 3600) - 60) * 1000).toISOString(), updated_at: new Date().toISOString(),
    }).eq("connection_id", conn.id);
    await a.from("connections").update({ status: "connected", last_error: null, last_refreshed_at: new Date().toISOString() }).eq("id", conn.id);
    await audit({ connection_id: conn.id, user_id: c.userId, ngo_id: c.ngoId, provider: p, action: "refreshed" });
    return { token: t.access_token, connectionId: conn.id };
  } catch (e) {
    await markStatus(conn.id, "expired", (e as Error).message.slice(0, 200));
    await audit({ connection_id: conn.id, user_id: c.userId, ngo_id: c.ngoId, provider: p, action: "refresh_failed", detail: { error: (e as Error).message.slice(0, 200) } });
    return { error: `Reconnect ${PROVIDERS[p].name}: the provider refused to renew access.` };
  }
}

export async function markStatus(id: string, status: "connected" | "expired" | "error" | "revoked", err: string | null) {
  await admin().from("connections").update({ status, last_error: err, updated_at: new Date().toISOString() }).eq("id", id);
}
export async function touch(id: string) {
  await admin().from("connections").update({ last_used_at: new Date().toISOString() }).eq("id", id);
}

/* ── OAuth endpoints (from each provider's OAuthSpec) ───────────── */
const fill = (u: string) => u.replace("{tenant}", process.env.MICROSOFT_TENANT_ID?.trim() || "common").replace("{zoho}", process.env.ZOHO_ACCOUNTS_URL?.trim() || "https://accounts.zoho.in");
export function authorizeUrl(req: Request, p: ProviderId, state: string, codeChallenge: string): string {
  const o = PROVIDERS[p].oauth;
  const q = new URLSearchParams({ response_type: "code", client_id: process.env[o.clientIdEnv]!, redirect_uri: redirectUri(req, p), state, ...(o.extra ?? {}) });
  q.set(o.scopeParam ?? "scope", PROVIDERS[p].scopes.join(o.scopeSep ?? " "));
  if (o.pkce) { q.set("code_challenge", codeChallenge); q.set("code_challenge_method", "S256"); }
  return `${fill(o.authorize)}?${q}`;
}
const creds = (p: ProviderId) => ({ client_id: process.env[PROVIDERS[p].oauth.clientIdEnv]!, client_secret: process.env[PROVIDERS[p].oauth.clientSecretEnv]! });
type TokenSet = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string; id_token?: string };

/* Slack returns the person's token under authed_user. */
function normalise(p: ProviderId, j: Record<string, unknown>): TokenSet {
  if (p === "slack") {
    const u = (j.authed_user ?? {}) as Record<string, unknown>;
    if (!j.ok || !u.access_token) throw new Error(String(j.error ?? "Slack refused the connection"));
    return { access_token: String(u.access_token), refresh_token: u.refresh_token ? String(u.refresh_token) : undefined, expires_in: u.expires_in ? Number(u.expires_in) : undefined, scope: String(u.scope ?? "") };
  }
  if (!j.access_token) throw new Error(String(j.error_description ?? j.error ?? "Token exchange failed"));
  return j as unknown as TokenSet;
}
export async function exchange(req: Request, p: ProviderId, code: string, verifier: string): Promise<TokenSet> {
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(req, p), ...creds(p) });
  if (PROVIDERS[p].oauth.pkce) body.set("code_verifier", verifier);
  const r = await fetch(fill(PROVIDERS[p].oauth.token), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || `Token exchange failed (${r.status})`);
  return normalise(p, j);
}
async function refresh(p: ProviderId, refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, ...creds(p) });
  if (p === "microsoft") body.set("scope", PROVIDERS[p].scopes.join(" "));
  const r = await fetch(fill(PROVIDERS[p].oauth.token), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || `Refresh failed (${r.status})`);
  return normalise(p, j);
}
export async function whoAmI(p: ProviderId, token: string): Promise<{ email: string | null; name: string | null }> {
  if (p === "slack") {
    const j = await (await fetch("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${token}` } })).json().catch(() => ({}));
    return { email: j.user ? `${j.user} · ${j.team ?? "Slack"}` : null, name: j.user ?? null };
  }
  const url = p === "google" ? "https://openidconnect.googleapis.com/v1/userinfo" : p === "microsoft" ? "https://graph.microsoft.com/v1.0/me" : `${fill("{zoho}")}/oauth/user/info`;
  const j = await (await fetch(url, { headers: { Authorization: `${p === "zoho" ? "Zoho-oauthtoken" : "Bearer"} ${token}` } })).json().catch(() => ({}));
  if (p === "google") return { email: j.email ?? null, name: j.name ?? null };
  if (p === "microsoft") return { email: j.mail ?? j.userPrincipalName ?? null, name: j.displayName ?? null };
  return { email: j.Email ?? null, name: j.Display_Name ?? null };
}

/** Revoke at the provider where it offers a call (Google, Slack, Zoho; Microsoft is revoked from the user's account page), then remove our copy. */
export async function disconnect(c: Caller, p: ProviderId) {
  const a = admin();
  const { data: conn } = await a.from("connections").select("id").eq("user_id", c.userId).eq("provider", p).maybeSingle();
  if (!conn) return false;
  const { data: s } = await a.from("connection_secrets").select("access_token_enc,refresh_token_enc").eq("connection_id", conn.id).maybeSingle();
  let revoked = false;
  if (s) {
    try {
      const tok = open(s.refresh_token_enc ?? s.access_token_enc);
      const r = p === "google" ? await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tok)}`, { method: "POST" })
        : p === "slack" ? await fetch("https://slack.com/api/auth.revoke", { method: "POST", headers: { Authorization: `Bearer ${open(s.access_token_enc)}` } })
          : p === "zoho" ? await fetch(`${fill("{zoho}")}/oauth/v2/token/revoke?token=${encodeURIComponent(tok)}`, { method: "POST" }) : null;
      revoked = !!r?.ok;
    } catch { /* still remove locally */ }
  }
  await a.from("connection_secrets").delete().eq("connection_id", conn.id);
  await a.from("connections").delete().eq("id", conn.id);
  await audit({ connection_id: conn.id, user_id: c.userId, ngo_id: c.ngoId, provider: p, action: "disconnected", detail: { revoked_at_provider: revoked } });
  return true;
}

/** Which capabilities this person can use right now (capability discovery for Kaju). */
export async function capabilitiesFor(c: Caller): Promise<Partial<Record<ProviderId, Capability[]>>> {
  const views = await listFor(c);
  return Object.fromEntries(views.filter((v) => v.status === "connected").map((v) => [v.provider, v.capabilities]));
}
