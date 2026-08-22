"use client";

import { getSupabase } from "./supabase";
import type { BudgetLine } from "./types";

export interface Actor {
  id: string;
  name: string;
}

export interface CreateFundraiserInput {
  title: string;
  story?: string;
  category: string;
  goalAmount?: number | null;
  donateUrl: string;
  coverPhoto?: string | null;
  deadline?: string | null;
  caseId?: string | null;
}

export async function createFundraiser(
  input: CreateFundraiserInput,
  actor: Actor
): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-fundraiser";
  const { data, error } = await supa.rpc("create_fundraiser", {
    p_title: input.title,
    p_story: input.story || null,
    p_category: input.category,
    p_goal_amount: input.goalAmount ?? null,
    p_donate_url: input.donateUrl,
    p_cover_photo: input.coverPhoto || null,
    p_deadline: input.deadline || null,
    p_actor_id: actor.id,
    p_actor_name: actor.name,
    p_case_id: input.caseId ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export async function updateFundraiser(
  id: string,
  patch: {
    story?: string;
    goalAmount?: number | null;
    raisedReported?: number | null;
    donateUrl?: string;
    deadline?: string | null;
    status?: string;
  }
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("update_fundraiser", {
    p_id: id,
    p_story: patch.story ?? null,
    p_goal_amount: patch.goalAmount ?? null,
    p_raised_reported: patch.raisedReported ?? null,
    p_donate_url: patch.donateUrl ?? null,
    p_deadline: patch.deadline ?? null,
    p_status: patch.status ?? null,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Owner-only: post a progress update (optionally with a photo). */
export async function addFundraiserUpdate(
  fundraiserId: string,
  body: string,
  photoUrl?: string | null
): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-update";
  const { data, error } = await supa.rpc("add_fundraiser_update", {
    p_fundraiser_id: fundraiserId,
    p_body: body,
    p_photo_url: photoUrl ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

/** Owner-only: set the use-of-funds budget and/or the outcome note. */
export async function setFundraiserDetails(
  id: string,
  patch: { budget?: BudgetLine[]; outcome?: string | null }
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("set_fundraiser_details", {
    p_id: id,
    p_budget: patch.budget ?? null,
    p_outcome: patch.outcome ?? null,
  });
  if (error) throw new Error(error.message);
  return data === true;
}
