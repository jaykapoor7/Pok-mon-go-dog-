"use client";

import { useEffect, useState } from "react";
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
  ShieldCheck,
  ShieldQuestion,
  Camera,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  claimCase,
  updateCaseStatus,
  addCaseNote,
  setCaseCost,
} from "@/lib/case-actions";
import { isNgoMember, uploadPhoto } from "@/lib/actions";
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

  // Verified-partner-NGO gate (claim/update is restricted to ngo_members).
  const [ngoMember, setNgoMember] = useState<boolean | null>(null);

  // Cost tracking (handler / NGO member).
  const [costOpen, setCostOpen] = useState(false);
  const [estimate, setEstimate] = useState(c.cost_estimate?.toString() ?? "");
  const [spent, setSpent] = useState(c.cost_spent?.toString() ?? "");

  // Resolution proof.
  const [resolution, setResolution] = useState<CaseResolution | null>(null);
  const [outcomeNote, setOutcomeNote] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [returnedToCatch, setReturnedToCatch] = useState(false);

  const actor = user ? { id: user.id, name: user.name } : null;
  const isAssignee = !!actor && c.assignee_id === actor.id;

  useEffect(() => {
    if (!actor) {
      setNgoMember(null);
      return;
    }
    let alive = true;
    isNgoMember()
      .then((ok) => alive && setNgoMember(ok))
      .catch(() => alive && setNgoMember(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  async function submitResolve() {
    if (!actor) return;
    if (!resolution) return setError("Pick a resolution.");
    if (!afterFile) return setError("An after photo is required to resolve a case.");
    if (!outcomeNote.trim()) return setError("Add a short outcome note.");
    setBusy(true);
    setError(null);
    try {
      const afterUrl = await uploadPhoto(afterFile);
      const beforeUrl = beforeFile ? await uploadPhoto(beforeFile) : null;
      const fullNote =
        outcomeNote.trim() +
        (returnedToCatch ? "\n✓ Returned to the exact catch location." : "");
      const res = await updateCaseStatus(c.id, "resolved", actor, {
        resolution,
        afterUrl,
        beforeUrl,
        outcomeNote: fullNote,
      });
      if (!res.ok) {
        setError(res.error ?? "Action failed.");
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload proof. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // Not signed in → gate.
  if (!actor) {
    return (
      <div className="card p-4 text-center">
        <p className="text-sm text-bark-500">Sign in to claim or update this case.</p>
        <button onClick={() => requireAuth()} className="btn-primary mt-3 w-full py-2.5 text-sm">
          <LogIn className="h-4 w-4" /> Sign in
        </button>
      </div>
    );
  }

  const change = (to: CaseStatus, opts?: { resolution?: CaseResolution; note?: string }) =>
    run(() => updateCaseStatus(c.id, to, actor, opts));

  const verifiedBadge =
    c.status === "resolved" ? (
      c.proof_verified ? (
        <div className="flex items-center gap-2 rounded bg-status-sterilised/10 px-4 py-2.5 text-sm font-semibold text-status-sterilised">
          <ShieldCheck className="h-4 w-4" /> Outcome verified by StrayPaw
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded bg-status-hungry/10 px-4 py-2.5 text-sm font-semibold text-bark-600 dark:text-bark-200">
          <ShieldQuestion className="h-4 w-4 text-status-hungry" /> Proof submitted · pending StrayPaw verification
        </div>
      )
    ) : null;

  // Signed in but not a verified partner NGO → can read + add notes, but not act.
  const canAct = ngoMember === true;

  return (
    <div className="space-y-3">
      {verifiedBadge}

      {ngoMember === false && (
        <div className="card p-4 text-sm text-bark-600 dark:text-bark-200">
          <p className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4 text-paw-500" /> Verified partners only
          </p>
          <p className="mt-1 text-bark-500">
            Claiming and resolving cases is limited to verified partner NGOs.{" "}
            <a href="/partner" className="font-semibold text-paw-600 hover:underline">
              Request partner access
            </a>{" "}
            and we&apos;ll set you up.
          </p>
        </div>
      )}

      {/* primary action depends on lifecycle position (verified NGOs only) */}
      {canAct &&
        (c.assignee_id === null ? (
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
              <div className="card space-y-3 p-3">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-bark-600">Resolution</p>
                  <div className="grid grid-cols-3 gap-2">
                    {RESOLUTIONS.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => setResolution(r.key)}
                        disabled={busy}
                        className={cn(
                          "rounded py-2.5 text-xs font-semibold transition-colors",
                          resolution === r.key
                            ? "bg-paw-500 text-white shadow-warm"
                            : "bg-bark-900/[0.05] text-bark-600 hover:bg-bark-900/[0.08] dark:bg-white/[0.06] dark:text-bark-200"
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <PhotoField
                  label="After photo (required)"
                  file={afterFile}
                  onPick={setAfterFile}
                  required
                />
                <PhotoField
                  label="Before photo (optional)"
                  file={beforeFile}
                  onPick={setBeforeFile}
                />

                <textarea
                  value={outcomeNote}
                  onChange={(e) => setOutcomeNote(e.target.value)}
                  rows={2}
                  placeholder="Outcome note, what was done and the result…"
                  className="w-full resize-none rounded border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900"
                />

                {/* Territorial dislocation, return the dog where it was caught. */}
                <label className="flex cursor-pointer items-start gap-2 rounded border border-status-hungry/30 bg-status-hungry/10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={returnedToCatch}
                    onChange={(e) => setReturnedToCatch(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-paw-500"
                  />
                  <span className="text-xs text-bark-700 dark:text-bark-200">
                    <span className="font-semibold">Returned to the exact catch location.</span>{" "}
                    Street dogs are territorial, releasing one elsewhere risks its
                    welfare and post-op recovery.
                  </span>
                </label>

                <p className="text-[11.5px] text-bark-400">
                  Proof is required and will be verified by StrayPaw before it counts
                  in impact reports.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setResolving(false)} className="btn-ghost py-2.5 text-sm">
                    Cancel
                  </button>
                  <button onClick={submitResolve} disabled={busy} className="btn-primary py-2.5 text-sm">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Submit proof
                  </button>
                </div>
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
            <span className="font-semibold text-bark-700 dark:text-bark-200">{c.assignee_name}</span>.
            Only the assignee can update status.
          </div>
        ))}

      {error && (
        <p className="rounded bg-status-injured/10 px-3 py-2 text-center text-sm font-medium text-status-injured">
          {error}
        </p>
      )}

      {/* notes, any signed-in volunteer */}
      <div className="flex items-end gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={1}
          placeholder="Add an update note…"
          className="min-h-[44px] flex-1 resize-none rounded border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
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

      {/* cost, handler or verified NGO member */}
      {(ngoMember || c.assignee_id === user?.id) && (
        <div className="rounded border border-black/[0.06] dark:border-white/10">
          <button
            onClick={() => setCostOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-bark-700 dark:text-bark-200"
          >
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-paw-600" /> Cost tracking
            </span>
            <span className="text-xs text-bark-400">{costOpen ? "Hide" : "Edit"}</span>
          </button>
          {costOpen && (
            <div className="space-y-3 border-t border-black/[0.06] p-4 dark:border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-bark-500">Estimated (₹)</label>
                  <input type="number" inputMode="numeric" value={estimate} onChange={(e) => setEstimate(e.target.value)} className="w-full rounded border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-bark-500">Spent so far (₹)</label>
                  <input type="number" inputMode="numeric" value={spent} onChange={(e) => setSpent(e.target.value)} className="w-full rounded border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900" />
                </div>
              </div>
              <button
                onClick={() =>
                  run(() =>
                    setCaseCost(c.id, {
                      estimate: estimate === "" ? null : Math.max(0, parseInt(estimate, 10) || 0),
                      spent: spent === "" ? null : Math.max(0, parseInt(spent, 10) || 0),
                    })
                  )
                }
                disabled={busy}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save cost
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhotoField({
  label,
  file,
  onPick,
  required,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  required?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded border border-dashed px-3 py-2.5 text-xs font-medium transition-colors",
        file
          ? "border-paw-400 bg-paw-50 text-paw-700 dark:bg-bark-800"
          : "border-black/15 text-bark-500 hover:border-paw-300 dark:border-white/15"
      )}
    >
      <Camera className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{file ? file.name : label}</span>
      {required && !file && <span className="text-status-injured">*</span>}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
