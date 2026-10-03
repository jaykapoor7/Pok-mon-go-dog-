"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Check, Circle, CalendarClock } from "lucide-react";
import { getMyTasks, createTask, setTaskStatus, assignTask, type Task } from "@/lib/task-actions";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { formatDate } from "@/lib/utils";
import "./field.css";

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
    <section className="fw-sec" aria-labelledby="fw-tasks-h">
      <header className="fw-head">
        <h2 id="fw-tasks-h">Tasks{open.length ? <span className="sys-mono">{open.length}</span> : null}</h2>
        <button type="button" className="fw-act" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>
          <Plus size={15} aria-hidden /> {adding ? "Close" : "New task"}
        </button>
      </header>

      {adding && <AddTask members={members} onDone={() => { setAdding(false); load(); }} />}

      {loading ? (
        <p className="fw-wait" role="status"><Loader2 size={16} className="fw-spin" aria-hidden /> Reading tasks…</p>
      ) : shown.length === 0 ? (
        <p className="fw-empty">No open tasks. Add one to give someone on the team a job with a date.</p>
      ) : (
        <ul className="fw-list">
          {shown.map((t) => {
            const overdue = t.due_at && new Date(t.due_at) < new Date();
            return (
              <li key={t.id}>
                <button type="button" onClick={() => complete(t.id)} disabled={busy === t.id} className="fw-tick" aria-label={`Mark "${t.title}" done`}>
                  {busy === t.id ? <Loader2 size={16} className="fw-spin" aria-hidden /> : <Circle size={16} aria-hidden />}
                </button>
                <span className="fw-what">
                  <b>{t.title}</b>
                  {t.due_at && <small className={overdue ? "is-late" : ""}><CalendarClock size={12} aria-hidden /> {overdue ? "Overdue · " : "Due "}{formatDate(t.due_at)}</small>}
                </span>
                <label className="fw-who">
                  <span className="sys-sr">Assigned to</span>
                  <select value={t.assignee_id ?? ""} onChange={(e) => e.target.value && reassign(t.id, e.target.value)}>
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                  </select>
                </label>
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
    <div className="fw-add">
      <label className="is-wide"><span>Task</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Recheck the dog with the leg wound at Gandhipuram" /></label>
      <label><span>Assign to</span>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Nobody yet</option>
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
        </select>
      </label>
      <label><span>Due</span><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <button type="button" className="sys-btn is-sm" onClick={submit} disabled={busy || !title.trim()}>
        {busy ? <Loader2 size={15} className="fw-spin" aria-hidden /> : <Check size={15} aria-hidden />} Add task
      </button>
    </div>
  );
}
