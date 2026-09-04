"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  FileImage,
  Loader2,
  Plus,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { reportSighting } from "@/lib/actions";
import { CITIES } from "@/lib/delhi";
import { formatPlace } from "@/lib/delhi";

/* ════════════════════════════════════════════════════════════════════
   Bringing paper and WhatsApp records in.

   Almost no organisation starts digital. Records live in ward registers,
   ABC ledgers and WhatsApp threads, and the usual advice — "re-enter it
   all" — is why they never move.

   So: attach the original as evidence, transcribe the few fields that
   matter beside it, and file both together. The photo stays with the
   record as provenance, which is what makes the entry checkable later.

   Deliberately not automated. OCR on a handwritten Hindi ward register
   would produce confident nonsense, and a wrong sterilisation record is
   worse than no record. A person reads it; the tool just removes the
   friction around them.
   ════════════════════════════════════════════════════════════════════ */

type Draft = {
  id: string;
  file: File;
  preview: string;
  nickname: string;
  locality: string;
  cityIdx: number;
  notes: string;
  state: "idle" | "saving" | "done" | "error";
  error?: string;
};

const MAX_BATCH = 20;

export function ImportClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_BATCH - drafts.length;
    const next: Draft[] = Array.from(files)
      .slice(0, Math.max(0, room))
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        preview: URL.createObjectURL(f),
        nickname: "",
        locality: "",
        cityIdx: 0,
        notes: "",
        state: "idle" as const,
      }));
    setDrafts((d) => [...d, ...next]);
  }

  function patch(id: string, p: Partial<Draft>) {
    setDrafts((d) => d.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  function remove(id: string) {
    setDrafts((d) => {
      const gone = d.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return d.filter((x) => x.id !== id);
    });
  }

  const ready = drafts.filter(
    (d) => d.state === "idle" && d.locality.trim().length > 0
  );

  async function fileAll() {
    if (!ready.length || busy) return;
    setBusy(true);
    // Sequential: these are uploads, and a burst of parallel writes from a
    // field connection fails more often than it finishes faster.
    for (const d of ready) {
      patch(d.id, { state: "saving" });
      try {
        const city = CITIES[d.cityIdx];
        await reportSighting({
          file: d.file,
          lat: city.lat,
          lng: city.lng,
          zone: formatPlace(d.locality.trim(), city.name),
          nickname: d.nickname.trim() || undefined,
          moods: [],
          notes:
            [d.notes.trim(), "Transcribed from an existing paper or message record."]
              .filter(Boolean)
              .join(" — "),
        });
        patch(d.id, { state: "done" });
      } catch (e) {
        patch(d.id, {
          state: "error",
          error: e instanceof Error ? e.message : "Could not file this record.",
        });
      }
    }
    setBusy(false);
  }

  const done = drafts.filter((d) => d.state === "done").length;

  return (
    <>
      <div className="imp-drop">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <FileImage size={26} strokeWidth={1.3} />
        <div>
          <b>Add register pages or screenshots</b>
          <span>
            Photograph a ward register, an ABC ledger page, or screenshot a
            WhatsApp thread. Up to {MAX_BATCH} at a time.
          </span>
        </div>
        <button
          type="button"
          className="spa-cta"
          onClick={() => inputRef.current?.click()}
          disabled={drafts.length >= MAX_BATCH}
        >
          <Plus size={14} /> Choose images
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="spa-note">
          <TriangleAlert size={16} />
          <span>
            <b>Nothing is read automatically.</b> Handwriting in a ward register
            does not survive OCR intact, and a wrongly transcribed sterilisation
            is worse than no record at all. You type the few fields that matter;
            the original image stays attached so anyone can check the entry
            against it later.
          </span>
        </div>
      ) : (
        <>
          <div className="imp-list">
            {drafts.map((d) => (
              <div key={d.id} className={`imp-card ${d.state}`}>
                <div className="imp-thumb">
                  <Image
                    src={d.preview}
                    alt=""
                    width={150}
                    height={150}
                    className="imp-img"
                    unoptimized
                  />
                </div>

                <div className="imp-fields">
                  <label>
                    <span>Animal name or ID (optional)</span>
                    <input
                      value={d.nickname}
                      onChange={(e) => patch(d.id, { nickname: e.target.value })}
                      placeholder="As written in the register"
                      disabled={d.state !== "idle"}
                    />
                  </label>
                  <label>
                    <span>Locality *</span>
                    <input
                      value={d.locality}
                      onChange={(e) => patch(d.id, { locality: e.target.value })}
                      placeholder="Ward, colony or street"
                      disabled={d.state !== "idle"}
                    />
                  </label>
                  <label>
                    <span>City</span>
                    <select
                      value={d.cityIdx}
                      onChange={(e) =>
                        patch(d.id, { cityIdx: Number(e.target.value) })
                      }
                      disabled={d.state !== "idle"}
                    >
                      {CITIES.map((c, i) => (
                        <option key={c.name} value={i}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="imp-wide">
                    <span>What the record says</span>
                    <textarea
                      rows={2}
                      value={d.notes}
                      onChange={(e) => patch(d.id, { notes: e.target.value })}
                      placeholder="e.g. Sterilised 12 Mar, released same ward. Rabies vaccine given."
                      disabled={d.state !== "idle"}
                    />
                  </label>
                </div>

                <div className="imp-state">
                  {d.state === "idle" && (
                    <button
                      type="button"
                      onClick={() => remove(d.id)}
                      aria-label="Remove this page"
                      className="imp-del"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {d.state === "saving" && <Loader2 size={16} className="imp-spin" />}
                  {d.state === "done" && (
                    <span className="imp-ok">
                      <Check size={14} /> Filed
                    </span>
                  )}
                  {d.state === "error" && (
                    <span className="imp-err" title={d.error}>
                      <TriangleAlert size={14} /> Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="imp-bar">
            <span className="spa-mono">
              {ready.length} ready · {done} filed · {drafts.length} total
            </span>
            <button
              type="button"
              className="spa-cta"
              onClick={fileAll}
              disabled={!ready.length || busy}
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="imp-spin" /> Filing…
                </>
              ) : (
                <>
                  <Upload size={14} /> File {ready.length || ""} record
                  {ready.length === 1 ? "" : "s"}
                </>
              )}
            </button>
          </div>
          {ready.length === 0 && drafts.some((d) => d.state === "idle") && (
            <p className="imp-hint">
              Each record needs a locality before it can be filed — that is what
              puts it on the map.
            </p>
          )}
        </>
      )}
    </>
  );
}
