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
  Mail,
  Phone,
  HeartHandshake,
  HandHelping,
  MessageSquare,
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

interface Helper {
  id: string;
  name: string;
  contact: string;
  message: string | null;
  is_ngo: boolean;
  ngo_name: string | null;
  dog_id: string | null;
  zone: string | null;
  created_at: string;
}

interface PendingCase {
  id: string;
  title: string;
  zone: string | null;
  resolution: string | null;
  outcome_note: string | null;
  before_url: string | null;
  after_url: string | null;
  assignee_name: string | null;
  resolved_at: string | null;
  dog_id: string | null;
}

type Tab = "queue" | "verify" | "volunteers" | "ngos";

/** A phone-or-email contact → a tappable mailto:/tel: link. */
function ContactLink({ contact }: { contact: string }) {
  const isEmail = contact.includes("@");
  const href = isEmail ? `mailto:${contact}` : `tel:${contact.replace(/\s+/g, "")}`;
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 font-semibold text-paw-600 hover:underline"
    >
      {isEmail ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
      {contact}
    </a>
  );
}

export function AdminClient() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<Pending[]>([]);
  const [volunteers, setVolunteers] = useState<Helper[]>([]);
  const [ngos, setNgos] = useState<Helper[]>([]);
  const [pendingCases, setPendingCases] = useState<PendingCase[]>([]);
  const [tab, setTab] = useState<Tab>("queue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Helper sign-ups load alongside the queue; a failure here (e.g. helpers.sql
  // not yet run) is non-fatal — it just leaves those tabs empty.
  const loadHelpers = useCallback(async (s: string) => {
    try {
      const res = await fetch("/api/admin/helpers", {
        headers: { Authorization: `Bearer ${s}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = await res.json();
      setVolunteers(j.volunteers ?? []);
      setNgos(j.ngos ?? []);
    } catch {
      /* ignore — keep the queue usable */
    }
  }, []);

  // Resolved cases awaiting outcome-proof verification.
  const loadCases = useCallback(async (s: string) => {
    try {
      const res = await fetch("/api/admin/cases", {
        headers: { Authorization: `Bearer ${s}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = await res.json();
      setPendingCases(j.pending ?? []);
    } catch {
      /* ignore — keep moderation usable */
    }
  }, []);

  const load = useCallback(
    async (s: string) => {
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
        loadHelpers(s);
        loadCases(s);
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    },
    [loadHelpers, loadCases]
  );

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

  async function verify(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        return;
      }
      haptic("success");
      setPendingCases((prev) => prev.filter((x) => x.id !== id));
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
    setPendingCases([]);
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
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tightest sm:text-3xl">
          Moderation
        </h1>
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

      {/* tabs */}
      <div className="mb-5 flex gap-1.5 rounded-2xl bg-black/[0.04] p-1 dark:bg-white/[0.05]">
        <TabButton active={tab === "queue"} onClick={() => setTab("queue")} icon={<Clock className="h-4 w-4" />} label="Queue" count={items.length} />
        <TabButton active={tab === "verify"} onClick={() => setTab("verify")} icon={<ShieldCheck className="h-4 w-4" />} label="Verify" count={pendingCases.length} />
        <TabButton active={tab === "volunteers"} onClick={() => setTab("volunteers")} icon={<HandHelping className="h-4 w-4" />} label="Volunteers" count={volunteers.length} />
        <TabButton active={tab === "ngos"} onClick={() => setTab("ngos")} icon={<HeartHandshake className="h-4 w-4" />} label="NGOs" count={ngos.length} />
      </div>

      {error && (
        <p className="mb-4 rounded-2xl bg-status-injured/10 px-4 py-3 text-center text-sm font-medium text-status-injured">
          {error}
        </p>
      )}

      {tab === "verify" && (
        <VerifyList cases={pendingCases} busyId={busyId} onVerify={verify} />
      )}
      {tab === "volunteers" && <HelperList helpers={volunteers} kind="volunteer" />}
      {tab === "ngos" && <HelperList helpers={ngos} kind="ngo" />}

      {tab === "queue" && (items.length === 0 ? (
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
      ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${
        active
          ? "bg-white text-paw-700 shadow-card dark:bg-bark-900 dark:text-paw-300"
          : "text-bark-500 hover:text-bark-700 dark:text-bark-400"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 text-[11px] font-bold ${
          active ? "bg-paw-100 text-paw-700" : "bg-black/[0.06] text-bark-500 dark:bg-white/10"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function HelperList({ helpers, kind }: { helpers: Helper[]; kind: "volunteer" | "ngo" }) {
  if (helpers.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="mb-2 text-4xl">{kind === "ngo" ? "🤝" : "🐾"}</div>
        <h2 className="font-display text-lg font-bold">
          No {kind === "ngo" ? "NGO registrations" : "volunteers"} yet
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          Sign-ups from the “Can you help?” form will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {helpers.map((h) => (
        <div key={h.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">
                {kind === "ngo" && h.ngo_name ? h.ngo_name : h.name}
              </p>
              {kind === "ngo" && h.ngo_name && (
                <p className="text-xs text-bark-400">Contact: {h.name}</p>
              )}
              <p className="mt-1 text-sm">
                <ContactLink contact={h.contact} />
              </p>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs text-bark-400">
              {timeAgo(h.created_at)}
            </span>
          </div>

          {(h.zone || h.dog_id) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bark-500">
              {h.zone && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {h.zone}
                </span>
              )}
              {h.dog_id && (
                <a
                  href={`/dog/${h.dog_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-paw-600 hover:underline"
                >
                  Offered to help a specific dog →
                </a>
              )}
            </div>
          )}

          {h.message && (
            <p className="mt-2 flex gap-1.5 rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-bark-700 dark:bg-white/[0.04] dark:text-bark-200">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bark-400" />
              {h.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function VerifyList({
  cases,
  busyId,
  onVerify,
}: {
  cases: PendingCase[];
  busyId: string | null;
  onVerify: (id: string) => void;
}) {
  if (cases.length === 0) {
    return (
      <div className="card p-10 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h2 className="font-display text-lg font-bold">Nothing to verify</h2>
        <p className="mt-1 text-sm text-bark-500">
          Resolved cases awaiting outcome-proof verification will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {cases.map((c) => (
        <div key={c.id} className="card overflow-hidden">
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{c.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-bark-500">
                  {c.zone && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {c.zone}
                    </span>
                  )}
                  {c.resolution && <span className="capitalize">{c.resolution}</span>}
                  {c.resolved_at && <span>{timeAgo(c.resolved_at)}</span>}
                </p>
                {c.assignee_name && (
                  <p className="mt-0.5 text-xs text-bark-400">by {c.assignee_name}</p>
                )}
              </div>
              {c.dog_id && (
                <a
                  href={`/dog/${c.dog_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-paw-600 hover:underline"
                >
                  Dog →
                </a>
              )}
            </div>

            {/* before/after proof */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Proof label="Before" url={c.before_url} seed={`${c.id}b`} />
              <Proof label="After" url={c.after_url} seed={`${c.id}a`} />
            </div>

            {c.outcome_note && (
              <p className="mt-2 rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-bark-700 dark:bg-white/[0.04] dark:text-bark-200">
                {c.outcome_note}
              </p>
            )}
          </div>
          <button
            onClick={() => onVerify(c.id)}
            disabled={busyId === c.id}
            className="flex w-full items-center justify-center gap-1.5 border-t border-black/[0.06] bg-white py-3 text-sm font-semibold text-status-vaccinated transition-colors hover:bg-status-vaccinated/5 disabled:opacity-50 dark:border-white/[0.08] dark:bg-bark-900"
          >
            {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify outcome
          </button>
        </div>
      ))}
    </div>
  );
}

function Proof({ label, url, seed }: { label: string; url: string | null; seed: string }) {
  if (!url) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-bark-100 text-xs text-bark-400 dark:bg-bark-800">
        No {label.toLowerCase()}
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-xl">
      <DogPhoto src={url} alt={label} seed={seed} className="aspect-square w-full" />
      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
        {label}
      </span>
    </div>
  );
}
