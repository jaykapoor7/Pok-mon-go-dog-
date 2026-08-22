"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrgMembers, setMemberRole, type OrgMember } from "@/lib/team-actions";
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

  async function change(userId: string, role: string) {
    setBusy(userId);
    try { await setMemberRole(userId, role); await load(); } finally { setBusy(null); }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Team</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">Your organization&apos;s members and their roles.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-12 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No members found.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-0 dark:border-white/[0.06]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bark-100 text-[12px] font-semibold text-bark-500 dark:bg-bark-800">{m.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">
                {m.name}{m.user_id === user?.id ? " (you)" : ""}
              </span>
              {busy === m.user_id ? <Loader2 className="h-4 w-4 animate-spin text-bark-400" /> : (
                <div className="flex gap-1">
                  {ROLES.map((r) => (
                    <button key={r.key} onClick={() => change(m.user_id, r.key)} className={cn("rounded-md px-2 py-1 text-[12px] font-medium", m.role === r.key ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04]")}>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-black/[0.08] bg-bark-50 p-4 text-[13px] text-bark-500 dark:border-white/[0.1] dark:bg-white/[0.02]">
        <UserPlus className="mt-0.5 h-4 w-4 shrink-0" />
        <p>To add a teammate: have them sign in and request partner access from the app; approve them in moderation, and they&apos;ll appear here.</p>
      </div>
    </div>
  );
}
