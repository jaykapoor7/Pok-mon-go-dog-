"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Import your register.

   Drop the workbook the team already keeps. It is read here, on this
   device: every sheet, its kind, its columns and its dates, with contact
   columns removed before anything is sent. The screen says in one line
   what will be added, and one button imports it, in small resumable
   steps with a live count. Sending the same register again, or next
   month's longer copy, adds only the new rows.

   Nothing needs mapping when the headers say what they are; a person can
   still change a sheet's kind, its year or a column, and the count
   updates at once.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronDown, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { FIELDS, FIELD_LABEL, KIND_LABEL, readWorkbook, rereadSheet, summarise, type ImportRecord, type Mapping, type ReadSheet, type ReadWorkbook, type SheetKind } from "@/lib/ngo-import/read";
import { useMembership } from "../shell/Shell";
import { n } from "../ui";
import { NgoGate } from "./Gate";
import "./ngo.css";
import "./import.css";

type Totals = { animals: number; cases: number; care: number; followUps: number; already: number; held: number };
type Held = { sheet: string; row: number; reason?: string };
type Past = { id: string; source_filename: string; status: string; rows_imported: number | null; created_at: string };
const ZERO: Totals = { animals: 0, cases: 0, care: 0, followUps: 0, already: 0, held: 0 };
const KINDS: SheetKind[] = ["rescue", "treatment", "vaccination", "sterilisation", "follow_up", "adoption", "animal", "skip"];

