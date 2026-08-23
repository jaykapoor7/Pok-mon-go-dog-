"use client";

import { getSupabase } from "./supabase";

export interface OrgMember {
  user_id: string;
  role: string;
  name: string;
}

export async function getMyOrgMembers(): Promise<OrgMember[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa.rpc("my_org_members");
  return (data ?? []).map((r: any) => ({ user_id: r.user_id, role: r.role ?? "member", name: r.name ?? "Member" }));
}

export async function setMemberRole(userId: string, role: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("set_member_role", { p_user_id: userId, p_role: role });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function addOrgMember(email: string, role = "member"): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  const { data, error } = await supa.rpc("add_org_member", { p_email: email, p_role: role });
  if (error) throw new Error(error.message);
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) throw new Error(res?.error ?? "Could not add member.");
}

export interface Volunteer {
  id: string;
  name: string;
  contact: string;
  message: string | null;
  zone: string | null;
  dog_id: string | null;
  created_at: string;
}

export async function getOrgVolunteers(): Promise<Volunteer[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa.rpc("org_volunteers");
  return (data ?? []) as Volunteer[];
}

export async function removeOrgMember(userId: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("remove_org_member", { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data === true;
}
