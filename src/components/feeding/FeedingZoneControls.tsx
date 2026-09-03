"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Utensils, HandHelping, LogIn, X, Check as CheckIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { celebrate } from "@/lib/celebrate";
import {
  volunteerForZone,
  withdrawFeedingVolunteer,
  checkinFeedingZone,
} from "@/lib/feeding-actions";
import { FEEDING_DAYS, type FeedingDay, type FeedingZone, type FeedingZoneVolunteer } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_LABEL: Record<FeedingDay, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function FeedingZoneControls({
  zone,
  volunteers,
}: {
  zone: FeedingZone;
  volunteers: FeedingZoneVolunteer[];
}) {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState(false);
  const [days, setDays] = useState<FeedingDay[]>([]);
  const [contact, setContact] = useState("");

  const mine = user ? volunteers.find((v) => v.user_id === user.id) : undefined;

  function toggleDay(d: FeedingDay) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function markFed() {
    requireAuth(() =>
      run(async () => {
        await checkinFeedingZone(zone.id, { id: user!.id, name: user!.name });
        celebrate();
      })
    );
  }

  function openSignUp() {
    requireAuth(() => {
      setDays(mine?.days ?? []);
      setSigningUp(true);
    });
  }

  function submitSignUp() {
    if (days.length === 0) {
      setError("Pick at least one day.");
      return;
    }
    run(async () => {
      await volunteerForZone(zone.id, { id: user!.id, name: user!.name }, days, contact.trim());
      celebrate();
      setSigningUp(false);
    });
  }

  function withdraw() {
    run(() => withdrawFeedingVolunteer(zone.id, { id: user!.id, name: user!.name }));
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={markFed} disabled={busy} className="btn-primary py-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Utensils className="h-4 w-4" />}
          Mark fed today
        </button>
        {mine ? (
          <button onClick={withdraw} disabled={busy} className="btn-ghost py-3">
            <X className="h-4 w-4" /> Withdraw slot
          </button>
        ) : (
          <button onClick={openSignUp} disabled={busy} className="btn-ghost py-3">
            <HandHelping className="h-4 w-4" /> I can feed here
          </button>
        )}
      </div>

      {!user && (
        <p className="flex items-center gap-1.5 text-xs text-bark-400">
          <LogIn className="h-3.5 w-3.5" /> Sign in to mark it fed or sign up for a day.
        </p>
      )}

      {signingUp && (
        <div className="card space-y-3 p-4">
          <p className="text-sm font-semibold">Which days can you cover?</p>
          <div className="flex flex-wrap gap-2">
            {FEEDING_DAYS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={cn(
                  "chip border transition-colors",
                  days.includes(d)
                    ? "border-paw-400 bg-paw-100 text-paw-700"
                    : "border-bark-200 text-bark-600 dark:border-white/10 dark:text-bark-200"
                )}
              >
                {DAY_LABEL[d]}
              </button>
            ))}
          </div>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or email (optional, kept private)"
            className="w-full rounded border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900"
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSigningUp(false)} className="btn-ghost py-2.5 text-sm">
              Cancel
            </button>
            <button onClick={submitSignUp} disabled={busy} className="btn-primary py-2.5 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded bg-status-injured/10 px-3 py-2 text-center text-sm font-medium text-status-injured">
          {error}
        </p>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">
          Rotation · {volunteers.length} {volunteers.length === 1 ? "volunteer" : "volunteers"}
        </p>
        {volunteers.length === 0 ? (
          <p className="text-sm text-bark-400">No one signed up yet, be the first.</p>
        ) : (
          <div className="space-y-2">
            {volunteers.map((v) => (
              <div key={v.id} className="card flex items-center justify-between gap-3 p-3">
                <span className="text-sm font-semibold">
                  {v.user_name}
                  {user?.id === v.user_id && (
                    <span className="ml-1.5 text-xs font-normal text-paw-600">(you)</span>
                  )}
                </span>
                <div className="flex flex-wrap justify-end gap-1">
                  {v.days.length === 0 ? (
                    <span className="text-xs text-bark-400">no fixed days</span>
                  ) : (
                    v.days.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-paw-100 px-2 py-0.5 text-[11px] font-bold text-paw-700"
                      >
                        {DAY_LABEL[d]}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
