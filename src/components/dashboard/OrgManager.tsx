"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Camera,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  HeartHandshake,
  Pencil,
} from "lucide-react";
import { VerifiedBadge } from "@/components/org/VerifiedBadge";
import {
  getMyOrg,
  getMyOrgCampaigns,
  updateMyOrg,
  uploadPhoto,
  type OrgProfilePatch,
} from "@/lib/actions";
import { formatINR } from "@/lib/fundraisers";
import type { NGO, Fundraiser } from "@/lib/types";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm text-bark-900 outline-none transition-colors placeholder:text-bark-400 focus:border-paw-400 focus:ring-2 focus:ring-paw-400/30 dark:border-white/10 dark:bg-bark-900 dark:text-bark-50";
const LABEL = "mb-1 block text-xs font-semibold text-bark-500";

export function OrgManager() {
  const [org, setOrg] = useState<NGO | null>(null);
  const [campaigns, setCampaigns] = useState<Fundraiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getMyOrg(), getMyOrgCampaigns()])
      .then(([o, c]) => {
        if (!alive) return;
        setOrg(o);
        setCampaigns(c);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-paw-500" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="card p-6 text-center text-sm text-bark-500">
        We couldn&apos;t load your organization. If you were just approved, try
        reloading.
      </div>
    );
  }

  const location = [org.city, org.state].filter(Boolean).join(", ") || org.area;

  return (
    <div className="space-y-6">
      {/* Identity header */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-paw-500 to-paw-700" />
        <div className="px-5 pb-5">
          <div className="-mt-8 flex items-end gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-card dark:border-bark-900 dark:bg-bark-900">
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-7 w-7 text-paw-500" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h2 className="truncate font-display text-xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50">
                {org.name}
              </h2>
              {location && <p className="text-xs text-bark-500">{location}</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <VerifiedBadge verified={org.verified} size="sm" />
            {org.slug && (
              <Link
                href={`/org/${org.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-paw-600 hover:underline"
              >
                View public page <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
            <button
              onClick={() => setEditing((v) => !v)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] px-3 py-1.5 text-xs font-semibold text-bark-700 transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:text-bark-200"
            >
              <Pencil className="h-3.5 w-3.5" /> {editing ? "Close" : "Edit profile"}
            </button>
          </div>

          {!editing && !org.mission && (
            <p className="mt-4 rounded-xl bg-paw-50 px-3.5 py-3 text-sm text-paw-800 dark:bg-paw-900/25 dark:text-paw-200">
              Your public profile is empty. Add your mission and details so
              supporters trust what they see.
            </p>
          )}
          {!editing && org.mission && (
            <p className="mt-4 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
              {org.mission}
            </p>
          )}
        </div>
      </div>

      {editing && <ProfileEditor org={org} onSaved={(o) => { setOrg(o); setEditing(false); }} />}

      {/* Campaigns */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold tracking-tightest text-bark-900 dark:text-bark-50">
            Your campaigns
          </h3>
          <Link href="/fundraisers/new" className="btn-primary px-3.5 py-2 text-sm">
            <Plus className="h-4 w-4" /> New campaign
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <HeartHandshake className="h-7 w-7 text-paw-400" />
            <p className="text-sm text-bark-500">
              No campaigns yet. Start one for a real need — vet bills, a
              sterilisation drive, an ambulance.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <CampaignRow key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CampaignRow({ c }: { c: Fundraiser }) {
  const pct =
    c.goal_amount && c.raised_reported
      ? Math.min(100, Math.round((c.raised_reported / c.goal_amount) * 100))
      : null;
  const statusTone =
    c.status === "active"
      ? "bg-status-vaccinated/15 text-status-vaccinated"
      : c.status === "pending"
      ? "bg-status-hungry/15 text-status-hungry"
      : "bg-bark-100 text-bark-500 dark:bg-bark-800";

  return (
    <Link href={`/fundraisers/${c.id}`} className="card card-interactive flex items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", statusTone)}>
            {c.status}
          </span>
          {c.featured && (
            <span className="rounded-full bg-paw-500 px-2 py-0.5 text-[11px] font-bold text-white">
              StrayPaw pick
            </span>
          )}
        </div>
        <h4 className="mt-1 truncate font-semibold text-bark-900 dark:text-bark-50">{c.title}</h4>
        {c.goal_amount != null && (
          <div className="mt-2">
            {pct != null && (
              <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-bark-100 dark:bg-bark-800">
                <div className="h-full rounded-full bg-paw-500" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="text-xs text-bark-500">
              {c.raised_reported != null ? `${formatINR(c.raised_reported)} raised of ` : "Goal "}
              {formatINR(c.goal_amount)}
            </p>
          </div>
        )}
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-bark-300" />
    </Link>
  );
}

function ProfileEditor({ org, onSaved }: { org: NGO; onSaved: (o: NGO) => void }) {
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    mission: org.mission ?? "",
    about: org.about ?? "",
    website: org.website ?? "",
    contact_email: org.contact_email ?? "",
    contact_phone: org.contact_phone ?? "",
    city: org.city ?? "",
    state: org.state ?? "",
    areas: (org.areas_of_work ?? []).join(", "),
    founded_year: org.founded_year ? String(org.founded_year) : "",
    registration_no: org.registration_no ?? "",
  });
  const [logo, setLogo] = useState<string | null>(org.logo_url ?? null);
  const [cover, setCover] = useState<string | null>(org.cover_photo ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function pick(kind: "logo" | "cover", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(kind);
    setError(null);
    try {
      const url = await uploadPhoto(file);
      kind === "logo" ? setLogo(url) : setCover(url);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const patch: OrgProfilePatch = {
        mission: form.mission.trim(),
        about: form.about.trim(),
        website: form.website.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        areas_of_work: form.areas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        logo_url: logo ?? undefined,
        cover_photo: cover ?? undefined,
        founded_year: form.founded_year ? Number(form.founded_year) : null,
        registration_no: form.registration_no.trim(),
      };
      const ok = await updateMyOrg(patch);
      if (!ok) throw new Error("Could not save. Are you still a verified member?");
      onSaved({
        ...org,
        ...patch,
        areas_of_work: patch.areas_of_work,
        logo_url: logo,
        cover_photo: cover,
      });
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <h3 className="font-display text-lg font-extrabold tracking-tightest text-bark-900 dark:text-bark-50">
        Edit your public profile
      </h3>

      {/* logo + cover */}
      <div className="flex flex-wrap gap-3">
        <div>
          <span className={LABEL}>Logo</span>
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-dashed border-bark-300 bg-bark-50 text-bark-400 dark:bg-bark-800"
          >
            {uploading === "logo" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </button>
          <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => pick("logo", e)} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={LABEL}>Cover photo</span>
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="grid h-16 w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-bark-300 bg-bark-50 text-bark-400 dark:bg-bark-800"
          >
            {uploading === "cover" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="cover" className="h-full w-full object-cover" />
            ) : (
              <span className="flex items-center gap-2 text-xs"><Camera className="h-4 w-4" /> Add a cover</span>
            )}
          </button>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => pick("cover", e)} />
        </div>
      </div>

      <div>
        <span className={LABEL}>Mission (one or two lines)</span>
        <textarea
          className={cn(INPUT, "min-h-[64px] resize-y")}
          value={form.mission}
          onChange={(e) => set("mission", e.target.value)}
          placeholder="What your organization does, in a sentence."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={LABEL}>City</span>
          <input className={INPUT} value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <span className={LABEL}>State</span>
          <input className={INPUT} value={form.state} onChange={(e) => set("state", e.target.value)} />
        </div>
      </div>

      <div>
        <span className={LABEL}>Areas of work (comma separated)</span>
        <input
          className={INPUT}
          value={form.areas}
          onChange={(e) => set("areas", e.target.value)}
          placeholder="Rescue, Veterinary treatment, Sterilisation, Awareness"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={LABEL}>Website</span>
          <input className={INPUT} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
        </div>
        <div>
          <span className={LABEL}>Founded year</span>
          <input className={INPUT} inputMode="numeric" value={form.founded_year} onChange={(e) => set("founded_year", e.target.value)} placeholder="2015" />
        </div>
        <div>
          <span className={LABEL}>Contact email</span>
          <input className={INPUT} value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
        </div>
        <div>
          <span className={LABEL}>Contact phone</span>
          <input className={INPUT} value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
        </div>
      </div>

      <div>
        <span className={LABEL}>Registration / trust number (optional)</span>
        <input className={INPUT} value={form.registration_no} onChange={(e) => set("registration_no", e.target.value)} placeholder="e.g. 12A / 80G / society reg no." />
      </div>

      <div>
        <span className={LABEL}>About (full story — optional)</span>
        <textarea
          className={cn(INPUT, "min-h-[100px] resize-y")}
          value={form.about}
          onChange={(e) => set("about", e.target.value)}
          placeholder="The longer story of your work, milestones and impact."
        />
      </div>

      {error && <p className="text-sm font-medium text-status-injured">{error}</p>}

      <button onClick={save} disabled={busy} className="btn-primary w-full py-3">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Save profile
      </button>
    </div>
  );
}
