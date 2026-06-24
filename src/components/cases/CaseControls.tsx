"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogIn,
  Hand,
  Play,
  CheckCircle2,
  Lock,
  RotateCcw,
  Archive,
  Loader2,
  Send,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  claimCase,
  updateCaseStatus,
  addCaseNote,
} from "@/lib/case-actions";
import type { Case, CaseResolution, CaseStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const RESOLUTIONS: { key: CaseResolution; label: string }[] = [
  { key: "treated", label: "Treated" },
  { key: "sterilized", label: "Sterilized" },
  { key: "rescued", label: "Rescued" },
];

export function CaseControls({ c }: { c: Case }) {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");

  const actor = user ? { id: user.id, name: user.name } : null;
  const isAssignee = !!actor && c.assignee_id === actor.id;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (res && typeof res === "object" && "ok" in res && !(res as { ok: boolean }).ok) {
        setError((res as { error?: string }).error ?? "Action failed.");
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
      setResolving(false);
    }
  }

  // Not signed in → gate.
  if (!actor) {
    return (
      <div className="card p-4 text-center">
        <p className="text-sm text-bark-500">
          Sign in to claim or update this case.
        </p>
        <button
          onClick={() => requireAuth()}
          className="btn-primary mt-3 w-full py-2.5 text-sm"
        >
          <LogIn className="h-4 w-4" /> Sign in
        </button>
      </div>
    );
  }

  const change = (to: CaseStatus, opts?: { resolution?: CaseResolution; note?: string }) =>
    run(() => updateCaseStatus(c.id, to, actor, opts));

  return (
    <div className="space-y-3">
      {/* primary action depends on lifecycle position */}
      {c.assignee_id === null ? (
        <button
          onClick={() => run(() => claimCase(c.id, actor))}
          disabled={busy}
          className="btn-primary w-full py-3"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hand className="h-4 w-4" />}
          Claim case
        </button>
      ) : isAssignee ? (
        <div className="space-y-2">
          {c.status === "assigned" && (
            <button onClick={() => change("in_progress")} disabled={busy} className="btn-primary w-full py-3">
              <Play className="h-4 w-4" /> Start working
            </button>
          )}

          {c.status === "in_progress" && !resolving && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setResolving(true)} disabled={busy} className="btn-primary py-3">
                <CheckCircle2 className="h-4 w-4" /> Resolve
              </button>
              <button onClick={() => change("closed")} disabled={busy} className="btn-ghost py-3">
                <Archive className="h-4 w-4" /> Close
              </button>
            </div>
          )}

          {c.status === "in_progress" && resolving && (
            <div className="card p-3">
              <p className="mb-2 text-xs font-semibold text-bark-600">Resolution</p>
              <div className="grid grid-cols-3 gap-2">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => change("resolved", { resolution: r.key })}
                    disabled={busy}
                    className="btn-ghost py-2.5 text-xs"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setResolving(false)}
                className="mt-2 w-full text-center text-xs text-bark-400"
              >
                Cancel
              </button>
            </div>
          )}

          {c.status === "resolved" && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => change("closed")} disabled={busy} className="btn-primary py-3">
                <Archive className="h-4 w-4" /> Close case
              </button>
              <button onClick={() => change("in_progress")} disabled={busy} className="btn-ghost py-3">
                <RotateCcw className="h-4 w-4" /> Reopen
              </button>
            </div>
          )}

          {c.status === "closed" && (
            <button onClick={() => change("in_progress")} disabled={busy} className="btn-ghost w-full py-3">
              <RotateCcw className="h-4 w-4" /> Reopen case
            </button>
          )}
        </div>
      ) : (
        <div className="card flex items-center gap-2 p-3 text-sm text-bark-500">
          <Lock className="h-4 w-4 shrink-0" />
          Assigned to{" "}
          <span className="font-semibold text-bark-700 dark:text-bark-200">
            {c.assignee_name}
          </span>
          . Only the assignee can update status.
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-status-injured/10 px-3 py-2 text-center text-sm font-medium text-status-injured">
          {error}
        </p>
      )}

      {/* notes — any signed-in volunteer */}
      <div className="flex items-end gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={1}
          placeholder="Add an update note…"
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
        />
        <button
          onClick={() =>
            run(async () => {
              if (note.trim()) {
                await addCaseNote(c.id, actor, note.trim());
                setNote("");
              }
            })
          }
          disabled={busy || !note.trim()}
          className={cn("btn-ghost h-11 w-11 shrink-0 p-0")}
          aria-label="Add note"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
