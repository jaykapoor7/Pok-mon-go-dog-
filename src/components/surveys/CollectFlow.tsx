"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Crosshair, Minus, Plus, Loader2, Check, CheckCircle2, WifiOff, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { uploadPhoto } from "@/lib/actions";
import { submitSurveyResponse } from "@/lib/survey-actions";
import { SPECIES, type Survey, type SurveyArea } from "@/lib/types";
import { cn } from "@/lib/utils";

// Field capture, radically simpler than the admin UI. Large controls, one
// column, works on a phone outdoors. Keeps area + GPS between entries so a
// worker can log animal after animal quickly.
export function CollectFlow({ survey, areas }: { survey: Survey; areas: SurveyArea[] }) {
  const { user, ready, isAuthed, openSignIn } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [areaId, setAreaId] = useState<string | null>(areas[0]?.id ?? null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [species, setSpecies] = useState(survey.species);
  const [count, setCount] = useState(1);
  const [sterilised, setSterilised] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const QKEY = `straypaw:survey-queue:${survey.id}`;

  useEffect(() => {
    if (ready && !isAuthed) openSignIn();
  }, [ready, isAuthed, openSignIn]);

  function readQ(): any[] { try { return JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch { return []; } }
  function writeQ(arr: any[]) { try { localStorage.setItem(QKEY, JSON.stringify(arr)); } catch {} setPending(arr.length); }

  async function flush() {
    const q = readQ();
    if (!q.length) return;
    const remaining: any[] = [];
    for (const item of q) {
      try { await submitSurveyResponse(item); } catch { remaining.push(item); }
    }
    writeQ(remaining);
  }

  useEffect(() => {
    setPending(readQ().length);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => { setOnline(true); flush(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    flush();
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
  useEffect(() => { locate(); }, []);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { setPhoto(await uploadPhoto(file)); } catch { setError("Photo upload failed."); } finally { setUploading(false); }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const attributes: Record<string, unknown> = {};
    if (sterilised !== null) attributes.sterilised = sterilised;
    const payload = {
      surveyId: survey.id, areaId, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      photoUrl: photo, species, count, attributes, notes: notes.trim() || null,
    };
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("offline");
      await submitSurveyResponse(payload);
    } catch {
      // Offline or failed → queue locally; it syncs when back online.
      const q = readQ(); q.push(payload); writeQ(q);
    } finally {
      setRecorded((n) => n + 1);
      setCount(1); setSterilised(null); setPhoto(null); setNotes("");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-20 sm:px-6">
      <Link href={`/surveys/${survey.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-paw-600">
        <ArrowLeft className="h-4 w-4" /> {survey.title}
      </Link>

      {(!online || pending > 0) && (
        <div className={cn("mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-[13px]", online ? "bg-status-hungry/10 text-status-hungry" : "bg-bark-100 text-bark-500 dark:bg-bark-800")}>
          {online ? <RefreshCw className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span className="flex-1">
            {online ? `${pending} saved offline · syncing…` : `Offline, ${pending} saved on this device`}
          </span>
          {online && pending > 0 && <button onClick={flush} className="font-semibold underline">Sync now</button>}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Record an animal</h1>
        {recorded > 0 && (
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-status-vaccinated">
            <CheckCircle2 className="h-4 w-4" /> {recorded} this session
          </span>
        )}
      </div>

      <div className="space-y-5">
        {/* Area */}
        {areas.length > 0 && (
          <Block label="Area">
            <select value={areaId ?? ""} onChange={(e) => setAreaId(e.target.value || null)} className="w-full rounded-lg border border-black/[0.12] bg-transparent px-3 py-3 text-base outline-none focus:border-paw-400 dark:border-white/[0.15]">
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.code ? `${a.code} · ` : ""}{a.name}</option>
              ))}
            </select>
          </Block>
        )}

        {/* Location */}
        <Block label="Location">
          <button onClick={locate} className="flex w-full items-center justify-between rounded-lg border border-black/[0.12] px-3 py-3 text-base dark:border-white/[0.15]">
            <span className={cn(coords ? "text-bark-900 dark:text-bark-50" : "text-bark-400")}>
              {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Tap to capture GPS"}
            </span>
            {locating ? <Loader2 className="h-5 w-5 animate-spin text-bark-400" /> : <Crosshair className="h-5 w-5 text-paw-500" />}
          </button>
        </Block>

        {/* Species */}
        <Block label="Species">
          <div className="flex flex-wrap gap-2">
            {SPECIES.filter((s) => s.id !== "other").map((s) => (
              <button key={s.id} onClick={() => setSpecies(s.id)} className={cn("rounded-lg px-3.5 py-2.5 text-base font-medium", species === s.id ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "border border-black/[0.12] text-bark-600 dark:border-white/[0.15] dark:text-bark-300")}>
                {s.label}
              </button>
            ))}
          </div>
        </Block>

        {/* Count */}
        <Block label="How many">
          <div className="flex items-center gap-4">
            <button onClick={() => setCount((c) => Math.max(1, c - 1))} className="grid h-12 w-12 place-items-center rounded-lg border border-black/[0.12] dark:border-white/[0.15]"><Minus className="h-5 w-5" /></button>
            <span className="w-10 text-center text-2xl font-semibold tabular-nums">{count}</span>
            <button onClick={() => setCount((c) => c + 1)} className="grid h-12 w-12 place-items-center rounded-lg border border-black/[0.12] dark:border-white/[0.15]"><Plus className="h-5 w-5" /></button>
          </div>
        </Block>

        {/* Sterilised (quick attribute) */}
        <Block label="Sterilised (ear-notch)">
          <div className="flex gap-2">
            {[["Yes", true], ["No", false], ["Unsure", null]].map(([label, val]) => (
              <button key={label as string} onClick={() => setSterilised(val as boolean | null)} className={cn("flex-1 rounded-lg px-3 py-2.5 text-base font-medium", sterilised === val ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "border border-black/[0.12] text-bark-600 dark:border-white/[0.15] dark:text-bark-300")}>
                {label as string}
              </button>
            ))}
          </div>
        </Block>

        {/* Photo */}
        <Block label="Photo (optional)">
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-black/[0.15] py-4 text-base text-bark-500 dark:border-white/[0.18]">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : photo ? <><Check className="h-5 w-5 text-status-vaccinated" /> Photo added</> : <><Camera className="h-5 w-5" /> Take a photo</>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} />
        </Block>

        {error && <p className="text-sm font-medium text-status-injured">{error}</p>}

        <button onClick={submit} disabled={busy} className="sticky bottom-4 flex w-full items-center justify-center gap-2 rounded-xl bg-paw-500 py-4 text-base font-semibold text-white shadow-warm hover:bg-paw-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Save &amp; next
        </button>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-bark-500">{label}</label>
      {children}
    </div>
  );
}
