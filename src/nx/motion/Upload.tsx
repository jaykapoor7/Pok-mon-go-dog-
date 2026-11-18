"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, FileText, RotateCcw, Upload as UpIcon, X } from "lucide-react";
import { CheckDraw } from "./Result";
import { useCalm } from "./hooks";
import { DUR, EASE } from "./tokens";

/* One way files go up, everywhere: a drop zone that answers when a file is dragged over it (desktop) and opens the
   camera or the file picker when pressed (phone); then each file's own row: uploading, processing while the server
   works, a drawn check when it is done, and on failure what failed with Retry. StrayPaw's storage calls report no byte
   progress, so the bar is honestly indeterminate: it moves, it never shows a number it does not have. */

export type UpState = "queued" | "uploading" | "processing" | "done" | "error";
export type UpItem<R = unknown> = { id: string; file: File; state: UpState; error?: string; result?: R };
type Task<R> = (file: File, processing: () => void) => Promise<R>;

let seq = 0;
const toText = (e: unknown) => (e instanceof Error ? e.message : typeof e === "string" ? e : "It did not upload.");

/** The files of one upload area, one at a time (field connections fail bursts of parallel uploads). */
export function useUploads<R = unknown>(task: Task<R>, opts: { error?: (e: unknown) => string; onDone?: (r: R, f: File) => void } = {}) {
  const [items, setItems] = useState<UpItem<R>[]>([]);
  const ref = useRef({ task, opts }); ref.current = { task, opts };
  const patch = useCallback((id: string, p: Partial<UpItem<R>>) => setItems((cur) => cur.map((x) => (x.id === id ? { ...x, ...p } : x))), []);
  const one = useCallback(async (id: string, file: File) => {
    patch(id, { state: "uploading", error: undefined });
    try {
      const r = await ref.current.task(file, () => patch(id, { state: "processing" }));
      patch(id, { state: "done", result: r }); ref.current.opts.onDone?.(r, file);
    } catch (e) { patch(id, { state: "error", error: (ref.current.opts.error ?? toText)(e) }); }
  }, [patch]);
  const queue = useRef(Promise.resolve());
  const add = useCallback((files: File[]) => {
    const fresh = files.map((file) => ({ id: `up${++seq}`, file, state: "queued" as UpState }));
    setItems((cur) => [...cur, ...fresh]);
    for (const f of fresh) queue.current = queue.current.then(() => one(f.id, f.file));
    return queue.current;
  }, [one]);
  const retry = useCallback((id: string) => { const it = items.find((x) => x.id === id); if (it) queue.current = queue.current.then(() => one(id, it.file)); }, [items, one]);
  const remove = useCallback((id: string) => setItems((cur) => cur.filter((x) => x.id !== id)), []);
  const clearDone = useCallback(() => setItems((cur) => cur.filter((x) => x.state !== "done")), []);
  const busy = items.some((x) => x.state === "queued" || x.state === "uploading" || x.state === "processing");
  const allDone = items.length > 0 && items.every((x) => x.state === "done");
  return { items, add, retry, remove, clearDone, busy, allDone };
}

const fits = (f: File, accept?: string) => !accept || accept.split(",").map((a) => a.trim().toLowerCase()).some((a) => (a.startsWith(".") ? f.name.toLowerCase().endsWith(a) : a.endsWith("/*") ? f.type.startsWith(a.slice(0, -1)) : f.type === a));
export const size = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

