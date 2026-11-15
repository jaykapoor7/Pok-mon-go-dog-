"use client";

/* ════════════════════════════════════════════════════════════════════
   Trust console · talking to the operator routes.

   Every read and write goes to the existing /api/admin/* routes with the
   moderation password as a Bearer token, exactly as 1.0 did; the server
   checks it on every request. Nothing here decides anything: a read is
   either what the server returned or "Not read" with the server's own
   words, and a write returns a receipt carrying the server's answer.

   The receipt has the same shape as sp/data/work.ts `Receipt`. That
   module's `run()` needs a Supabase client; these are plain HTTP calls
   to service-role routes, so the console carries its own small helper.
   ════════════════════════════════════════════════════════════════════ */

export const KEY = "straypaw.admin_secret";

export type Receipt = { ok: true; at: string; what: string } | { ok: false; error: string };
/** A receipt plus the HTTP status and the parsed body, for callers that need them. */
export type Answer<T = Record<string, unknown>> = Receipt & { status: number; body: T };

/** A read from one route: never "empty" when it was really "not read". */
export type Read<T> =
  | { state: "reading"; data?: T }
  | { state: "read"; data: T; at: string }
  | { state: "failed"; error: string; status: number; data?: T };

const authHeaders = (secret: string, json: boolean): HeadersInit =>
  json ? { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" } : { Authorization: `Bearer ${secret}` };

/** Parse a response body without trusting it to be JSON. */
export async function parse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch {
    return { error: res.status >= 500 || res.status === 408 ? `The server interrupted this request (${res.status}). Anything already saved is kept; read again before retrying.` : `The server returned an unreadable answer (${res.status}).` };
  }
}

function errorOf(status: number, body: Record<string, unknown>): string {
  const e = typeof body.error === "string" ? body.error : null;
  if (e) return status === 401 ? `${e} (401). The server refused the password; nothing changed.` : e;
  if (status === 401) return "The server refused the password (401). Nothing changed.";
  return `The server answered ${status}. Nothing changed.`;
}

/** GET one route. */
export async function get<T>(secret: string, path: string, pick: (body: Record<string, unknown>) => T): Promise<Read<T>> {
  let res: Response;
  try { res = await fetch(path, { headers: authHeaders(secret, false), cache: "no-store" }); }
  catch { return { state: "failed", status: 0, error: "The server could not be reached." }; }
  const body = await parse(res);
  if (!res.ok) return { state: "failed", status: res.status, error: typeof body.error === "string" ? body.error : `The server answered ${res.status}.` };
  return { state: "read", data: pick(body), at: new Date().toISOString() };
}

const inflight = new Set<string>();

/** Send one write and return the server's answer as a receipt. A second
 *  tap on a write already in flight is refused here, not sent twice. */
export async function send<T = Record<string, unknown>>(
  secret: string,
  key: string,
  path: string,
  init: { method?: "POST" | "PATCH"; json?: unknown; form?: FormData },
  what: string | ((body: T) => string),
): Promise<Answer<T>> {
  if (inflight.has(key)) return { ok: false, error: "Already sending this. Wait for the answer.", status: 0, body: {} as T };
  inflight.add(key);
  try {
    let res: Response;
    try {
      res = await fetch(path, {
        method: init.method ?? "POST",
        headers: authHeaders(secret, init.form === undefined),
        body: init.form ?? JSON.stringify(init.json ?? {}),
      });
    } catch {
      return { ok: false, error: "No answer from the server. The change may or may not have been made: read the section again before retrying.", status: 0, body: {} as T };
    }
    const body = (await parse(res)) as T & Record<string, unknown>;
    if (!res.ok) return { ok: false, error: errorOf(res.status, body), status: res.status, body };
    /* Some routes answer 200 with { ok: false } (a code that was already off,
       an RPC that refused). That is not a success, whatever the status. */
    if (body.ok === false) return { ok: false, error: typeof body.error === "string" ? body.error : "The server answered but did not confirm the change. Read again to see what is recorded.", status: res.status, body };
    return { ok: true, at: new Date().toISOString(), what: typeof what === "function" ? what(body) : what, status: res.status, body };
  } finally {
    inflight.delete(key);
  }
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function rememberKey(s: string) { try { localStorage.setItem(KEY, s); } catch { /* storage blocked: the session still works */ } }
export function forgetKey() { try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } }
export function savedKey(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
