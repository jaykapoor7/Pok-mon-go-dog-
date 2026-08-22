"use client";

import { getSupabase } from "./supabase";

export interface Task {
  id: string;
  title: string;
  assignee_id: string | null;
  assignee_name: string | null;
  due_at: string | null;
  status: string;
  case_id: string | null;
  animal_id: string | null;
  created_at: string;
}

export async function getMyTasks(): Promise<Task[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("tasks")
    .select("*")
    .order("due_at", { ascending: true, nullsFirst: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, title: r.title, assignee_id: r.assignee_id ?? null, assignee_name: r.assignee_name ?? null,
    due_at: r.due_at ?? null, status: r.status ?? "open", case_id: r.case_id ?? null, animal_id: r.animal_id ?? null, created_at: r.created_at,
  }));
}

export async function createTask(input: {
  title: string; assigneeId?: string | null; assigneeName?: string | null; dueAt?: string | null; caseId?: string | null; animalId?: string | null;
}): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-task";
  const { data, error } = await supa.rpc("create_task", {
    p_title: input.title, p_assignee_id: input.assigneeId ?? null, p_assignee_name: input.assigneeName ?? null,
    p_due_at: input.dueAt ?? null, p_case_id: input.caseId ?? null, p_animal_id: input.animalId ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export async function setTaskStatus(id: string, status: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("set_task_status", { p_id: id, p_status: status });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function assignTask(id: string, assigneeId: string, assigneeName: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("assign_task", { p_id: id, p_assignee_id: assigneeId, p_assignee_name: assigneeName });
  if (error) throw new Error(error.message);
  return data === true;
}
