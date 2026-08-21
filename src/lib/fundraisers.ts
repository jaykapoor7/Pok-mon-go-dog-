// ─────────────────────────────────────────────────────────────
// Fundraisers data access (read side). Live Supabase when configured; empty
// otherwise. StrayPaw only hosts campaigns + links out to each NGO's own
// donation channel — it never handles money.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from "./supabase";
import type { Fundraiser } from "./types";

function mapFundraiser(r: any): Fundraiser {
  return {
    id: r.id,
    ngo_id: r.ngo_id ?? null,
    title: r.title,
    story: r.story ?? null,
    category: r.category ?? "other",
    goal_amount: r.goal_amount ?? null,
    currency: r.currency ?? "INR",
    donate_url: r.donate_url,
    cover_photo: r.cover_photo ?? null,
    deadline: r.deadline ?? null,
    raised_reported: r.raised_reported ?? null,
    status: r.status ?? "active",
    featured: r.featured ?? false,
    created_by_id: r.created_by_id ?? null,
    created_by_name: r.created_by_name ?? null,
    created_at: r.created_at,
  };
}

export async function getFundraisers(limit = 100): Promise<Fundraiser[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("fundraisers")
    .select("*")
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapFundraiser);
}

/** Active campaigns for one organization (public — for its profile page). */
export async function getFundraisersByOrg(ngoId: string): Promise<Fundraiser[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("fundraisers")
    .select("*")
    .eq("ngo_id", ngoId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapFundraiser);
}

export async function getFundraiserById(id: string): Promise<Fundraiser | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.from("fundraisers").select("*").eq("id", id).maybeSingle();
  return data ? mapFundraiser(data) : null;
}

/** Format an INR amount for display, e.g. ₹12,500. */
export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "";
  return `₹${amount.toLocaleString("en-IN")}`;
}