async function session() { const s = getSupabase(); return s ? (await s.auth.getSession()).data.session?.access_token ?? null : null; }
async function call(body: unknown, method: "POST" | "GET" = "POST") {
  const token = await session();
  const res = await fetch("/api/partner/import", { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: method === "POST" ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({ error: "The server's answer could not be read." }));
  if (!res.ok) throw Object.assign(new Error(json.error ?? "The import could not continue."), { status: res.status });
  return json;
}
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const plural = (k: number, one: string, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`;

export function Import() {
  return <NgoGate title="Import" lede="Bring in the register your organisation already keeps."><ImportFlow /></NgoGate>;
}

export function ImportFlow() {
  const mem = useMembership();
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [book, setBook] = useState<ReadWorkbook | null>(null);
  const [phase, setPhase] = useState<"pick" | "reading" | "review" | "importing" | "paused" | "done">("pick");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(0);
  const [totals, setTotals] = useState<Totals>(ZERO);
  const [held, setHeld] = useState<Held[]>([]);
  const [past, setPast] = useState<Past[]>([]);
  const [drag, setDrag] = useState(false);
  const XLSX = useRef<typeof import("xlsx") | null>(null);
  const run = useRef<{ batchId: string; chunk: number; upload: { path: string; token: string } | null } | null>(null);

  useEffect(() => { if (mem.member) call(null, "GET").then((r) => setPast(r.batches ?? [])).catch(() => undefined); }, [mem.member, phase]);

  const choose = async (f: File | null) => {
    if (!f) return;
    setErr(null); setFile(f); setPhase("reading");
    try {
      if (!/\.(xlsx|xls|csv)$/i.test(f.name)) throw new Error("Use an Excel (.xlsx, .xls) or CSV file.");
      if (f.size > 60 * 1024 * 1024) throw new Error("This file is larger than 60 MB. Split it by year and import each part.");
      XLSX.current ??= await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = readWorkbook(XLSX.current, buf, f.name);
      if (!wb.sheets.some((s) => s.kind !== "skip" && s.records.length)) throw new Error("No animal records were found. Check that the file has a header row with columns like Date, Location and Condition.");
      setData(buf); setBook(wb); setPhase("review");
    } catch (e) { setErr(e instanceof Error ? e.message : "The file could not be read."); setPhase("pick"); }
  };

  const change = (name: string, kind: SheetKind, mapping?: Mapping, year?: number | null) => {
    if (!book || !data || !XLSX.current) return;
    setBook({ ...book, sheets: book.sheets.map((s) => (s.name === name ? rereadSheet(XLSX.current!, data, book.fileName, s, kind, mapping ?? s.mapping, book.workbookYear, year ?? null) : s)) });
  };

  const records = useCallback(() => (book?.sheets ?? []).filter((s) => s.kind !== "skip").flatMap((s) => s.records), [book]);

  const go = async () => {
    if (!book || !file) return;
    const list = records();
    setErr(null); setPhase("importing");
    try {
      if (!run.current) {
        const start = await call({ action: "start", fileName: file.name, hash: book.hash, total: list.length, hasCities: list.some((r) => r.city || r.lat != null), sheets: book.sheets.map((s) => ({ name: s.name, kind: s.kind, records: s.records.length })) });
        run.current = { batchId: start.batchId, chunk: start.chunk ?? 50, upload: start.upload };
        // The original file is kept privately with the import, alongside it.
        if (start.upload) void getSupabase()?.storage.from("imports").uploadToSignedUrl(start.upload.path, start.upload.token, file).then((r) => { if (r.error && run.current) run.current.upload = null; }).catch(() => { if (run.current) run.current.upload = null; });
      }
      const { batchId, chunk } = run.current;
      const sum = { ...totals };
      const heldRows = [...held];
      for (let i = sent; i < list.length; i += chunk) {
        const part: ImportRecord[] = list.slice(i, i + chunk);
        let result: (Totals & { rows: Held[] & { outcome?: string }[] }) | null = null;
        for (let attempt = 0; attempt < 4 && !result; attempt++) {
          try { result = await call({ action: "rows", batchId, records: part }); }
          catch (e) { if ((e as { status?: number }).status === 401 || attempt === 3) throw e; await pause(1500 * (attempt + 1)); }
        }
        for (const k of Object.keys(ZERO) as (keyof Totals)[]) sum[k] += result![k] ?? 0;
        heldRows.push(...(result!.rows as { outcome?: string; sheet: string; row: number; reason?: string }[]).filter((r) => r.outcome === "held").map(({ sheet, row, reason }) => ({ sheet, row, reason })));
        setTotals({ ...sum }); setHeld([...heldRows]); setSent(Math.min(list.length, i + chunk));
      }
      await call({ action: "finish", batchId, ...sum, imported: list.length - sum.held, storedPath: run.current.upload?.path ?? null });
      setPhase("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The import stopped.");
      setPhase("paused");
    }
  };

  const reset = () => { setFile(null); setData(null); setBook(null); setSent(0); setTotals(ZERO); setHeld([]); setErr(null); run.current = null; setPhase("pick"); };
  const sum = book ? summarise(book.sheets) : null;
  const total = book ? records().length : 0;
  const pct = total ? Math.round((sent / total) * 100) : 0;

  return (
      <div className="imx">
        <header className="imx-head">
          <p className="k">{mem.org?.name ?? "Your organisation"} · records</p>
          <h1>Import your register.</h1>
          <p>The spreadsheet your team already keeps, as it is. Rescues, treatment, ABC and vaccination sheets are recognised on their own. Import it again whenever it grows: only new rows are added.</p>
        </header>

        {err && <p className="imx-err" role="alert"><AlertTriangle size={16} aria-hidden />{err}</p>}

        {(phase === "pick" || phase === "reading") && (
          <section className="imx-pick">
            <label className={`imx-drop${drag ? " is-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void choose(e.dataTransfer.files?.[0] ?? null); }}>
              {phase === "reading" ? <span className="imx-spin" aria-hidden /> : <Upload size={28} aria-hidden />}
              <b>{phase === "reading" ? `Reading ${file?.name}…` : "Drop your register here, or choose it"}</b>
              <small>Excel or CSV. Read on this device; phone numbers and contact columns never leave it.</small>
              <input type="file" accept=".xlsx,.xls,.csv" disabled={phase === "reading"} onChange={(e) => void choose(e.target.files?.[0] ?? null)} aria-label="Choose a register to import" />
            </label>
            {past.length > 0 && <div className="imx-past"><h2>Earlier imports</h2><ul>{past.map((b) => <li key={b.id}><FileSpreadsheet size={16} aria-hidden /><span>{b.source_filename}</span><small>{b.status === "imported" ? `${n(b.rows_imported ?? 0)} rows · ${new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Not finished: import the same file again to continue"}</small></li>)}</ul></div>}
          </section>
        )}

        {book && sum && (phase === "review" || phase === "importing" || phase === "paused") && (
          <section className="imx-review">
            <div className="imx-found">
              <p className="imx-file"><FileSpreadsheet size={16} aria-hidden />{book.fileName}</p>
              <h2>{plural(sum.records, "record")} about {plural(sum.animals, "animal")}.</h2>
              <p className="imx-what">{[sum.rescue && plural(sum.rescue, "rescue"), sum.treatment && plural(sum.treatment, "treatment"), sum.sterilisation && plural(sum.sterilisation, "sterilisation"), sum.vaccination && plural(sum.vaccination, "vaccination"), sum.followUp && plural(sum.followUp, "follow-up"), sum.adoption && plural(sum.adoption, "adoption"), sum.animal && plural(sum.animal, "animal listed", "animals listed")].filter(Boolean).join(" · ")}</p>
              {sum.notDogs > 0 && <p className="imx-note">{plural(sum.notDogs, "row")} about other animals or owned pets will be left out.</p>}
            </div>

            <ol className="imx-sheets">
              {book.sheets.map((s) => <SheetRow key={s.name} s={s} busy={phase !== "review"} onKind={(k) => change(s.name, k)} onMap={(m) => change(s.name, s.kind, m, s.year)} onYear={(y) => change(s.name, s.kind, s.mapping, y)} />)}
            </ol>

            {phase === "review" && (
              <div className="imx-go">
                <button type="button" className="btn is-flame imx-btn" onClick={() => void go()} disabled={!total}>Import {plural(total, "record")}<ArrowRight size={18} aria-hidden /></button>
                <button type="button" className="btn is-ghost" onClick={reset}>Choose another file</button>
              </div>
            )}
            {(phase === "importing" || phase === "paused") && (
              <div className="imx-progress" role="status" aria-live="polite">
                <div className="imx-bar" aria-hidden><i style={{ width: `${pct}%` }} /></div>
                <p><b>{n(sent)}</b> of {n(total)} records{phase === "importing" ? " · keep this page open" : ""}</p>
                {phase === "paused" && <button type="button" className="btn is-ink" onClick={() => void go()}><RotateCcw size={16} aria-hidden />Continue from row {n(sent + 1)}</button>}
              </div>
            )}
          </section>
        )}

        {phase === "done" && (
          <section className="imx-done">
            <p className="imx-ok"><Check size={20} aria-hidden />Imported</p>
            <h2>{totals.animals ? `${plural(totals.animals, "new animal")} on your register.` : "Your register is up to date."}</h2>
            <dl className="imx-figs">
              <div><dt>New animals</dt><dd>{n(totals.animals)}</dd></div>
              <div><dt>Cases</dt><dd>{n(totals.cases)}</dd></div>
              <div><dt>Care records</dt><dd>{n(totals.care)}</dd></div>
              <div><dt>Follow-ups ahead</dt><dd>{n(totals.followUps)}</dd></div>
              {totals.already > 0 && <div><dt>Already imported</dt><dd>{n(totals.already)}</dd></div>}
            </dl>
            {held.length > 0 && <details className="imx-held"><summary>{plural(held.length, "row")} left out<ChevronDown size={16} aria-hidden /></summary><ul>{held.slice(0, 200).map((h, i) => <li key={i}><span className="mono">{h.sheet} · row {h.row}</span>{h.reason}</li>)}</ul></details>}
            <p className="small">Cases that were still open in the register wait in Historical review for someone to confirm; they are not added to today&rsquo;s queue. Animals appear on your map as their areas refresh.</p>
            <div className="imx-go"><Link className="btn is-ink" href="/ngo/animals">See your animals<ArrowRight size={16} aria-hidden /></Link><Link className="btn" href="/ngo/review?cohort=history">Historical review</Link><button type="button" className="btn is-ghost" onClick={reset}>Import another file</button></div>
          </section>
        )}
      </div>
  );
}

function SheetRow({ s, busy, onKind, onMap, onYear }: { s: ReadSheet; busy: boolean; onKind: (k: SheetKind) => void; onMap: (m: Mapping) => void; onYear: (y: number) => void }) {
  const notes = s.records.filter((r) => r.notes.length);
  const thisYear = new Date().getFullYear();
  return (
    <li className={`imx-sheet${s.kind === "skip" ? " is-skip" : ""}`}>
      <div className="imx-sheet-top">
        <span className="imx-sheet-name"><b>{s.name}</b><small>{s.kind === "skip" ? s.reason : `${n(s.records.length)} records${s.empty ? ` · ${n(s.empty)} blank or total rows skipped` : ""}`}</small></span>
        <label className="imx-kind"><span className="sr-only">What {s.name} holds</span>
          <select className="select" value={s.kind} disabled={busy} onChange={(e) => onKind(e.target.value as SheetKind)}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
        </label>
      </div>
      {s.kind !== "skip" && (s.yearless > 0 || s.privateColumns.length > 0 || notes.length > 0) && (
        <p className="imx-sheet-facts">
          {s.yearless > 0 && <span>Dates without a year read as{" "}
            <select className="imx-year" value={s.year ?? thisYear} disabled={busy} onChange={(e) => onYear(Number(e.target.value))} aria-label={`Year for undated rows in ${s.name}`}>{Array.from({ length: 12 }, (_, i) => thisYear - i).map((y) => <option key={y} value={y}>{y}</option>)}</select>
          </span>}
          {s.privateColumns.length > 0 && <span>Kept private: {s.privateColumns.join(", ")}</span>}
          {notes.length > 0 && <span>{plural(notes.length, "row")} with a cell that could not be read; the rest of the row is kept</span>}
        </p>
      )}
      {s.kind !== "skip" && (
        <details className="imx-cols">
          <summary>Columns<ChevronDown size={15} aria-hidden /></summary>
          <div className="imx-fields">{FIELDS.map((f) => (
            <label key={f}><span>{FIELD_LABEL[f]}</span>
              <select className="select" value={s.mapping[f] ?? ""} disabled={busy} onChange={(e) => onMap({ ...s.mapping, [f]: e.target.value || undefined })}>
                <option value="">Not in this sheet</option>{s.headers.filter((h) => !s.privateColumns.includes(h)).map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          ))}</div>
        </details>
      )}
    </li>
  );
}
