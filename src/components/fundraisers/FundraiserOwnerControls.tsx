"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, SlidersHorizontal, Plus, Trash2, Camera, Megaphone } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateFundraiser, addFundraiserUpdate, setFundraiserDetails } from "@/lib/fundraiser-actions";
import { uploadPhoto } from "@/lib/actions";
import type { Fundraiser, BudgetLine } from "@/lib/types";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";

type Panel = "progress" | "update" | "budget";

/** Shown only to the NGO that created this fundraiser. */
export function FundraiserOwnerControls({ fundraiser }: { fundraiser: Fundraiser }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("progress");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // progress
  const [raised, setRaised] = useState(fundraiser.raised_reported?.toString() ?? "");
  // update
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // budget + outcome
  const [lines, setLines] = useState<BudgetLine[]>(fundraiser.budget ?? []);
  const [outcome, setOutcome] = useState(fundraiser.outcome ?? "");

  if (!user || user.id !== fundraiser.created_by_id) return null;

  async function run(fn: () => Promise<unknown>, close = true) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
      if (close) setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setPhoto(await uploadPhoto(file));
    } catch (err: any) {
      setError(err?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mt-8 border-t border-black/[0.06] pt-5 dark:border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded border border-paw-200 bg-paw-50 px-4 py-3 text-sm font-semibold text-paw-700 dark:border-white/10 dark:bg-bark-800 dark:text-paw-300"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Manage your campaign
        </span>
        <span className="text-xs text-paw-500">{open ? "Hide" : "Edit"}</span>
      </button>

      {open && (
        <div className="card mt-3 p-4">
          {/* panel switcher */}
          <div className="mb-4 inline-flex rounded-full bg-bark-100 p-1 dark:bg-bark-800">
            {(
              [
                ["progress", "Progress"],
                ["update", "Post update"],
                ["budget", "Budget & outcome"],
              ] as [Panel, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPanel(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  panel === key ? "bg-white text-paw-700 shadow-card dark:bg-bark-900 dark:text-paw-300" : "text-bark-500"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {panel === "progress" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-bark-500">Amount raised so far (₹)</label>
                <input type="number" inputMode="numeric" value={raised} onChange={(e) => setRaised(e.target.value)} placeholder="e.g. 12500" className={INPUT} />
                <p className="mt-1 text-[11.5px] text-bark-400">Self-reported, shown as progress on your campaign.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => run(() => updateFundraiser(fundraiser.id, { raisedReported: raised === "" ? null : Math.max(0, parseInt(raised, 10) || 0) }))}
                  disabled={busy}
                  className="btn-primary py-2.5 text-sm"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save progress
                </button>
                <button onClick={() => run(() => updateFundraiser(fundraiser.id, { status: fundraiser.status === "closed" ? "active" : "closed" }))} disabled={busy} className="btn-ghost py-2.5 text-sm">
                  <X className="h-4 w-4" /> {fundraiser.status === "closed" ? "Reopen" : "Close campaign"}
                </button>
              </div>
            </div>
          )}

          {panel === "update" && (
            <div className="space-y-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share progress, a rescue completed, a milestone hit, a thank-you to supporters."
                className={cn(INPUT, "min-h-[90px] resize-y")}
              />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-medium text-bark-600 dark:border-white/10 dark:text-bark-200">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Photo
                </button>
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="update" className="h-10 w-10 rounded-lg object-cover" />
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
              </div>
              <button
                onClick={() => {
                  if (!body.trim()) return;
                  run(() => addFundraiserUpdate(fundraiser.id, body.trim(), photo), false).then(() => {
                    setBody("");
                    setPhoto(null);
                  });
                }}
                disabled={busy || !body.trim()}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Post update
              </button>
            </div>
          )}

          {panel === "budget" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-bark-500">Use of funds</label>
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={line.label}
                        onChange={(e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
                        placeholder="e.g. Vet medicines"
                        className={cn(INPUT, "flex-1")}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={line.amount || ""}
                        onChange={(e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, amount: parseInt(e.target.value, 10) || 0 } : l)))}
                        placeholder="₹"
                        className={cn(INPUT, "w-24")}
                      />
                      <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="grid w-10 shrink-0 place-items-center rounded border border-black/10 text-bark-400 dark:border-white/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setLines((ls) => [...ls, { label: "", amount: 0 }])} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600">
                  <Plus className="h-4 w-4" /> Add a line
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-bark-500">Outcome (once resolved)</label>
                <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What the funds achieved." className={cn(INPUT, "min-h-[70px] resize-y")} />
              </div>

              <button
                onClick={() =>
                  run(
                    () =>
                      setFundraiserDetails(fundraiser.id, {
                        budget: lines.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), amount: Math.max(0, l.amount || 0) })),
                        outcome: outcome.trim() || null,
                      }),
                    false
                  )
                }
                disabled={busy}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save budget & outcome
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-sm font-medium text-status-injured">{error}</p>}
        </div>
      )}
    </section>
  );
}
