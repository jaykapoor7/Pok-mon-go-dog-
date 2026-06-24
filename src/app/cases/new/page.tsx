"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LogIn, Loader2, FilePlus2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createCase } from "@/lib/case-actions";
import { getDogById } from "@/lib/data";
import {
  CASE_CATEGORY_META,
  CASE_SEVERITY_META,
  type CaseCategory,
  type CaseSeverity,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES = Object.keys(CASE_CATEGORY_META) as CaseCategory[];
const SEVERITIES: CaseSeverity[] = ["low", "normal", "high", "critical"];

function NewCaseInner() {
  const { user, ready, isAuthed, openSignIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const dogId = params.get("dog");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState("");
  const [category, setCategory] = useState<CaseCategory>("injury");
  const [severity, setSeverity] = useState<CaseSeverity>("normal");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !isAuthed) openSignIn();
  }, [ready, isAuthed, openSignIn]);

  // Prefill from a linked dog for continuity.
  useEffect(() => {
    if (!dogId) return;
    getDogById(dogId).then((dog) => {
      if (!dog) return;
      setZone(dog.zone);
      setCoords({ lat: dog.lat, lng: dog.lng });
      setTitle((t) => t || `${dog.needs_help ? "Injury" : "Check-up"} — ${dog.name}`);
      if (dog.needs_help) setSeverity("high");
    });
  }, [dogId]);

  if (ready && !isAuthed) {
    return (
      <div className="mx-auto max-w-md px-4 pt-28 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-paw-100 text-paw-600">
          <LogIn className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tightest">
          Sign in to open a case
        </h1>
        <p className="mt-2 text-sm text-bark-500">
          Cases are owned and audited, so they need a name attached.
        </p>
        <button onClick={openSignIn} className="btn-primary mt-5 px-6 py-3">
          <LogIn className="h-4 w-4" /> Sign in
        </button>
      </div>
    );
  }

  async function submit() {
    if (!user || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createCase(
        {
          title: title.trim(),
          description: description.trim(),
          dogId,
          zone: zone.trim() || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          severity,
          category,
        },
        { id: user.id, name: user.name }
      );
      if (id && id !== "demo-case") router.push(`/cases/${id}`);
      else router.push("/cases");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the case.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/cases"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> All cases
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tightest sm:text-3xl">
        New case
      </h1>
      <p className="text-sm text-bark-500">
        {dogId ? "Linked to a dog profile for continuity." : "Open an operational record."}
      </p>

      <div className="mt-6 space-y-5">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Injured leg near Hauz Khas metro"
            className={inputCls}
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {CASE_CATEGORY_META[c].emoji} {CASE_CATEGORY_META[c].label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Severity">
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((s) => (
              <Chip key={s} active={severity === s} onClick={() => setSeverity(s)}>
                {CASE_SEVERITY_META[s].label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Area / zone">
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="Locality"
            className={inputCls}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What's happening and what's needed…"
            className={cn(inputCls, "resize-none")}
          />
        </Field>

        {error && (
          <p className="rounded-2xl bg-status-injured/10 px-4 py-3 text-center text-sm font-medium text-status-injured">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy || !title.trim()}
          className="btn-primary w-full py-4 text-base"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePlus2 className="h-5 w-5" />}
          Open case
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "chip border transition-colors",
        active
          ? "border-transparent bg-bark-900 text-white dark:bg-white dark:text-bark-900"
          : "border-black/10 bg-white text-bark-600 hover:border-black/20 dark:border-white/10"
      )}
    >
      {children}
    </button>
  );
}

export default function NewCasePage() {
  return (
    <Suspense fallback={<div className="px-4 pt-28 text-center text-sm text-bark-400">Loading…</div>}>
      <NewCaseInner />
    </Suspense>
  );
}
