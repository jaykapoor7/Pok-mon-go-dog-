import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADAPTERS, ProviderAuthError, need } from "./adapters";
import { accessToken, audit, markStatus } from "./server";
import { PROVIDERS, type ProviderId } from "./providers";

/* Send an approved email as the person who approved it, through their own connected account and only with the
   permission they granted. Used by the delivery worker for Kaju missions; the same checks as /api/connections/act. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export async function sendEmailAs(db: SupabaseClient, userId: string, orgId: string, mail: { to: string; subject: string; body: string }): Promise<{ ok: true; ref: string } | { ok: false; error: string; connected: boolean }> {
  if (!EMAIL.test(mail.to)) return { ok: false, error: "The address is not valid.", connected: true };
  let lastError = "No connected email account with permission to send.";
  for (const p of ["google", "microsoft", "zoho"] as ProviderId[]) {
    if (!PROVIDERS[p].capabilities.includes("mail.send")) continue;
    const t = await accessToken({ userId, email: null, ngoId: orgId, role: null, db }, p);
    if ("error" in t) { lastError = t.error; continue; }
    if (!t.capabilities.includes("mail.send")) { lastError = `${PROVIDERS[p].name} was connected without permission to send.`; continue; }
    const A = ADAPTERS[p];
    const m = { to: [mail.to], cc: [], subject: mail.subject.slice(0, 200), body: mail.body.slice(0, 10_000) };
    try {
      let ref = `${p}-sent`;
      if (p === "zoho") await need(A, "sendDraft")(t.token, JSON.stringify(m));
      else { const d = await need(A, "createDraft")(t.token, m); await need(A, "sendDraft")(t.token, d.id); ref = d.id; }
      await audit({ connection_id: t.connectionId, user_id: userId, ngo_id: orgId, provider: p, action: "email_sent", detail: { recipients: 1, source: "kaju_mission" } });
      return { ok: true, ref };
    } catch (e) {
      // A revoked or expired grant is not a passing fault: mark the connection, and stop retrying until it is reconnected.
      if (e instanceof ProviderAuthError) {
        await markStatus(t.connectionId, "expired", "Access no longer accepted");
        return { ok: false, error: `Reconnect ${PROVIDERS[p].name} in Settings → Connections: it no longer accepts this connection.`, connected: false };
      }
      return { ok: false, error: (e as Error).message.slice(0, 200), connected: true };
    }
  }
  return { ok: false, error: lastError, connected: false };
}
