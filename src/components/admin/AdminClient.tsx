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
  CheckCircle2,
  PawPrint,
  HeartPulse,
  Utensils,
  Trash2,
  ExternalLink,
  Building2,
} from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { haptic } from "@/lib/haptics";
import { timeAgo } from "@/lib/utils";
import { STATUS_META, type DogStatus } from "@/lib/types";

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
  acknowledged: boolean;
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

interface AdminDog {
  id: string;
  name: string | null;
  zone: string | null;
  status: DogStatus;
  needs_help: boolean;
  vaccinated: boolean;
  sterilised: boolean;
  is_friendly: boolean;
  ear_notch: string | null;
  cover_photo: string | null;
  last_seen: string | null;
}

interface AdminPartnerRequest {
  id: string;
  user_id: string;
  org_name: string;
  area: string | null;
  contact: string | null;
  message: string | null;
  email: string | null;
  created_at: string;
}

interface AdminFeedingZone {
  id: string;
  name: string;
  zone: string | null;
  created_by_name: string | null;
  volunteer_count: number;
  last_fed_at: string | null;
  created_at: string;
}

interface AdminFundraiser {
  id: string;
  title: string;
  category: string;
  goal_amount: number | null;
  raised_reported: number | null;
  donate_url: string;
  created_by_id: string | null;
  created_by_name: string | null;
  status: string;
  featured: boolean;
  created_at: string;
}