/** The place files go: press to choose (or take a photo), or drag files onto it on a desktop. */
export function DropZone({ accept, multiple, onFiles, disabled, title, hint, capture, compact, icon }: {
  accept?: string; multiple?: boolean; onFiles: (f: File[]) => void; disabled?: boolean; title: ReactNode; hint?: ReactNode; capture?: "environment" | "user"; compact?: boolean; icon?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const take = (list: FileList | null) => {
    const all = [...(list ?? [])], ok = all.filter((f) => fits(f, accept)), no = all.length - ok.length;
    setNote(no ? `${no === 1 ? "One file is" : `${no} files are`} not a type this takes, so ${no === 1 ? "it was" : "they were"} left out.` : null);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };
  const hasFiles = (e: React.DragEvent) => [...e.dataTransfer.types].includes("Files");
  return (
    <div className="mo-drop" data-over={over || undefined} data-compact={compact || undefined} data-disabled={disabled || undefined}
      onDragEnter={(e) => { if (disabled || !hasFiles(e)) return; e.preventDefault(); depth.current++; setOver(true); }}
      onDragOver={(e) => { if (disabled || !hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
      onDrop={(e) => { if (disabled) return; e.preventDefault(); depth.current = 0; setOver(false); take(e.dataTransfer.files); }}>
      <button type="button" className="mo-drop-b" disabled={disabled} onClick={() => input.current?.click()}>
        <span className="mo-drop-i" aria-hidden>{icon ?? <UpIcon size={20} />}</span>
        <span className="mo-drop-t"><b>{over ? "Drop to add" : title}</b>{hint ? <small>{hint}</small> : null}<small className="mo-drop-desk" aria-hidden>{over ? " " : "or drag files here"}</small></span>
      </button>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} capture={capture} onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
      {note ? <p className="mo-drop-n" role="status">{note}</p> : null}
    </div>
  );
}

function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { if (!file.type.startsWith("image/")) return; const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className="mo-up-th" src={url} alt="" /> : <span className="mo-up-th is-doc"><FileText size={16} aria-hidden /></span>;
}

const WORD: Record<UpState, string> = { queued: "Waiting its turn", uploading: "Uploading", processing: "Processing", done: "Done", error: "Did not upload" };

/** Each file's row with its own state. `more` is the "Upload more" action shown once everything is done. */
export function UploadList<R>({ items, onRetry, onRemove, more, label = "Uploads", processing = "Processing" }: { items: UpItem<R>[]; onRetry: (id: string) => void; onRemove?: (id: string) => void; more?: ReactNode; label?: string; processing?: string }) {
  const calm = useCalm();
  if (!items.length) return null;
  const n = items.length, up = items.filter((x) => x.state === "uploading" || x.state === "queued").length, proc = items.some((x) => x.state === "processing"), bad = items.filter((x) => x.state === "error").length, ok = items.filter((x) => x.state === "done").length;
  const summary = up || proc ? `${up ? `Uploading ${Math.min(n, ok + bad + 1)} of ${n}` : processing}…` : bad ? `${bad} did not upload. ${ok} done.` : `${ok === 1 ? "Uploaded" : `All ${ok} uploaded`}.`;
  return (
    <div className="mo-ups-w">
      <p className="mo-sr" role="status">{summary}</p>
      <ul className="mo-ups" aria-label={label}>
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.li key={it.id} className="mo-up" data-s={it.state} layout={calm ? false : "position"} initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={calm ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }} transition={{ duration: calm ? 0 : DUR.state, ease: EASE }}>
              <Thumb file={it.file} />
              <span className="mo-up-t"><b>{it.file.name}</b>
                <small>{size(it.file.size)} · {it.state === "processing" ? processing : it.state === "error" ? it.error ?? WORD.error : WORD[it.state]}</small>
                {it.state === "uploading" || it.state === "processing" ? <span className="mo-bar" data-s={it.state} aria-hidden><i /></span> : null}
              </span>
              <span className="mo-up-a">
                {it.state === "done" ? <span className="mo-up-ok" aria-label="Done"><CheckDraw size={14} /></span>
                  : it.state === "error" ? <><AlertTriangle size={16} className="mo-up-bad" aria-hidden /><button type="button" className="nx-btn is-quiet is-sm" onClick={() => onRetry(it.id)}><RotateCcw size={12} aria-hidden />Retry</button></> : null}
                {onRemove && (it.state === "done" || it.state === "error") ? <button type="button" className="nx-ib" aria-label={`Remove ${it.file.name} from this list`} onClick={() => onRemove(it.id)}><X size={14} /></button> : null}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {more && items.every((x) => x.state === "done" || x.state === "error") ? <div className="mo-ups-more">{more}</div> : null}
    </div>
  );
}
