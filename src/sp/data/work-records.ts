"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO record tools: writes with an honest receipt.

   Publishing a case story goes through the existing server route
   (POST /api/partner/stories), which checks the caller is a member of
   the organisation that owns the case and that the case is resolved or
   closed. Nothing here simulates success: not connected, signed out or
   refused are all failures the person sees.
   ════════════════════════════════════════════════════════════════════ */

import { getSupabase } from "@/lib/supabase";
import { run, type Receipt } from "./work";

export type StoryStage = { label: string; date: string };
export type StoryInput = { caseId: string; title: string; publicSummary: string; locationLabel: string; stages: StoryStage[] };

export async function publishStory(v: StoryInput): Promise<Receipt & { id?: string }> {
  let id: string | null = null;
  const r = await run(`story:${v.caseId}`, "Published to the public story feed. Private notes and reporter details were not included.", async () => {
    const supa = getSupabase()!;
    const token = (await supa.auth.getSession()).data.session?.access_token;
    if (!token) return { ok: false, error: "You are signed out. Sign in again; nothing was published." };
    const res = await fetch("/api/partner/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(v),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok) return { ok: false, error: data.error || `The server refused it (${res.status}). Nothing was published.` };
    id = data.id ?? null;
    return true;
  });
  return r.ok && id ? { ...r, id } : r;
}
