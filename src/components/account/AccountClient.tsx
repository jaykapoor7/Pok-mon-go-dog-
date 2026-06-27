"use client";

import { useEffect, useState } from "react";
import { LogIn, Loader2, Clock, LogOut, PawPrint, PlusCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMySightings } from "@/lib/actions";
import { SightingCard } from "@/components/feed/SightingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MoodTag, Sighting } from "@/lib/types";

function mapRow(row: any, userId: string): Sighting {
  return {
    id: row.id,
    dog_id: row.dog_id ?? null,
    user_id: row.user_id ?? userId,
    user_name: row.reporter_name ?? "You",
    user_avatar: null,
    photo_url: row.photo_url,
    lat: row.lat,
    lng: row.lng,
    zone: row.zone ?? "India",
    nickname: row.nickname ?? null,
    mood_tags: (row.mood_tags ?? []) as MoodTag[],
    notes: row.notes ?? null,
    trust_score: row.trust_score ?? 50,
    likes: row.likes ?? 0,
    status: (row.status ?? "live") as "pending" | "live",
    created_at: row.created_at,
  };
}

export function AccountClient() {
  const { user, ready, isAuthed, openSignIn, signOut } = useAuth();
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getMySightings(user.id).then((rows) => {
      if (alive) {
        setSightings(rows.map((r) => mapRow(r, user.id)));
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!ready) {
    return (
      <div className="flex justify-center pt-32">
        <Loader2 className="h-6 w-6 animate-spin text-paw-500" />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="mx-auto max-w-sm px-4 pt-32 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tightest">
          Your sightings
        </h1>
        <p className="mt-2 text-sm text-bark-500">
          Sign in to see, edit and delete the sightings you&apos;ve posted —
          from any device.
        </p>
        <button onClick={openSignIn} className="btn-primary mt-5 px-6 py-3">
          <LogIn className="h-4 w-4" /> Sign in
        </button>
      </div>
    );
  }

  const pending = sightings.filter((s) => s.status === "pending").length;

  return (
    <div className="mx-auto max-w-xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tightest sm:text-3xl">
            Your sightings
          </h1>
          <p className="text-sm text-bark-500">
            Signed in as {user!.name}
            {user!.email ? ` · ${user!.email}` : ""}
          </p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-bark-600 hover:bg-black/[0.04] dark:border-white/10 dark:text-bark-200"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </header>

      {pending > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-status-hungry/10 px-4 py-3 text-sm font-medium text-bark-700 dark:text-bark-200">
          <Clock className="h-4 w-4 text-status-hungry" />
          {pending} {pending === 1 ? "sighting is" : "sightings are"} pending
          review and not public yet.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-paw-500" />
        </div>
      ) : sightings.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="h-7 w-7" />}
          title="No sightings yet"
          description="Spot a dog and report it — it'll show up here."
          action={{ href: "/report", label: "Report a dog", icon: <PlusCircle className="h-4 w-4" /> }}
        />
      ) : (
        <div className="space-y-4">
          {sightings.map((s) => (
            <SightingCard key={s.id} sighting={s} />
          ))}
        </div>
      )}
    </div>
  );
}
