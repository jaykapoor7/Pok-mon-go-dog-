"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Lock,
  LogIn,
  RefreshCw,
  Check,
  X,
  MapPin,
  Clock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { haptic } from "@/lib/haptics";
import { timeAgo } from "@/lib/utils";

const KEY = "straypaw.admin_secret";

interface Pending {
  id: string;
  reporter_name: string | null;
  zone: string | null;
  nickname: string | null;
  photo_url: string;
  notes: string | null;
  mood_tags: string[] | null;
  created_at: string;
}

export function AdminClient() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (s: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sightings", {
        headers: { Authorization: `Bearer ${s}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // 401 = wrong password; anything else (e.g. 503 unset, 500 service role)
        // carries a specific server message worth showing verbatim.
        setError(
          j.error ||
            (res.status === 401
              ? "Wrong password."
              : "Could not load. Is ADMIN_SECRET set in Vercel?")
        );
        if (res.status === 401) setAuthed(false);
        return;
      }
      const j = await res.json();
      setItems(j.pending ?? []);
      setSecret(s);
      setAuthed(true);
      try {
        localStorage.setItem(KEY, s);
      } catch {
        /* ignore */
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) load(saved);
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/sightings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        return;
      }
      haptic(action === "approve" ? "success" : "light");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      setError("Network error.");
      haptic("error");
    } finally {
      setBusyId(null);
    }
  }

  function lock() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setSecret("");
    setAuthed(false);
    setItems([]);
    setInput("");
  }

  // ── Login ─────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="mx-auto max-w-sm px-4 pt-28 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-paw-100 text-paw-600">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tightest">
          Moderation
        </h1>
        <p className="mt-2 text-sm text-bark-500">
          Enter the admin password to review pending sightings.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) load(input.trim());
          }}
          className="mt-5 space-y-3"
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-center text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary w-full py-3"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Unlock
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm font-medium text-status-injured">{error}</p>
        )}
      </div>
    );
  }

  // ── Queue ─────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tightest sm:text-3xl">
            Pending review
          </h1>
          <p className="text-sm text-bark-500">
            {items.length} {items.length === 1 ? "sighting" : "sightings"} waiting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(secret)}
            disabled={loading}
            aria-label="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 text-bark-600 hover:bg-black/[0.04] dark:border-white/10 dark:text-bark-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={lock}
            aria-label="Lock"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 text-bark-600 hover:bg-black/[0.04] dark:border-white/10 dark:text-bark-200"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-2xl bg-status-injured/10 px-4 py-3 text-center text-sm font-medium text-status-injured">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <h2 className="font-display text-lg font-bold">All caught up</h2>
          <p className="mt-1 text-sm text-bark-500">No sightings pending review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
          {items.map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, height: 0, marginTop: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="card overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                <DogPhoto
                  src={s.photo_url}
                  alt={s.nickname ?? "Sighting"}
                  seed={s.id}
                  className="h-24 w-24 shrink-0 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {s.nickname || (s.zone ? `Dog near ${s.zone}` : "Street dog")}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-bark-500">
                    {s.zone && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {s.zone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {timeAgo(s.created_at)}
                    </span>
                  </div>
                  {s.reporter_name && (
                    <p className="mt-0.5 text-xs text-bark-400">by {s.reporter_name}</p>
                  )}
                  {s.notes && (
                    <p className="mt-1 line-clamp-2 text-sm text-bark-700 dark:text-bark-200">
                      {s.notes}
                    </p>
                  )}
                  {s.mood_tags && s.mood_tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.mood_tags.map((t) => (
                        <span
                          key={t}
                          className="chip bg-bark-900/[0.05] text-bark-600 dark:bg-white/[0.06] dark:text-bark-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-black/[0.06] dark:bg-white/[0.08]">
                <button
                  onClick={() => act(s.id, "reject")}
                  disabled={busyId === s.id}
                  className="flex items-center justify-center gap-1.5 bg-white py-3 text-sm font-semibold text-status-injured transition-colors hover:bg-status-injured/5 disabled:opacity-50 dark:bg-bark-900"
                >
                  {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Reject
                </button>
                <button
                  onClick={() => act(s.id, "approve")}
                  disabled={busyId === s.id}
                  className="flex items-center justify-center gap-1.5 bg-white py-3 text-sm font-semibold text-status-vaccinated transition-colors hover:bg-status-vaccinated/5 disabled:opacity-50 dark:bg-bark-900"
                >
                  {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </button>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
