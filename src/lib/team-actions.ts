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
