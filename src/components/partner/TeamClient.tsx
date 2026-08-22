"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, Check, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrgMembers, setMemberRole, addOrgMember, removeOrgMember, type OrgMember } from "@/lib/team-actions";
import { cn } from "@/lib/utils";

const ROLES = [
  { key: "member", label: "Member" },
  { key: "field_worker", label: "Field worker" },
  { key: "admin", label: "Admin" },
];

export function TeamClient() {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => getMyOrgMembers().then(setMembers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  // Only the team lead (admin) manages members. Bootstrap: if no admin exists
  // yet, any member can manage (so a fresh org isn't locked out).
  const myRole = members.find((mm) => mm.user_id === user?.id)?.role;
  const hasAdmin = members.some((mm) => mm.role === "admin");
  const canManage = myRole === "admin" || !hasAdmin;

  async function change(userId: string, role: string) {
    setBusy(userId);
    try { await setMemberRole(userId, role); await load(); } finally { setBusy(null); }
  }
  async function remove(userId: string) {
    setBusy(userId);
    try { await removeOrgMember(userId); await load(); } finally { setBusy(null); }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Team</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">Add members, set roles, and manage who works in your organization.</p>
      </header>

      {canManage ? (
        <AddMember onDone={load} />
      ) : (
        <p className="mb-5 rounded-lg border border-black/[0.08] bg-bark-50 px-4 py-3 text-[13px] text-bark-500 dark:border-white/[0.1] dark:bg-white/[0.02]">
          Only your organization&apos;s team lead (admin) can add or manage members.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-12 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No members yet.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-0 dark:border-white/[0.06]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bark-100 text-[12px] font-semibold text-bark-500 dark:bg-bark-800">{m.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">
                {m.name}{m.user_id === user?.id ? " (you)" : ""}
              </span>
              {!canManage ? (
                <span className="rounded-full bg-bark-100 px-2 py-0.5 text-[12px] font-medium capitalize text-bark-500 dark:bg-bark-800">{m.role.replace("_", " ")}</span>
              ) : busy === m.user_id ? <Loader2 className="h-4 w-4 animate-spin text-bark-400" /> : (
                <div className="flex items-center gap-1">
                  {ROLES.map((r) => (
                    <button key={r.key} onClick={() => change(m.user_id, r.key)} className={cn("rounded-md px-2 py-1 text-[12px] font-medium", m.role === r.key ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04]")}>
                      {r.label}
                    </button>
                  ))}
                  {m.user_id !== user?.id && (
                    <button onClick={() => remove(m.user_id)} className="ml-1 grid h-7 w-7 place-items-center rounded-md text-bark-400 hover:bg-status-injured/10 hover:text-status-injured" title="Remove from org">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[12px] text-bark-400">
        Members must have signed in to StrayPaw at least once (magic link) before you can add them by email.
      </p>
    </div>
  );
}

function AddMember({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit() {
    if (!email.trim()) return;
    setBusy(true); setError(null); setOk(false);
    try {
      await addOrgMember(email.trim(), role);
      setEmail(""); setOk(true); onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add member.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-5 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-bark-700 dark:text-bark-200"><UserPlus className="h-4 w-4 text-paw-600" /> Add a member</p>
      <div className="flex flex-wrap items-center gap-2">
        <input value={email} onChange={(e) => { setEmail(e.target.value); setOk(false); }} placeholder="teammate@email.com" className="min-w-0 flex-1 rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-sm outline-none dark:border-white/[0.12]">
          {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <button onClick={submit} disabled={busy || !email.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} Add
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-status-injured">{error}</p>}
    </div>
  );
}
