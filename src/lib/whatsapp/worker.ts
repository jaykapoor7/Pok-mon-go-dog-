import type { SupabaseClient } from "@supabase/supabase-js";
import { staffCommand } from "./commands";
import { downloadMedia, MetaError, sendMeta, type Outbound } from "./transport";
import { transcribeVoice, extractReport } from "./intelligence";
import type { Inbound } from "./protocol";

export async function rpc<T>(db: SupabaseClient, name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`database_${error.code || "unavailable"}`);
  return data as T;
}
type Job = { id: string; lease: string; kind: string; payload: Inbound };

export async function runWorker(db: SupabaseClient, budgetMs = 45000) {
  const start = Date.now(); const summary = { processed: 0, failed: 0, sent: 0, blocked: 0 };
  await rpc(db, "careos_automations");
  while (Date.now() - start < budgetMs - 12000) {
    const jobs = await rpc<Job[]>(db, "careos_claim_jobs", { p_limit: 1 });
    if (!jobs.length) break;
    const job = jobs[0]; const m = job.payload;
    try {
      const enriched: Record<string, unknown> = {};
      if (job.kind === "message") {
        enriched.command = staffCommand(m.text);
        const context = await rpc<{ consent: boolean; step: string; count: number; staff: boolean }>(db, "careos_enrichment_context", { p_phone: m.from });
        // Never send media to AI or download it before consent; staff commands stay deterministic.
        if (context?.consent && context.count < 30 && ["description", "location", "urgency", "confirm"].includes(context.step) && m.mediaId) {
          const media = await downloadMedia(m.mediaId, m.id);
          const { error } = await db.storage.from("careos-private").upload(media.path, media.bytes, { contentType: media.mime, upsert: false });
          if (error && !["409", "Duplicate"].includes(String((error as { statusCode?: string }).statusCode)) && !error.message.includes("already exists")) throw new Error("storage_upload_failed");
          enriched.media = { id: m.mediaId, path: media.path, mime: media.mime, kind: m.mediaKind, url: `/api/whatsapp/media/${m.mediaId}`, sensitive: true };
          if (m.mediaKind === "audio" && context.step === "description") {
            try { enriched.transcript = await transcribeVoice(media.bytes); } catch { /* Ask for typed words if AI is unavailable. */ }
          }
        }
        const words = m.text || String(enriched.transcript || "");
        if (context?.consent && context.step === "description" && !context.staff && words) {
          try { enriched.extraction = await extractReport(words); } catch { /* Preserve original report and confirm it. */ }
        }
      }
      await rpc(db, "careos_process_job", { p_id: job.id, p_lease: job.lease, p_enriched: enriched }); summary.processed++;
    } catch (error) {
      await rpc(db, "careos_fail_job", { p_id: job.id, p_lease: job.lease, p_error: error instanceof MetaError ? error.code : "processing_failed" }); summary.failed++;
    }
  }
  // Missing credentials leave unsent work durably pending, rather than losing it.
  if (!process.env.WHATSAPP_ACCESS_TOKEN) return summary;
  while (Date.now() - start < budgetMs - 5000) {
    const rows = await rpc<Outbound[]>(db, "careos_claim_outbox", { p_limit: 1 });
    if (!rows.length) break;
    const row = rows[0];
    let result: { state: string; metaId?: string; error?: string };
    try { result = await sendMeta(row); }
    catch (e) { result = { state: e instanceof MetaError && e.uncertain ? "uncertain" : e instanceof MetaError && e.retryable ? "pending" : "failed", error: e instanceof MetaError ? e.code : "send_failed" }; }
    await rpc(db, "careos_finish_outbox", { p_id: row.id, p_lease: row.lease, p_state: result.state, p_meta_id: result.metaId || null, p_error: result.error || null });
    if (result.state === "sent") summary.sent++; else summary.blocked++;
  }
  return summary;
}
