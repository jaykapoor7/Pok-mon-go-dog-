"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

/* Messages, reactions, files, mentions, edits, search and record threads. Every read and write goes through the
   person's own session; the database decides who can read a channel, so a file, a mention or a search result never
   reaches someone who cannot read the channel it came from. Reads fall back to the earlier columns where the newer
   ones are not on this database yet, so channels keep working while it is updated. */

export type FileRef = { path: string; name: string; size?: number; mime?: string };
export type Msg = {
  id: string; channel_id: string; parent_id: string | null; author_id: string | null; author_kind: "person" | "kaju"; author_name: string | null; body: string;
  record_kind: string | null; record_id: string | null; record_label: string | null; proposal: { tasks: string[] } | null; created_at: string;
  edited_at: string | null; deleted_at: string | null; mentions: string[]; files: FileRef[];
};
const FULL = "id,channel_id,parent_id,author_id,author_kind,author_name,body,record_kind,record_id,record_label,proposal,created_at,edited_at,deleted_at,mentions,files";
const BASIC = "id,channel_id,parent_id,author_id,author_kind,author_name,body,record_kind,record_id,record_label,proposal,created_at,edited_at,deleted_at";
let full = true;
const norm = (r: Partial<Msg>): Msg => ({ mentions: [], files: [], edited_at: null, deleted_at: null, record_kind: null, record_id: null, ...r } as Msg);
const missingColumn = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42703" || /column .* does not exist/i.test(e.message ?? ""));

