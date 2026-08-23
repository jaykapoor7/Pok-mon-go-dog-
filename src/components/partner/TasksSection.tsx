"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Check, Circle, CalendarClock } from "lucide-react";
import { getMyTasks, createTask, setTaskStatus, assignTask, type Task } from "@/lib/task-actions";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const INPUT = "rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

export function TasksSection({ compact = false }: { compact?: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => getMyTasks().then(setTasks).finally(() => setLoading(false));
  useEffect(() => { load(); getMyOrgMembers().then(setMembers).catch(() => {}); }, []);

  const open = tasks.filter((t) => t.status !== "done");
  const shown = compact ? open.slice(0, 5) : open;

  async function complete(id: string) {
    setBusy(id);
    try { await setTaskStatus(id, "done"); await load(); } finally { setBusy(null); }
  }
  async function reassign(id: string, userId: string) {
    const m = members.find((x) => x.user_id === userId);
    setBusy(id);
    try { await assignTask(id, userId, m?.name ?? ""); await load(); } finally { setBusy(null); }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-bark-400">
          Tasks{open.length ? ` (${open.length})` : ""}
        </h2>
        <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 rounded-md bg-paw-500 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-paw-600">
          <Plus className="h-3.5 w-3.5" /> New task
        </button>
      </div>

      {adding && <AddTask members={members} onDone={() => { setAdding(false); load(); }} />}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-8 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">
          No open tasks. Create one to assign field work.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {shown.map((t) => {
            const overdue = t.due_at && new Date(t.due_at) < new Date();
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-2.5 last:border-0 dark:border-white/[0.06]">
                <button onClick={() => complete(t.id)} disabled={busy === t.id} className="shrink-0 text-bark-300 hover:text-status-vaccinated" aria-label="Complete">
                  {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{t.title}</p>
                  <p className="flex items-center gap-2 text-[12px] text-bark-400">
                    {t.due_at && <span className={cn("inline-flex items-center gap-1", overdue && "text-status-injured")}><CalendarClock className="h-3 w-3" /> {formatDate(t.due_at)}</span>}
                  </p>
                </div>
                <select
                  value={t.assignee_id ?? ""}
                  onChange={(e) => e.target.value && reassign(t.id, e.target.value)}
                  className="shrink-0 rounded-md border border-black/[0.09] bg-transparent px-2 py-1 text-[12px] outline-none dark:border-white/[0.12]"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function AddTask({ members, onDone }: { members: OrgMember[]; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const m = members.find((x) => x.user_id === assignee);
      await createTask({ title: title.trim(), assigneeId: assignee || null, assigneeName: m?.name ?? null, dueAt: due || null });
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.1]">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task, e.g. Deworm donkeys in Sagroli" className={cn(INPUT, "min-w-0 flex-1")} />
      <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={INPUT}>
        <option value="">Assign to…</option>
        {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
      </select>
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={INPUT} />
      <button onClick={submit} disabled={busy || !title.trim()} className="inline-flex items-center gap-1 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add
      </button>
    </div>
  );
}