type Tab = "queue" | "partners" | "verify" | "dogs" | "feeding" | "fundraisers" | "volunteers" | "ngos";

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
  const [dogs, setDogs] = useState<AdminDog[]>([]);
  const [feedingZones, setFeedingZones] = useState<AdminFeedingZone[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<AdminPartnerRequest[]>([]);
  const [grants, setGrants] = useState<{ id: string; email: string; org_name: string; created_at: string }[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [fundraisers, setFundraisers] = useState<AdminFundraiser[]>([]);
  const [discoveringFunds, setDiscoveringFunds] = useState(false);
  const [exportingEmails, setExportingEmails] = useState(false);
  const [tab, setTab] = useState<Tab>("queue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Helper sign-ups load alongside the queue; a failure here (e.g. helpers.sql
  // not yet run) is non-fatal, it just leaves those tabs empty.
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
      /* ignore, keep the queue usable */
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
      /* ignore, keep moderation usable */
    }
  }, []);

  // All dogs (master editor).
  const loadDogs = useCallback(async (s: string) => {
    try {
      const res = await fetch("/api/admin/dogs", {
        headers: { Authorization: `Bearer ${s}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = await res.json();
      setDogs(j.dogs ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  // Feeding zones (moderation, they can be added by guests).
  const loadFeedingZones = useCallback(async (s: string) => {
    try {
      const res = await fetch("/api/admin/feeding-zones", {
        headers: { Authorization: `Bearer ${s}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = await res.json();
      setFeedingZones(j.zones ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  // NGO fundraisers (moderation / takedown).
  const loadFundraisers = useCallback(async (s: string) => {
    try {
      const res = await fetch("/api/admin/fundraisers", {
        headers: { Authorization: `Bearer ${s}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = await res.json();
      setFundraisers(j.fundraisers ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  // Pending NGO partner-access requests.
  const loadPartners = useCallback(async (s: string) => {
    try {
      const res = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${s}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = await res.json();
      setPartnerRequests(j.requests ?? []);
      setGrants(j.grants ?? []);
      setOrgs(j.orgs ?? []);
    } catch {
      /* ignore */
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
        loadDogs(s);
        loadFeedingZones(s);
        loadPartners(s);
        loadFundraisers(s);
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    },
    [loadHelpers, loadCases, loadDogs, loadFeedingZones, loadPartners, loadFundraisers]
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

  // Tick a volunteer/NGO as reached-out. The row STAYS (unlike queue/verify),
  // just flips its acknowledged state.
  async function toggleAck(id: string, next: boolean) {
    setBusyId(id);
    setError(null);
    const apply = (list: Helper[]) =>
      list.map((h) => (h.id === id ? { ...h, acknowledged: next } : h));
    setVolunteers(apply);
    setNgos(apply);
    try {
      const res = await fetch("/api/admin/helpers", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: next ? "acknowledge" : "unacknowledge", id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        // revert on failure
        const revert = (list: Helper[]) =>
          list.map((h) => (h.id === id ? { ...h, acknowledged: !next } : h));
        setVolunteers(revert);
        setNgos(revert);
        return;
      }
      haptic(next ? "success" : "light");
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  // Master edit of any dog (status / needs-help / care flags).
  async function patchDog(id: string, patch: Partial<AdminDog>) {
    setBusyId(id);
    setError(null);
    setDogs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    try {
      const res = await fetch("/api/admin/dogs", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        loadDogs(secret); // re-sync truth
        return;
      }
      haptic("success");
    } catch {
      setError("Network error.");
      loadDogs(secret);
    } finally {
      setBusyId(null);
    }
  }

  // Download the opted-in reporter email list as CSV.
  async function exportEmails() {
    setExportingEmails(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/emails", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Export failed.");
        haptic("error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `straypaw-reporters-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error.");
    } finally {
      setExportingEmails(false);
    }
  }

  // Approve / reject an NGO partner-access request.
  async function partnerAction(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        return;
      }
      haptic(action === "approve" ? "success" : "light");
      setPartnerRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  // Directly grant partner access to an existing account by email.
  async function grantPartner(email: string, orgName: string, area: string): Promise<string | null> {
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grant", email, orgName, area }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return j.error || "Grant failed.";
    haptic("success");
    await loadPartners(secret);
    return null;
  }

  // Add an existing account to an existing org (role "admin" = team lead).
  async function addOrgMember(ngoId: string, email: string, role: string): Promise<string | null> {
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_member", ngoId, email, role }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return j.error || "Could not add member.";
    haptic("success");
    await loadPartners(secret);
    return null;
  }

  // Discover candidate campaigns from the web → pending review queue.
  async function discoverFundraisers() {
    setDiscoveringFunds(true);
    setError(null);
    try {
      const res = await fetch("/api/fundraisers/discover", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Discovery failed.");
        haptic("error");
        return;
      }
      haptic("success");
      await loadFundraisers(secret);
      if ((j.inserted ?? 0) === 0) {
        setError(
          j.found ? "Found candidates but all were already in the list." : "No new candidates found this run."
        );
      }
    } catch {
      setError("Network error.");
    } finally {
      setDiscoveringFunds(false);
    }
  }

  // Approve a pending (discovered) campaign → publish it.
  async function approveFundraiser(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/fundraisers", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        return;
      }
      haptic("success");
      setFundraisers((prev) => prev.map((f) => (f.id === id ? { ...f, status: "active" } : f)));
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  // Curate a reputable rescue's existing campaign.
  async function createCuratedFundraiser(payload: Record<string, unknown>): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch("/api/admin/fundraisers", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Couldn't add campaign.");
        haptic("error");
        return false;
      }
      haptic("success");
      await loadFundraisers(secret);
      return true;
    } catch {
      setError("Network error.");
      return false;
    }
  }

  async function toggleFeatureFundraiser(id: string, featured: boolean) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/fundraisers", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature", id, featured }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        return;
      }
      haptic("success");
      setFundraisers((prev) => prev.map((f) => (f.id === id ? { ...f, featured } : f)));
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  // Take down a fundraiser (spam / fraud / resolved).
  async function deleteFundraiser(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/fundraisers", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        return;
      }
      haptic("success");
      setFundraisers((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  // Remove a spam/duplicate feeding zone.
  async function deleteFeedingZone(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/feeding-zones", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Action failed.");
        haptic("error");
        return;
      }
      haptic("success");
      setFeedingZones((prev) => prev.filter((z) => z.id !== id));
    } catch {
      setError("Network error.");
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
    setDogs([]);
    setFeedingZones([]);
    setPartnerRequests([]);
    setFundraisers([]);
    setVolunteers([]);
    setNgos([]);
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

  // ── Console ───────────────────────────────────────────────
  const TABS: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "queue", label: "Sightings", icon: <Clock className="h-4 w-4" />, count: items.length },
    { key: "partners", label: "Partner requests", icon: <HeartHandshake className="h-4 w-4" />, count: partnerRequests.length },
    { key: "verify", label: "Verify outcomes", icon: <ShieldCheck className="h-4 w-4" />, count: pendingCases.length },
    { key: "dogs", label: "Dogs", icon: <PawPrint className="h-4 w-4" />, count: dogs.length },
    { key: "feeding", label: "Feeding zones", icon: <Utensils className="h-4 w-4" />, count: feedingZones.length },
    { key: "fundraisers", label: "Fundraisers", icon: <HeartHandshake className="h-4 w-4" />, count: fundraisers.length },
    { key: "volunteers", label: "Volunteers", icon: <HandHelping className="h-4 w-4" />, count: volunteers.length },
    { key: "ngos", label: "NGO leads", icon: <Building2 className="h-4 w-4" />, count: ngos.length },
  ];
  const activeTab = TABS.find((t) => t.key === tab);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-paw-500 text-white shadow-warm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tightest sm:text-3xl">
              Moderation console
            </h1>
            <p className="text-xs text-bark-500">Review, verify and curate everything on StrayPaw.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportEmails}
            disabled={exportingEmails}
            aria-label="Export reporter emails"
            title="Export reporter emails (CSV)"
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/10 px-3 text-xs font-semibold text-bark-600 hover:bg-black/[0.04] dark:border-white/10 dark:text-bark-200"
          >
            {exportingEmails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Emails
          </button>
          <button
            onClick={() => load(secret)}
            disabled={loading}
            aria-label="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-bark-600 hover:bg-black/[0.04] dark:border-white/10 dark:text-bark-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={lock}
            aria-label="Lock"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-bark-600 hover:bg-black/[0.04] dark:border-white/10 dark:text-bark-200"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[232px_1fr] lg:gap-8">
        {/* sidebar nav, vertical on desktop, horizontal scroll on mobile */}
        <aside className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:px-0">
          {TABS.map((t) => (
            <TabButton
              key={t.key}
              active={tab === t.key}
              onClick={() => setTab(t.key)}
              icon={t.icon}
              label={t.label}
              count={t.count}
            />
          ))}
        </aside>

        {/* content column */}
        <div className="min-w-0">
          <div className="mb-4 hidden items-baseline gap-2 lg:flex">
            <h2 className="font-display text-lg font-extrabold tracking-tightest">{activeTab?.label}</h2>
            <span className="text-sm text-bark-400">{activeTab?.count ?? 0}</span>
          </div>

          {error && (
            <p className="mb-4 rounded-2xl bg-status-injured/10 px-4 py-3 text-center text-sm font-medium text-status-injured">
              {error}
            </p>
          )}

          {tab === "partners" && (
        <PartnerRequestsList requests={partnerRequests} grants={grants} orgs={orgs} busyId={busyId} onAction={partnerAction} onGrant={grantPartner} onAddMember={addOrgMember} />
      )}
      {tab === "verify" && (
        <VerifyList cases={pendingCases} busyId={busyId} onVerify={verify} />
      )}
      {tab === "dogs" && (
        <DogsList dogs={dogs} busyId={busyId} onPatch={patchDog} />
      )}
      {tab === "feeding" && (
        <FeedingZonesModList zones={feedingZones} busyId={busyId} onDelete={deleteFeedingZone} />
      )}
      {tab === "fundraisers" && (
        <FundraisersModList
          fundraisers={fundraisers}
          busyId={busyId}
          discovering={discoveringFunds}
          onDiscover={discoverFundraisers}
          onApprove={approveFundraiser}
          onCreate={createCuratedFundraiser}
          onToggleFeature={toggleFeatureFundraiser}
          onDelete={deleteFundraiser}
        />
      )}
      {tab === "volunteers" && (
        <HelperList helpers={volunteers} kind="volunteer" busyId={busyId} onToggle={toggleAck} />
      )}
      {tab === "ngos" && (
        <HelperList helpers={ngos} kind="ngo" busyId={busyId} onToggle={toggleAck} />
      )}

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
      </div>
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
      className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors lg:w-full ${
        active
          ? "bg-paw-500 text-white shadow-warm"
          : "text-bark-600 hover:bg-black/[0.05] dark:text-bark-300 dark:hover:bg-white/[0.06]"
      }`}
    >
      {icon}
      <span className="lg:flex-1 lg:text-left">{label}</span>
      <span
        className={`rounded-full px-1.5 text-[11px] font-bold ${
          active ? "bg-white/25 text-white" : "bg-black/[0.06] text-bark-500 dark:bg-white/10 dark:text-bark-300"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function HelperList({
  helpers,
  kind,
  busyId,
  onToggle,
}: {
  helpers: Helper[];
  kind: "volunteer" | "ngo";
  busyId: string | null;
  onToggle: (id: string, next: boolean) => void;
}) {
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
        <div
          key={h.id}
          className={`card p-4 transition-opacity ${h.acknowledged ? "opacity-60" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold">
                {h.acknowledged && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-status-vaccinated" />
                )}
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

          <button
            onClick={() => onToggle(h.id, !h.acknowledged)}
            disabled={busyId === h.id}
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              h.acknowledged
                ? "bg-status-vaccinated/15 text-status-vaccinated hover:bg-status-vaccinated/25"
                : "bg-paw-500 text-white hover:bg-paw-600"
            }`}
          >
            {busyId === h.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {h.acknowledged ? "Reached out · undo" : "Mark reached out"}
          </button>
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

const DOG_STATUSES = Object.keys(STATUS_META) as DogStatus[];

function DogsList({
  dogs,
  busyId,
  onPatch,
}: {
  dogs: AdminDog[];
  busyId: string | null;
  onPatch: (id: string, patch: Partial<AdminDog>) => void;
}) {
  if (dogs.length === 0) {
    return (
      <div className="card p-10 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">
          <PawPrint className="h-7 w-7" />
        </span>
        <h2 className="font-display text-lg font-bold">No dogs yet</h2>
        <p className="mt-1 text-sm text-bark-500">
          Approved dogs will appear here for editing.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-bark-400">
        Master editor, changes apply to any dog immediately (needs-help first).
      </p>
      {dogs.map((d) => (
        <div key={d.id} className="card p-3">
          <div className="flex items-center gap-3">
            <DogPhoto
              src={d.cover_photo ?? ""}
              alt=""
              seed={d.id}
              className="h-12 w-12 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <a
                href={`/dog/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-semibold hover:text-paw-600"
              >
                {d.name || (d.zone ? `Dog near ${d.zone}` : "Street dog")}
              </a>
              <p className="truncate text-xs text-bark-400">
                {d.zone} · {d.last_seen ? timeAgo(d.last_seen) : "-"}
              </p>
            </div>
            <button
              onClick={() => onPatch(d.id, { needs_help: !d.needs_help })}
              disabled={busyId === d.id}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                d.needs_help
                  ? "bg-status-injured/15 text-status-injured hover:bg-status-injured/25"
                  : "bg-black/[0.05] text-bark-500 dark:bg-white/10"
              }`}
            >
              {busyId === d.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <HeartPulse className="h-3.5 w-3.5" />
              )}
              {d.needs_help ? "Needs help · clear" : "Mark needs help"}
            </button>
          </div>

          {/* status chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DOG_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => d.status !== s && onPatch(d.id, { status: s })}
                disabled={busyId === d.id}
                className={`chip border transition-colors disabled:opacity-50 ${
                  d.status === s
                    ? "border-paw-400 bg-paw-100 text-paw-700"
                    : "border-bark-200 text-bark-600 hover:border-paw-300 dark:border-white/10 dark:text-bark-300"
                }`}
              >
                {STATUS_META[s].emoji} {STATUS_META[s].label}
              </button>
            ))}
          </div>

          {/* care flags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Flag label="Vaccinated" on={d.vaccinated} busy={busyId === d.id} onClick={() => onPatch(d.id, { vaccinated: !d.vaccinated })} />
            <Flag label="Sterilised" on={d.sterilised} busy={busyId === d.id} onClick={() => onPatch(d.id, { sterilised: !d.sterilised })} />
            <Flag label="Friendly" on={d.is_friendly} busy={busyId === d.id} onClick={() => onPatch(d.id, { is_friendly: !d.is_friendly })} />
          </div>

          {/* ear-notch (sterilisation mark) */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-bark-400">Ear-notch</span>
            {(["none", "left", "right", "both"] as const).map((v) => {
              const val = v === "none" ? null : v;
              const active = (d.ear_notch ?? null) === val;
              return (
                <button
                  key={v}
                  onClick={() => !active && onPatch(d.id, { ear_notch: val })}
                  disabled={busyId === d.id}
                  className={`chip border transition-colors disabled:opacity-50 ${
                    active
                      ? "border-paw-400 bg-paw-100 text-paw-700"
                      : "border-bark-200 text-bark-500 hover:border-paw-300 dark:border-white/10"
                  }`}
                >
                  {v === "none" ? "None" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartnerRequestsList({
  requests,
  grants,
  orgs,
  busyId,
  onAction,
  onGrant,
  onAddMember,
}: {
  requests: AdminPartnerRequest[];
  grants: { id: string; email: string; org_name: string; created_at: string }[];
  orgs: AdminOrg[];
  busyId: string | null;
  onAction: (id: string, action: "approve" | "reject") => void;
  onGrant: (email: string, orgName: string, area: string) => Promise<string | null>;
  onAddMember: (ngoId: string, email: string, role: string) => Promise<string | null>;
}) {
  return (
    <div className="space-y-4">
      <GrantAccessForm onGrant={onGrant} />
      <AddMemberForm orgs={orgs} onAddMember={onAddMember} />
      {orgs.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold">Organisations ({orgs.length})</p>
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{o.name}</span>
                  {o.area && <span className="text-bark-400"> · {o.area}</span>}
                </span>
                <span className="shrink-0 text-xs text-bark-400">
                  {o.members} member{o.members === 1 ? "" : "s"} · {o.leads} lead{o.leads === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {grants.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold">Granted access ({grants.length})</p>
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {grants.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0"><span className="font-medium">{g.org_name}</span> <span className="text-bark-400">· {g.email}</span></span>
                <span className="shrink-0 text-xs text-bark-400">{timeAgo(g.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {requests.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">
            <HeartHandshake className="h-6 w-6" />
          </span>
          <h2 className="font-display text-base font-bold">No pending requests</h2>
          <p className="mt-1 text-sm text-bark-500">
            NGO access requests appear here. Or grant access directly above.
          </p>
        </div>
      ) : (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{r.org_name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-bark-400">
                {r.area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {r.area}
                  </span>
                )}
                <span>{timeAgo(r.created_at)}</span>
              </p>
              {(r.email || r.contact) && (
                <p className="mt-1 text-sm">
                  <ContactLink contact={r.email || r.contact || ""} />
                  {r.email && r.contact && r.email !== r.contact && (
                    <span className="ml-2 text-xs text-bark-400">· {r.contact}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          {r.message && (
            <p className="mt-2 rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-bark-700 dark:bg-white/[0.04] dark:text-bark-200">
              {r.message}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onAction(r.id, "approve")}
              disabled={busyId === r.id}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-status-vaccinated/15 py-2 text-sm font-semibold text-status-vaccinated disabled:opacity-50"
            >
              {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve as partner
            </button>
            <button
              onClick={() => onAction(r.id, "reject")}
              disabled={busyId === r.id}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-black/[0.05] py-2 text-sm font-semibold text-bark-500 disabled:opacity-50 dark:bg-white/10"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
      )}
    </div>
  );
}

function GrantAccessForm({ onGrant }: { onGrant: (email: string, orgName: string, area: string) => Promise<string | null> }) {
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    if (!email.trim() || !orgName.trim()) return;
    setBusy(true);
    setMsg(null);
    const err = await onGrant(email.trim(), orgName.trim(), area.trim());
    setBusy(false);
    if (err) setMsg({ ok: false, text: err });
    else { setMsg({ ok: true, text: `${orgName} now has partner access.` }); setEmail(""); setOrgName(""); setArea(""); }
  }

  const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 dark:border-white/10 dark:bg-bark-900";
  return (
    <div className="card p-4">
      <p className="mb-2 text-sm font-semibold">Grant partner access directly</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="NGO account email" className={input} />
        <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Organisation name" className={input} />
        <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area (optional)" className={input} />
      </div>
      <button onClick={submit} disabled={busy || !email.trim() || !orgName.trim()} className="btn-primary mt-2 px-4 py-2 text-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Grant access
      </button>
      {msg && <p className={`mt-2 text-sm font-medium ${msg.ok ? "text-status-vaccinated" : "text-status-injured"}`}>{msg.text}</p>}
      <p className="mt-1 text-xs text-bark-400">The person must have created a StrayPaw account (sign up) first. Creates a verified org and makes them its <span className="font-semibold">team lead</span>.</p>
    </div>
  );
}

type AdminOrg = { id: string; name: string; area: string | null; verified: boolean; members: number; leads: number };

function AddMemberForm({ orgs, onAddMember }: { orgs: AdminOrg[]; onAddMember: (ngoId: string, email: string, role: string) => Promise<string | null> }) {
  const [ngoId, setNgoId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    if (!ngoId || !email.trim()) return;
    setBusy(true);
    setMsg(null);
    const err = await onAddMember(ngoId, email.trim(), role);
    setBusy(false);
    if (err) setMsg({ ok: false, text: err });
    else {
      const org = orgs.find((o) => o.id === ngoId);
      setMsg({ ok: true, text: `Added to ${org?.name ?? "the org"} as ${role === "admin" ? "team lead" : role.replace("_", " ")}.` });
      setEmail("");
    }
  }

  const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 dark:border-white/10 dark:bg-bark-900";
  return (
    <div className="card p-4">
      <p className="mb-2 text-sm font-semibold">Add a member to an organisation</p>
      {orgs.length === 0 ? (
        <p className="text-sm text-bark-400">No organisations yet, create one above first.</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-4">
            <select value={ngoId} onChange={(e) => setNgoId(e.target.value)} className={`${input} sm:col-span-2`}>
              <option value="">Choose organisation…</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Member account email" className={input} />
            <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
              <option value="member">Member</option>
              <option value="field_worker">Field worker</option>
              <option value="admin">Team lead</option>
            </select>
          </div>
          <button onClick={submit} disabled={busy || !ngoId || !email.trim()} className="btn-primary mt-2 px-4 py-2 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add member
          </button>
          {msg && <p className={`mt-2 text-sm font-medium ${msg.ok ? "text-status-vaccinated" : "text-status-injured"}`}>{msg.text}</p>}
          <p className="mt-1 text-xs text-bark-400">The member must have a StrayPaw account. Pick <span className="font-semibold">Team lead</span> to give them management powers.</p>
        </>
      )}
    </div>
  );
}

function FundraisersModList({
  fundraisers,
  busyId,
  discovering,
  onDiscover,
  onApprove,
  onCreate,
  onToggleFeature,
  onDelete,
}: {
  fundraisers: AdminFundraiser[];
  busyId: string | null;
  discovering: boolean;
  onDiscover: () => void;
  onApprove: (id: string) => void;
  onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  onToggleFeature: (id: string, featured: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const pending = fundraisers.filter((f) => f.status === "pending");
  const live = fundraisers.filter((f) => f.status !== "pending");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [orgName, setOrgName] = useState("");
  const [donateUrl, setDonateUrl] = useState("");
  const [cover, setCover] = useState("");
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !orgName.trim() || !donateUrl.trim()) return;
    setBusy(true);
    const ok = await onCreate({
      title: title.trim(),
      orgName: orgName.trim(),
      donateUrl: donateUrl.trim(),
      coverPhoto: cover.trim() || undefined,
      story: story.trim() || undefined,
      category: "other",
    });
    setBusy(false);
    if (ok) {
      setTitle(""); setOrgName(""); setDonateUrl(""); setCover(""); setStory("");
      setAdding(false);
    }
  }

  const field =
    "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onDiscover} disabled={discovering} className="btn-ghost py-3 text-sm">
          {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Discover from web
        </button>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary py-3 text-sm">
            <HeartHandshake className="h-4 w-4" /> Add campaign
          </button>
        )}
      </div>

      {/* pending review queue (discovered candidates, not public yet) */}
      {pending.length > 0 && (
        <div className="card p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-status-hungry">
            To review · {pending.length} discovered
          </p>
          <div className="space-y-2">
            {pending.map((f) => (
              <div key={f.id} className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                <p className="text-sm font-semibold leading-snug">{f.title}</p>
                <p className="mt-0.5 text-xs text-bark-400">{f.created_by_name}</p>
                <a
                  href={f.donate_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-1 inline-flex items-center gap-0.5 break-all text-xs font-semibold text-paw-600"
                >
                  {f.donate_url} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onApprove(f.id)}
                    disabled={busyId === f.id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-status-vaccinated/15 py-2 text-xs font-semibold text-status-vaccinated disabled:opacity-50"
                  >
                    {busyId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Approve &amp; publish
                  </button>
                  <button
                    onClick={() => onDelete(f.id)}
                    disabled={busyId === f.id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-black/[0.05] py-2 text-xs font-semibold text-bark-500 disabled:opacity-50 dark:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" /> Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-bark-400">
            Discovered from the web, check each is a legit rescue before publishing;
            approving badges it as a StrayPaw pick.
          </p>
        </div>
      )}

      {adding && (
        <div className="card space-y-2.5 p-4">
          <p className="text-sm font-semibold">Curate a reputable rescue&apos;s campaign</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" className={field} />
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="NGO / rescue name" className={field} />
          <input value={donateUrl} onChange={(e) => setDonateUrl(e.target.value)} placeholder="Their campaign / donation link (Milaap, Ketto, GiveIndia…)" className={field} />
          <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Cover image URL (optional)" className={field} />
          <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={3} placeholder="Short description / why you trust them (optional)" className={`${field} resize-none`} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAdding(false)} className="btn-ghost py-2.5 text-sm">Cancel</button>
            <button onClick={submit} disabled={busy || !title.trim() || !orgName.trim() || !donateUrl.trim()} className="btn-primary py-2.5 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Publish (featured)
            </button>
          </div>
        </div>
      )}

      {live.length === 0 ? (
        <div className="card p-8 text-center text-sm text-bark-500">
          No live fundraisers yet. Discover candidates or add one above, or wait for partners.
        </div>
      ) : (
        live.map((f) => (
          <div key={f.id} className={`card p-4 ${f.status !== "active" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a href={`/fundraisers/${f.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-paw-600">
                  {f.title}
                </a>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-bark-400">
                  <span className="capitalize">{f.category}</span>
                  {f.created_by_name && <span>{f.created_by_name}</span>}
                  <span className="text-paw-500">{f.created_by_id ? "partner" : "curated"}</span>
                  {f.status !== "active" && <span className="uppercase">{f.status}</span>}
                  <span>{timeAgo(f.created_at)}</span>
                </p>
                <a href={f.donate_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-0.5 break-all text-xs font-semibold text-paw-600">
                  {f.donate_url} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <button onClick={() => onDelete(f.id)} disabled={busyId === f.id} aria-label="Take down" className="shrink-0 rounded-full p-1.5 text-bark-400 hover:bg-status-injured/10 hover:text-status-injured disabled:opacity-50">
                {busyId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={() => onToggleFeature(f.id, !f.featured)}
              disabled={busyId === f.id}
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                f.featured ? "bg-paw-500 text-white" : "bg-black/[0.06] text-bark-500 dark:bg-white/10"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              {f.featured ? "Featured · unfeature" : "Feature this"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function FeedingZonesModList({
  zones,
  busyId,
  onDelete,
}: {
  zones: AdminFeedingZone[];
  busyId: string | null;
  onDelete: (id: string) => void;
}) {
  if (zones.length === 0) {
    return (
      <div className="card p-10 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">
          <Utensils className="h-7 w-7" />
        </span>
        <h2 className="font-display text-lg font-bold">No feeding zones yet</h2>
        <p className="mt-1 text-sm text-bark-500">
          Community-added feeding spots will appear here for moderation.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {zones.map((z) => (
        <div key={z.id} className="card flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <a
              href={`/feeding/${z.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-paw-600"
            >
              {z.name}
            </a>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-bark-400">
              {z.zone && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {z.zone}
                </span>
              )}
              <span>{z.volunteer_count} volunteers</span>
              {z.created_by_name && <span>by {z.created_by_name}</span>}
              <span>{timeAgo(z.created_at)}</span>
            </p>
          </div>
          <button
            onClick={() => onDelete(z.id)}
            disabled={busyId === z.id}
            aria-label="Delete"
            className="shrink-0 rounded-full p-1.5 text-bark-400 hover:bg-status-injured/10 hover:text-status-injured disabled:opacity-50"
          >
            {busyId === z.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      ))}
    </div>
  );
}

function Flag({ label, on, busy, onClick }: { label: string; on: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`chip border transition-colors disabled:opacity-50 ${
        on
          ? "border-status-vaccinated/40 bg-status-vaccinated/15 text-status-vaccinated"
          : "border-bark-200 text-bark-400 hover:border-bark-300 dark:border-white/10"
      }`}
    >
      {on ? <Check className="h-3 w-3" /> : null}
      {label}
    </button>
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