/** Messages in a channel (or one record's thread), oldest first, live as they arrive, with edits and deletions applied. */
export function useChannelMessages(channelId: string | null, record?: { kind: string; id: string } | null) {
  const [rows, setRows] = useState<Msg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const rk = record ? `${record.kind}:${record.id}` : "";
  useEffect(() => {
    const db = getSupabase(); if (!db || !channelId) { setRows(null); return; }
    let alive = true;
    const q = (cols: string) => { let x = db.from("nx_messages").select(cols).eq("channel_id", channelId); if (record) x = x.eq("record_kind", record.kind).eq("record_id", record.id); return x.order("created_at").limit(300); };
    void (async () => {
      let r = await q(full ? FULL : BASIC);
      if (missingColumn(r.error)) { full = false; r = await q(BASIC); }
      if (!alive) return;
      if (r.error) setError(r.error.message); else { setError(null); setRows(((r.data ?? []) as Partial<Msg>[]).map(norm)); }
    })();
    const sub = db.channel(`nx:${channelId}:${rk}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nx_messages", filter: `channel_id=eq.${channelId}` }, (p) => { const m = norm(p.new as Partial<Msg>); if (record && (m.record_kind !== record.kind || m.record_id !== record.id)) return; setRows((rs) => (rs && !rs.some((x) => x.id === m.id) ? [...rs, m] : rs)); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "nx_messages", filter: `channel_id=eq.${channelId}` }, (p) => { const m = norm(p.new as Partial<Msg>); setRows((rs) => rs?.map((x) => (x.id === m.id ? { ...x, ...m } : x)) ?? rs); })
      .subscribe();
    return () => { alive = false; void db.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, rk, tick]);
  return { rows, setRows, error, reload };
}

export async function sendMessage(channelId: string, body: string, opts: { authorName: string | null; parentId?: string | null; mentions?: string[]; files?: FileRef[]; record?: { kind: string; id: string; label: string } | null }) {
  const db = getSupabase()!;
  const row: Record<string, unknown> = { channel_id: channelId, body, author_name: opts.authorName, parent_id: opts.parentId ?? null };
  if (opts.record) Object.assign(row, { record_kind: opts.record.kind, record_id: opts.record.id, record_label: opts.record.label.slice(0, 160) });
  if (full && (opts.mentions?.length || opts.files?.length)) Object.assign(row, { mentions: opts.mentions ?? [], files: opts.files ?? [] });
  const r = await db.from("nx_messages").insert(row).select(full ? FULL : BASIC).single();
  return { data: r.data ? norm(r.data as Partial<Msg>) : null, error: r.error };
}
export const editMessage = async (id: string, body: string) => await getSupabase()!.rpc("nx_edit_message", { p_message: id, p_body: body });
export const deleteMessage = async (id: string) => await getSupabase()!.rpc("nx_delete_message", { p_message: id });

/* ── Reactions ─────────────────────────────────────────────────────── */
export const EMOJI = ["👍", "✅", "👀", "🙏", "❤️", "🎉", "⚠️", "❓"] as const;
export type Reaction = { message_id: string; user_id: string; emoji: string };
export function useReactions(ids: string[]) {
  const [rows, setRows] = useState<Reaction[]>([]);
  const key = ids.join(",");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const db = getSupabase(); if (!db || !ids.length) { setRows([]); return; }
    let alive = true;
    void db.from("nx_reactions").select("message_id,user_id,emoji").in("message_id", ids.slice(-300)).then(({ data }) => { if (alive) setRows((data ?? []) as Reaction[]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const toggle = useCallback(async (messageId: string, emoji: string, me: string | null) => {
    const db = getSupabase()!; if (!me) return { error: { message: "Sign in again." } };
    const mine = rows.some((r) => r.message_id === messageId && r.emoji === emoji && r.user_id === me);
    setRows((rs) => (mine ? rs.filter((r) => !(r.message_id === messageId && r.emoji === emoji && r.user_id === me)) : [...rs, { message_id: messageId, user_id: me, emoji }]));
    const r = mine ? await db.from("nx_reactions").delete().eq("message_id", messageId).eq("emoji", emoji).eq("user_id", me) : await db.from("nx_reactions").insert({ message_id: messageId, emoji });
    if (r.error) setTick((n) => n + 1);
    return r;
  }, [rows]);
  return { rows, toggle };
}

/* ── Files ─────────────────────────────────────────────────────────── */
export const FILE_TYPES = "image/jpeg,image/png,image/webp,image/heic,application/pdf,text/csv,text/plain,audio/webm,audio/mpeg,audio/mp4,audio/ogg,.xlsx,.docx";
export const MAX_FILE = 10 * 1024 * 1024;
/** Upload into the channel's folder of the private bucket. Readable only by people who can read the channel. */
export async function uploadFile(channelId: string, f: File): Promise<{ file?: FileRef; error?: string }> {
  if (f.size > MAX_FILE) return { error: `${f.name} is larger than 10 MB.` };
  const safe = f.name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").slice(-120) || "file";
  const path = `${channelId}/${crypto.randomUUID()}/${safe}`;
  const r = await getSupabase()!.storage.from("nx-files").upload(path, f, { contentType: f.type || undefined, upsert: false });
  if (r.error) return { error: /bucket|not found/i.test(r.error.message) ? "Files are not set up on this database yet." : `${f.name} could not be uploaded: ${r.error.message}` };
  return { file: { path, name: f.name.slice(0, 160), size: f.size, mime: f.type || undefined } };
}
/** A short-lived link to open a file. It works only for someone who can read the channel. */
export async function fileLink(path: string) { const r = await getSupabase()!.storage.from("nx-files").createSignedUrl(path, 300); return r.data?.signedUrl ?? null; }

/* ── Search, programme channels, record threads ───────────────────── */
export type Hit = { id: string; channel_id: string; channel_name: string; channel_kind: string; body: string; author_name: string | null; created_at: string; record_label: string | null };
export async function searchMessages(q: string): Promise<Hit[]> {
  if (q.trim().length < 2) return [];
  const r = await getSupabase()!.rpc("nx_search_messages", { p_q: q.trim().slice(0, 200), p_limit: 20 });
  return r.error ? [] : (r.data as Hit[]);
}
export type ProgrammeChannel = { id: string; name: string; topic: string | null; programme_id: string; programme_name: string };
export function useProgrammeChannels(enabled: boolean) {
  const [rows, setRows] = useState<ProgrammeChannel[] | null>(null);
  useEffect(() => { const db = getSupabase(); if (!db || !enabled) return; let alive = true; void db.rpc("nx_my_programme_channels").then(({ data, error }) => { if (alive) setRows(error ? [] : (data ?? []) as ProgrammeChannel[]); }); return () => { alive = false; }; }, [enabled]);
  return rows;
}
/** The organisation's record-thread channel: one for every record, so no channel is made per animal. */
export function useRecordChannel(orgId: string | null) {
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (!orgId || asked.current === orgId) return; asked.current = orgId;
    void getSupabase()?.rpc("nx_record_channel", { p_org: orgId }).then(({ data, error: e }) => { if (e) setError(e.message); else setId(data as string); });
  }, [orgId]);
  return { id, error };
}
/** Mentions in the words: "@Name" for each person in the list, longest names first. */
export function mentionsIn(text: string, people: { user_id: string; name: string }[]) {
  const low = text.toLowerCase();
  return [...new Set([...people].sort((a, b) => b.name.length - a.name.length).filter((p) => p.name.length > 1 && low.includes(`@${p.name.toLowerCase()}`)).map((p) => p.user_id))].slice(0, 20);
}
