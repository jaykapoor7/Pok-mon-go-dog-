import "server-only";

/* Sending consented PEP dose reminders. The database decides what is due and still holds (nx_pep_outbox_due); this
   loop sends each through the clinic's approved SMS template, or records it as not connected when no provider is set
   up, and reports every outcome back (nx_pep_outbox_mark), which sets the wait before a retry. It takes its sender and
   its recorder as arguments, so it is tested without a network or a database. */

export type PepReminder = { id: string; channel: string; phone: string; vars: unknown; attempts: number };
export type PepMark = (id: string, status: "sent" | "retry" | "failed" | "not_connected", error?: string | null, ref?: string | null) => Promise<unknown>;
export type PepSend = (phone: string, vars: string[]) => Promise<{ id?: string | null }>;

/** A reminder is tried this many times in all, then recorded as failed. */
export const PEP_MAX_ATTEMPTS = 5;

export async function deliverPepReminders(rows: PepReminder[], ctx: { smsReady: boolean; send: PepSend; mark: PepMark; deadline: number; now?: () => number }) {
  const out = { due: 0, sent: 0, not_connected: 0, failed: 0 };
  const now = ctx.now ?? Date.now;
  for (const r of rows) {
    if (now() > ctx.deadline) break;
    out.due++;
    if (r.channel !== "sms" || !ctx.smsReady) {
      await ctx.mark(r.id, "not_connected", r.channel === "sms" ? "No approved SMS reminder template is configured." : "WhatsApp is not connected.");
      out.not_connected++;
      continue;
    }
    let ref: string | null = null;
    try {
      ref = (await ctx.send(r.phone, Array.isArray(r.vars) ? r.vars.map(String) : [])).id ?? null;
    } catch (e) {
      await ctx.mark(r.id, r.attempts + 1 >= PEP_MAX_ATTEMPTS ? "failed" : "retry", e instanceof Error ? e.message : "SMS failed");
      out.failed++;
      continue;
    }
    /* Recorded outside the try: a failure to record a send that went out is never taken for a failed send and marked
       for a retry, which would text the patient again. */
    await ctx.mark(r.id, "sent", null, ref);
    out.sent++;
  }
  return out;
}
