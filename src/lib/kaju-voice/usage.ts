import "server-only";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { VoiceError, type VoiceAccess } from "./access";
import { voiceMode } from "./deployment";
import { getSupabaseAdmin } from "@/lib/supabase";

type Entry = {
  at: number; id: string; actorId: string; scope: VoiceAccess["scope"]; auth: VoiceAccess["auth"];
  event: "reserved" | "issued" | "failed" | "client_connected" | "client_ended";
  referenceId?: string; version?: number; audioSent?: boolean; audioReceived?: boolean; interrupted?: boolean;
};

/** next dev only: durable session grants, not a billing ledger. Hosted
 * deployments never write here; they use the shared database adapter below. */
export class LocalVoiceUsage {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private root = join(process.cwd(), ".local", "kaju-voice")) {}
  private file(now: number) { return join(this.root, `${new Date(now).toISOString().slice(0, 10)}.jsonl`); }
  private lock<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.pending.then(fn); this.pending = result.catch(() => {}); return result;
  }
  private async rows(now: number): Promise<Entry[]> {
    try {
      const raw = await readFile(this.file(now), "utf8");
      if (raw.length > 5_000_000) throw Error("Usage ledger too large");
      return raw.split("\n").filter(Boolean).map((line) => {
        const entry = JSON.parse(line) as Entry;
        if (!entry || typeof entry.at !== "number" || typeof entry.id !== "string" || typeof entry.actorId !== "string" || !entry.scope?.id) throw Error("Invalid usage entry");
        return entry;
      });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new VoiceError("Voice usage could not be checked. Try again after the local ledger is repaired.", 503);
    }
  }
  private async append(row: Entry) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await appendFile(this.file(row.at), `${JSON.stringify(row)}\n`, { mode: 0o600 });
  }
  reserve(access: VoiceAccess, version: number, now = Date.now()) {
    return this.lock(async () => {
      const rows = (await this.rows(now)).filter((r) => r.event === "reserved");
      const own = rows.filter((r) => r.actorId === access.actorId);
      const recent = [...await this.rows(now - 86_400_000), ...rows].filter((r) => r.event === "reserved" && r.actorId === access.actorId && now - r.at < 60_000);
      if (recent.length >= 5 || own.length >= 20) throw new VoiceError("Voice test limit reached. Try again later.", 429);
      if (rows.filter((r) => r.scope.kind === access.scope.kind && r.scope.id === access.scope.id).length >= 100) throw new VoiceError("This workspace's daily voice test limit has been reached.", 429);
      const id = randomUUID();
      await this.append({ actorId: access.actorId, auth: access.auth, scope: access.scope, at: now, id, event: "reserved", version });
      return id;
    });
  }
  issued(access: VoiceAccess, id: string, referenceId: string, now = Date.now()) {
    return this.append({ ...access, at: now, id, referenceId, event: "issued" });
  }
  failed(access: VoiceAccess, id: string, now = Date.now()) { return this.append({ ...access, at: now, id, event: "failed" }); }
  report(access: VoiceAccess, referenceId: string, event: "client_connected" | "client_ended", flags: { audioSent: boolean; audioReceived: boolean; interrupted: boolean }, now = Date.now()) {
    return this.lock(async () => {
      const rows = [...await this.rows(now - 86_400_000), ...await this.rows(now)];
      const grant = rows.find((r) => r.event === "issued" && r.referenceId === referenceId && r.actorId === access.actorId && r.scope.kind === access.scope.kind && r.scope.id === access.scope.id);
      if (!grant) throw new VoiceError("That voice session is not available to your account.", 403);
      if (rows.some((r) => r.id === grant.id && r.event === event)) return;
      await this.append({ actorId: access.actorId, auth: access.auth, scope: access.scope, ...flags, at: now, id: grant.id, referenceId, event });
    });
  }
}

export const voiceUsage = new LocalVoiceUsage();

/** Caller-scoped database adapter, shared across Vercel instances: the
 * production database in production, staging in the preview. Hosted modes
 * never fall back to the instance's filesystem, which is neither shared nor
 * durable. Session grants only; not a billing ledger. */
export function usageForVoiceAccess(access: VoiceAccess, env: Record<string, string | undefined> = process.env, admin: () => ReturnType<typeof getSupabaseAdmin> = getSupabaseAdmin) {
  if (access.auth === "public") return publicUsage(access, admin);
  if (!access.db) {
    if (voiceMode(env) === "local") return voiceUsage;
    throw new VoiceError("Kaju Voice is not available right now.", 503);
  }
  const db = access.db;
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(name, args);
    if (error) {
      const text = `${error.message ?? ""} ${error.code ?? ""}`;
      if (text.includes("VOICE_LIMIT")) throw new VoiceError("Too many Kaju Voice conversations have been started. Try again later.", 429);
      if (text.includes("VOICE_ACCESS_DENIED")) throw new VoiceError("Kaju Voice is not available for your account yet.", 403);
      throw new VoiceError("Kaju Voice is not available right now. Try again in a moment.", 503);
    }
    if (data === false) throw new VoiceError("That voice session is not available to your account.", 403);
    return data;
  };
  return {
    reserve: (_access: VoiceAccess, version: number) => rpc("kaju_voice_reserve", { p_version: version }) as Promise<string>,
    issued: (_access: VoiceAccess, id: string, referenceId: string) => rpc("kaju_voice_update", { p_id: id, p_event: "issued", p_reference: referenceId }),
    failed: (_access: VoiceAccess, id: string) => rpc("kaju_voice_update", { p_id: id, p_event: "failed" }),
    report: (_access: VoiceAccess, referenceId: string, event: string, flags: { audioSent: boolean; audioReceived: boolean; interrupted: boolean }) => rpc("kaju_voice_update", { p_reference: referenceId, p_event: event, p_flags: flags }),
  };
}

/** Public conversations: the row was reserved when the session token was
 * minted. "claim" makes the token sign at most one provider session, before
 * the provider is called. Service role only; nothing here is reachable by a
 * browser's own Supabase key. */
function publicUsage(access: VoiceAccess, admin: () => ReturnType<typeof getSupabaseAdmin>) {
  const db = admin();
  if (!db || access.scope.kind !== "public") throw new VoiceError("Kaju Voice is not available right now.", 503);
  const sid = access.scope.id;
  const rpc = async (args: Record<string, unknown>) => {
    const { data, error } = await db.rpc("kaju_voice_public_update", { p_id: sid, ...args });
    if (error) throw new VoiceError("Kaju Voice is not available right now. Try again in a moment.", 503);
    if (data !== true) throw new VoiceError("This conversation has expired. Start again.", 403);
    return data;
  };
  return {
    reserve: async (_access: VoiceAccess, _version: number) => { await rpc({ p_event: "claim" }); return sid; },
    issued: (_access: VoiceAccess, _id: string, referenceId: string) => rpc({ p_event: "issued", p_reference: referenceId }),
    failed: (_access: VoiceAccess, _id: string) => rpc({ p_event: "failed" }),
    report: (_access: VoiceAccess, referenceId: string, event: string, flags: { audioSent: boolean; audioReceived: boolean; interrupted: boolean }) => rpc({ p_event: event, p_reference: referenceId, p_flags: flags }),
  };
}
