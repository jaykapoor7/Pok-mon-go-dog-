"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Send, CheckCircle2, Upload, X, FileText } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Doc = { name: string; url: string };

export function PartnerApplyForm() {
  const [f, setF] = useState({ org_name: "", contact_name: "", email: "", phone: "", city: "", website: "", about: "" });
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const supa = getSupabase();
    if (!supa) { setError("File uploads aren't available right now. You can email documents instead."); return; }
    setUploading(true); setError(null);
    try {
      for (const file of files) {
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supa.storage.from("partner-docs").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data } = supa.storage.from("partner-docs").getPublicUrl(path);
        setDocs((d) => [...d, { name: file.name, url: data.publicUrl }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload. Try again or email the documents.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.org_name.trim() || !f.about.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) {
      setError("Please add your organisation name, a valid email, and tell us about your work.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/partner-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, documents: docs }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not submit. Try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-black/[0.1] bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";
  const label = "mb-1.5 block text-[13px] font-medium text-bark-600 dark:text-bark-300";

  if (done) {
    return (
      <div className="rounded border border-black/[0.06] bg-white/70 p-8 text-center dark:border-white/10 dark:bg-bark-900/50">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-status-vaccinated" />
        <h3 className="font-display text-xl font-bold">Application received</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-bark-500">
          Thanks for applying to partner with StrayPaw. We&apos;ll review your details and get in touch at{" "}
          <span className="font-medium text-bark-700 dark:text-bark-200">{f.email}</span> shortly.
        </p>
        <Link href="/" className="btn-ghost mt-5 px-6 py-3">Back home</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded border border-black/[0.06] bg-white/70 p-5 dark:border-white/10 dark:bg-bark-900/50 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Organisation name *</label><input value={f.org_name} onChange={set("org_name")} placeholder="e.g. Delhi Street Animals" className={field} /></div>
        <div><label className={label}>Your name</label><input value={f.contact_name} onChange={set("contact_name")} placeholder="Contact person" className={field} /></div>
        <div><label className={label}>Email *</label><input type="email" value={f.email} onChange={set("email")} placeholder="you@org.org" className={field} /></div>
        <div><label className={label}>Phone</label><input value={f.phone} onChange={set("phone")} placeholder="+91…" className={field} /></div>
        <div><label className={label}>City / area you cover</label><input value={f.city} onChange={set("city")} placeholder="e.g. South Delhi" className={field} /></div>
        <div><label className={label}>Website / social</label><input value={f.website} onChange={set("website")} placeholder="https://" className={field} /></div>
      </div>
      <div className="mt-4">
        <label className={label}>Tell us about your work *</label>
        <textarea value={f.about} onChange={set("about")} rows={5} placeholder="What does your organisation do, how many animals do you handle, and how would you use StrayPaw?" className={`${field} resize-none`} />
      </div>

      <div className="mt-4">
        <label className={label}>Onboarding documents</label>
        <p className="mb-2 text-xs text-bark-400">Registration certificate, 80G/12A, or anything that helps us verify you. PDFs or images.</p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-bark-200 bg-white px-4 py-4 text-sm font-medium text-bark-600 transition-colors hover:border-paw-300 hover:bg-paw-50 dark:border-white/15 dark:bg-bark-900">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload documents"}
          <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={onFiles} disabled={uploading} />
        </label>
        {docs.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {docs.map((d, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-bark-900">
                <FileText className="h-4 w-4 shrink-0 text-paw-500" />
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                <button type="button" onClick={() => setDocs((x) => x.filter((_, j) => j !== i))} className="text-bark-400 hover:text-status-injured"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-status-injured">{error}</p>}

      <button type="submit" disabled={busy || uploading} className="btn-primary mt-5 w-full py-3.5 text-base">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Submit application
      </button>
      <p className="mt-2 text-center text-xs text-bark-400">We review each application and reach out personally. No account needed to apply.</p>
    </form>
  );
}
