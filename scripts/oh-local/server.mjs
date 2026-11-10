#!/usr/bin/env node
/* Local development API for the One Health workspaces. NOT used in any deployment.

   It speaks the small part of the Supabase HTTP API the One Health pages use,
   in front of a throwaway local PostgreSQL:
     POST /auth/v1/token?grant_type=password|refresh_token   sign in a local demo account
     GET  /auth/v1/user                                       who the token belongs to
     POST /auth/v1/logout
     POST /rest/v1/rpc/<function>                             call a public function
     GET  /rest/v1/<table>?select=*&<col>=eq.<value>&limit=   simple reads (RLS applies)

   Every request runs in its own transaction as the database role Supabase
   would use ('anon' or 'authenticated') with the caller's id in
   request.jwt.claim.sub, so the migration's own permission checks and RLS
   decide what each person can do. Nothing here grants extra access.

   Usage: OH_PG=postgres://postgres@/straypaw_local?host=/tmp/pg&port=5433 node scripts/oh-local/server.mjs */
import http from "node:http";
import pg from "pg";
import { SignJWT, jwtVerify } from "jose";

const PORT = Number(process.env.OH_PORT ?? 54321);
const SECRET = new TextEncoder().encode(process.env.OH_JWT_SECRET ?? "local-only-one-health-secret-not-for-deployment");
const PASSWORD = process.env.OH_DEMO_PASSWORD ?? "one-health-local";
const pool = new pg.Pool({ connectionString: process.env.OH_PG ?? "postgresql://postgres@localhost:5433/straypaw_local?host=/tmp/pg" });
const IDENT = /^[a-z_][a-z0-9_]{0,62}$/;

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Expose-Headers": "content-range" };
const send = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json", ...cors }); res.end(body === undefined ? "" : JSON.stringify(body)); };
const readBody = (req) => new Promise((ok) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch { ok({}); } }); });

async function userFor(req) {
  const h = req.headers.authorization ?? "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!tok) return null;
  try { const { payload } = await jwtVerify(tok, SECRET); return payload.role === "authenticated" ? payload : null; } catch { return null; }
}
async function issue(user) {
  const now = Math.floor(Date.now() / 1000);
  const access_token = await new SignJWT({ role: "authenticated", email: user.email, aud: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt(now).setExpirationTime(now + 3600).sign(SECRET);
  return { access_token, refresh_token: `local.${user.id}`, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user: { id: user.id, aud: "authenticated", role: "authenticated", email: user.email, user_metadata: { full_name: user.name, display_name: user.name }, app_metadata: { provider: "email" } } };
}

async function asCaller(user, fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SET LOCAL ROLE ${user ? "authenticated" : "anon"}`);
    await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [user?.sub ?? ""]);
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
}

function pgError(res, e) {
  const code = e.code ?? "XX000";
  const status = code === "42501" ? 403 : code === "42883" || code === "42P01" ? 404 : code.startsWith("22") || code.startsWith("23") ? 400 : 500;
  send(res, status, { code, message: e.message, details: null, hint: null });
}

/* Turn a JSON value into a text literal Postgres can resolve against the function's own argument types. */
function lit(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return `{${v.map((x) => (x === null ? "NULL" : `"${String(x).replace(/["\\]/g, "\\$&")}"`)).join(",")}}`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);
  const url = new URL(req.url, "http://local");
  try {
    if (url.pathname === "/auth/v1/token") {
      const body = await readBody(req);
      let row;
      if (url.searchParams.get("grant_type") === "refresh_token") {
        const id = String(body.refresh_token ?? "").replace(/^local\./, "");
        row = (await pool.query("SELECT id, email, name FROM local_demo.accounts WHERE id::text = $1", [id])).rows[0];
      } else {
        if (body.password !== PASSWORD) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
        row = (await pool.query("SELECT id, email, name FROM local_demo.accounts WHERE email = $1", [String(body.email ?? "").toLowerCase()])).rows[0];
      }
      if (!row) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
      return send(res, 200, await issue(row));
    }
    if (url.pathname === "/auth/v1/user") {
      const u = await userFor(req);
      if (!u) return send(res, 401, { message: "Not signed in" });
      const row = (await pool.query("SELECT id, email, name FROM local_demo.accounts WHERE id = $1", [u.sub])).rows[0];
      return send(res, 200, { id: u.sub, aud: "authenticated", role: "authenticated", email: row?.email, user_metadata: { full_name: row?.name, display_name: row?.name } });
    }
    if (url.pathname === "/auth/v1/logout") return send(res, 204);

    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/);
    if (rpc && req.method === "POST") {
      const user = await userFor(req), body = await readBody(req);
      const keys = Object.keys(body).filter((k) => IDENT.test(k));
      const sql = `SELECT to_jsonb(public.${rpc[1]}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})) AS v`;
      const out = await asCaller(user, (c) => c.query(sql, keys.map((k) => lit(body[k]))));
      return send(res, 200, out.rows[0]?.v ?? null);
    }
    const tbl = url.pathname.match(/^\/rest\/v1\/([a-z_][a-z0-9_]*)$/);
    if (tbl && req.method === "GET") {
      const user = await userFor(req);
      const cols = (url.searchParams.get("select") ?? "*").split(",").map((c) => c.trim()).filter((c) => c === "*" || IDENT.test(c));
      const where = [], args = [];
      for (const [k, v] of url.searchParams) {
        if (!IDENT.test(k) || ["select", "limit", "order", "offset"].includes(k)) continue;
        const m = v.match(/^(eq|neq|gt|lt|gte|lte|is)\.(.*)$/);
        if (!m) continue;
        const op = { eq: "=", neq: "<>", gt: ">", lt: "<", gte: ">=", lte: "<=" }[m[1]];
        if (m[1] === "is") where.push(`${k} IS ${m[2] === "null" ? "NULL" : "NOT NULL"}`); else { args.push(m[2]); where.push(`${k}::text ${op} $${args.length}`); }
      }
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 1000);
      const sql = `SELECT coalesce(jsonb_agg(t), '[]') AS v FROM (SELECT ${cols.join(", ")} FROM public.${tbl[1]}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} LIMIT ${limit}) t`;
      const out = await asCaller(user, (c) => c.query(sql, args));
      return send(res, 200, out.rows[0].v);
    }
    console.log("404", req.method, url.pathname); send(res, 404, { message: "Not available in the local One Health API" });
  } catch (e) { pgError(res, e); }
}).listen(PORT, () => console.log(`One Health local API on http://localhost:${PORT}`));
