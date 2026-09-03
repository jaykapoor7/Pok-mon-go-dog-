"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, HeartHandshake } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { uploadPhoto } from "@/lib/actions";
import { createFundraiser } from "@/lib/fundraiser-actions";
import { FUNDRAISER_CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NewFundraiserForm() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  // Prefill from a linked case (e.g. "Raise funds for this case").
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("title");
    if (t) setTitle(t);
    setCaseId(p.get("case"));
  }, []);
  const [category, setCategory] = useState("bills");
  const [story, setStory] = useState("");
  const [goal, setGoal] = useState("");
  const [donateUrl, setDonateUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setPhoto(URL.createObjectURL(picked));
    }
  }

  function normalizedUrl(): string {
    const u = donateUrl.trim();
    if (!u) return "";
    return /^https?:\/\//i.test(u) ? u : `https://${u}`;
  }

  const canSubmit = title.trim().length > 0 && normalizedUrl().length > 0 && !busy;

  async function submit() {
    if (!canSubmit || !user) return;
    setBusy(true);
    setError(null);
    try {
      let coverPhoto: string | null = null;
      if (file) coverPhoto = await uploadPhoto(file);
      const id = await createFundraiser(
        {
          title: title.trim(),
          story: story.trim() || undefined,
          category,
          goalAmount: goal ? Math.max(0, parseInt(goal, 10) || 0) : null,
          donateUrl: normalizedUrl(),
          coverPhoto,
          deadline: deadline || null,
          caseId,
        },
        { id: user.id, name: user.name }
      );
      router.push(id ? `/fundraisers/${id}` : "/fundraisers");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the fundraiser.");
      setBusy(false);
    }
  }

  const field =
    "w-full rounded border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/fundraisers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Fundraisers
      </Link>

      <header className="mb-5">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Start a fundraiser 💛</h1>
        <p className="text-sm text-bark-500">
          Donors give directly through your own link, StrayPaw just hosts the
          campaign and sends people your way.
        </p>
      </header>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold">Cover photo (optional)</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
          {photo ? (
            <button onClick={() => fileRef.current?.click()} className="relative block aspect-video w-full overflow-hidden rounded">
              <img src={photo} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-3 right-3 chip bg-black/60 text-white">
                <Camera className="h-3.5 w-3.5" /> Change
              </span>
            </button>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-paw-300 bg-paw-50 text-paw-500 hover:bg-paw-100 dark:bg-bark-800"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-semibold">Add a photo</span>
            </button>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Clear pending vet bills for 30 rescues" className={field} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Category</label>
          <div className="flex flex-wrap gap-2">
            {FUNDRAISER_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={cn(
                  "chip border transition-colors",
                  category === c.value
                    ? "border-paw-400 bg-paw-100 text-paw-700"
                    : "border-bark-200 text-bark-600 dark:border-white/10 dark:text-bark-200"
                )}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Your donation link <span className="font-normal text-bark-400">(where the money goes)</span>
          </label>
          <input value={donateUrl} onChange={(e) => setDonateUrl(e.target.value)} placeholder="UPI / Razorpay / Milaap / Ketto / bank page URL" className={field} />
          <p className="mt-1.5 text-xs text-bark-400">
            Donors are sent here to pay you directly. Paste a UPI collect link,
            Razorpay/Milaap/Ketto page, or your donation page.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-semibold">Goal (₹, optional)</label>
            <input type="number" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="50000" className={field} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Needed by (optional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={field} />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Story</label>
          <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={5} placeholder="What are the funds for? Which dogs? What happens if you don't raise it?" className={`${field} resize-none`} />
        </div>

        {error && (
          <p className="rounded-xl bg-status-injured/10 px-3 py-2 text-center text-sm font-medium text-status-injured">
            {error}
          </p>
        )}

        <button onClick={submit} disabled={!canSubmit} className="btn-primary w-full py-3.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
          {busy ? "Publishing…" : "Publish fundraiser"}
        </button>
      </div>
    </div>
  );
}
