"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateFundraiser } from "@/lib/fundraiser-actions";
import type { Fundraiser } from "@/lib/types";

/** Shown only to the NGO that created this fundraiser: update reported amount
 *  raised, or close the campaign. */
export function FundraiserOwnerControls({ fundraiser }: { fundraiser: Fundraiser }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [raised, setRaised] = useState(fundraiser.raised_reported?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.id !== fundraiser.created_by_id) return null;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 border-t border-black/[0.06] pt-5 dark:border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl border border-paw-200 bg-paw-50 px-4 py-3 text-sm font-semibold text-paw-700 dark:border-white/10 dark:bg-bark-800 dark:text-paw-300"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Manage your fundraiser
        </span>
        <span className="text-xs text-paw-500">{open ? "Hide" : "Edit"}</span>
      </button>

      {open && (
        <div className="card mt-3 space-y-3 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-bark-500">
              Amount raised so far (₹)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={raised}
              onChange={(e) => setRaised(e.target.value)}
              placeholder="e.g. 12500"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900"
            />
            <p className="mt-1 text-[11px] text-bark-400">
              Self-reported, shown as progress on your campaign.
            </p>
          </div>

          {error && <p className="text-sm font-medium text-status-injured">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                run(() =>
                  updateFundraiser(fundraiser.id, {
                    raisedReported: raised === "" ? null : Math.max(0, parseInt(raised, 10) || 0),
                  })
                )
              }
              disabled={busy}
              className="btn-primary py-2.5 text-sm"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save progress
            </button>
            <button
              onClick={() => run(() => updateFundraiser(fundraiser.id, { status: "closed" }))}
              disabled={busy}
              className="btn-ghost py-2.5 text-sm"
            >
              <X className="h-4 w-4" /> Close campaign
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
