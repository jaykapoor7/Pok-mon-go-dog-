"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Upload } from "lucide-react";
import { FIELDS, FIELD_LABEL, KIND_LABEL, readWorkbook, rereadSheet, summarise, type ImportRecord, type Mapping, type ReadSheet, type ReadWorkbook, type SheetKind } from "@/lib/ngo-import/read";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Confirm, Failed, day, errText } from "../../kit";
import { importCall, keepOriginal, readBatches, type ImportBatch } from "../../data/ngo-setup";
import { Grid, Holding, TryLink, plural, useWho, type GCol } from "./frame";

/* Import: the register the team already keeps, read on this device (every sheet, its kind, its columns and its
   dates; contact columns stay here), then sent in small resumable steps to /api/partner/import (start, rows, finish)
   with the original kept privately in the imports bucket. Sending the same file again, or next month's longer
   copy, adds only the new rows. Imported rows stay labelled imported until someone checks them. */

type Totals = { animals: number; cases: number; care: number; followUps: number; already: number; held: number };
type Held = { sheet: string; row: number; reason?: string };
const ZERO: Totals = { animals: 0, cases: 0, care: 0, followUps: 0, already: 0, held: 0 };
const KINDS: SheetKind[] = ["rescue", "treatment", "vaccination", "sterilisation", "follow_up", "adoption", "animal", "skip"];
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CRUMB: [string, string] = ["Settings", "Import a register"];
type Phase = "pick" | "reading" | "review" | "importing" | "paused" | "done";

export function Import() {
  const who = useWho();
  if (!who.ready) return <Holding crumb={CRUMB} text="Opening…" />;
  if (who.notNgo) return <Holding crumb={CRUMB} title="Import a register" text="Registers are imported into an NGO workspace. Your account is not part of one." />;
  return <Shell crumb={CRUMB}><div className="nx-page ns-page" style={{ maxWidth: 920 }}><Flow sample={who.sample} /></div></Shell>;
}

function Flow({ sample }: { sample: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [book, setBook] = useState<ReadWorkbook | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(0);
  const [totals, setTotals] = useState<Totals>(ZERO);
  const [held, setHeld] = useState<Held[]>([]);
  const [past, setPast] = useState<ImportBatch[] | null>(null);
  const [pastErr, setPastErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [asking, setAsking] = useState(false);
  const XLSX = useRef<typeof import("xlsx") | null>(null);
  const run = useRef<{ batchId: string; chunk: number; upload: { path: string; token: string } | null } | null>(null);
  const loadPast = useCallback(() => { if (sample) return; readBatches().then((b) => { setPast(b); setPastErr(null); }).catch((e) => setPastErr(errText(e))); }, [sample]);
  useEffect(() => { loadPast(); }, [loadPast, phase]);

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
    } catch (e) { setErr(errText(e)); setPhase("pick"); }
  };
  /* A register attached in Kaju arrives here ready to read. */
  useEffect(() => { const w = window as unknown as { __spPendingImport?: File }; const f = w.__spPendingImport; if (!f || sample) return; w.__spPendingImport = undefined; void choose(f); }, [sample]);
  const change = (name: string, kind: SheetKind, mapping?: Mapping, year?: number | null) => {
    if (!book || !data || !XLSX.current) return;
    setBook({ ...book, sheets: book.sheets.map((s) => (s.name === name ? rereadSheet(XLSX.current!, data, book.fileName, s, kind, mapping ?? s.mapping, book.workbookYear, year ?? null) : s)) });
  };
  const records = useCallback(() => (book?.sheets ?? []).filter((s) => s.kind !== "skip").flatMap((s) => s.records), [book]);
  const go = async () => {
    if (!book || !file) return;
    setAsking(false);
    const list = records();
    setErr(null); setPhase("importing");
    try {
      if (!run.current) {
        const start = await importCall<{ batchId: string; chunk?: number; upload: { path: string; token: string } | null }>({ action: "start", fileName: file.name, hash: book.hash, total: list.length, hasCities: list.some((r) => r.city || r.lat != null), sheets: book.sheets.map((s) => ({ name: s.name, kind: s.kind, records: s.records.length })) });
        run.current = { batchId: start.batchId, chunk: start.chunk ?? 50, upload: start.upload };
        /* The original file is kept privately with the import, alongside it. */
        if (start.upload) void keepOriginal(start.upload, file).catch(() => { if (run.current) run.current.upload = null; });
      }
      const { batchId, chunk } = run.current;
      const sum = { ...totals };
      const heldRows = [...held];
      for (let i = sent; i < list.length; i += chunk) {
        const part: ImportRecord[] = list.slice(i, i + chunk);
        let result: (Totals & { rows: { outcome?: string; sheet: string; row: number; reason?: string }[] }) | null = null;
        for (let attempt = 0; attempt < 4 && !result; attempt++) {
          try { result = await importCall({ action: "rows", batchId, records: part }); }
          catch (e) { if ((e as { status?: number }).status === 401 || attempt === 3) throw e; await pause(1500 * (attempt + 1)); }
        }
        for (const k of Object.keys(ZERO) as (keyof Totals)[]) sum[k] += result![k] ?? 0;
        heldRows.push(...result!.rows.filter((r) => r.outcome === "held").map(({ sheet, row, reason }) => ({ sheet, row, reason })));
        setTotals({ ...sum }); setHeld([...heldRows]); setSent(Math.min(list.length, i + chunk));
      }
      await importCall({ action: "finish", batchId, ...sum, imported: list.length - sum.held, storedPath: run.current.upload?.path ?? null });
      setPhase("done");
    } catch (e) { setErr(errText(e)); setPhase("paused"); }
  };
  const reset = () => { setFile(null); setData(null); setBook(null); setSent(0); setTotals(ZERO); setHeld([]); setErr(null); run.current = null; setPhase("pick"); };
  const sum = book ? summarise(book.sheets) : null;
  const total = book ? records().length : 0;
  const pct = total ? Math.round((sent / total) * 100) : 0;
  const step = phase === "pick" || phase === "reading" ? 1 : phase === "review" ? 2 : 3;
  const pastCols: GCol<ImportBatch>[] = [
    { label: "File", width: "minmax(0, 2fr)", render: (b) => <span className="nx-cell-main"><span><b>{b.source_filename}</b><small>{b.status === "imported" ? `${b.rows_imported ?? 0} rows` : "Import the same file again to continue"}</small></span></span> },
    { label: "Date", width: "120px", render: (b) => <span className="nx-t3">{day(b.created_at)}</span> },
    { label: "Status", width: "120px", keep: true, render: (b) => <Chip tone={b.status === "imported" ? "ok" : "warn"}>{b.status === "imported" ? "Imported" : "Not finished"}</Chip> },
  ];
  return (
    <>
      <div className="nx-head"><div><p className="nx-eyebrow">Settings</p><h1 className="nx-h1">Import a register{sample ? <Sample /> : null}</h1><p className="nx-sub">The register your team already keeps, as it is. Imported rows stay labelled imported; sending the same file again adds only the new rows.</p></div></div>
      <ol className="ns-steps" aria-label="Steps">{["Choose a file", "Check what was read", "Import"].map((t, i) => <li key={t} aria-current={step === i + 1 ? "step" : undefined} className={step > i + 1 ? "is-done" : undefined}><span aria-hidden>{step > i + 1 ? "✓" : i + 1}</span>{t}</li>)}</ol>
      {err ? <p className="nx-note ns-note-bad" role="alert"><span>{err}</span></p> : null}
      {(phase === "pick" || phase === "reading") ? (sample ? <div className="ns-drop"><Upload size={20} /><b>Drop your register here, or choose it</b><small>Excel or CSV. Read on this device; phone numbers and contact columns never leave it.</small><div style={{ marginTop: 8 }}><TryLink>Open the live demo to import</TryLink></div></div>
        : <label className={`ns-drop ${drag ? "is-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void choose(e.dataTransfer.files?.[0] ?? null); }}>
          {phase === "reading" ? <span className="nx-spin" aria-hidden><RotateCcw size={20} /></span> : <Upload size={20} />}
          <b>{phase === "reading" ? `Reading ${file?.name}…` : "Drop your register here, or choose it"}</b>
          <small>Excel or CSV. Read on this device; phone numbers and contact columns never leave it.</small>
          <input type="file" accept=".xlsx,.xls,.csv" disabled={phase === "reading"} onChange={(e) => void choose(e.target.files?.[0] ?? null)} aria-label="Choose a register to import" />
        </label>) : null}
      {book && sum && (phase === "review" || phase === "importing" || phase === "paused") ? <section className="ns-sec">
        <div className="nx-sec-h"><h2 className="ns-wrap">{book.fileName}</h2></div>
        <p className="ns-sum"><b>{plural(sum.records, "record")} about {plural(sum.animals, "animal")}.</b> {[sum.rescue && plural(sum.rescue, "rescue"), sum.treatment && plural(sum.treatment, "treatment"), sum.sterilisation && plural(sum.sterilisation, "sterilisation"), sum.vaccination && plural(sum.vaccination, "vaccination"), sum.followUp && plural(sum.followUp, "follow-up"), sum.adoption && plural(sum.adoption, "adoption"), sum.animal && plural(sum.animal, "animal listed", "animals listed")].filter(Boolean).join(" · ")}{sum.notDogs ? ` ${plural(sum.notDogs, "row")} about other animals or owned pets will be left out.` : ""}</p>
        <div style={{ marginTop: 8 }}>{book.sheets.map((s) => <Sheet key={s.name} s={s} busy={phase !== "review"} onKind={(k) => change(s.name, k)} onMap={(m) => change(s.name, s.kind, m, s.year)} onYear={(y) => change(s.name, s.kind, s.mapping, y)} />)}</div>
        {phase === "review" ? <div className="ns-acts"><button type="button" className="nx-btn" disabled={!total} onClick={() => setAsking(true)}>Import {plural(total, "record")}</button><button type="button" className="nx-btn is-quiet" onClick={reset}>Choose another file</button></div> : null}
        {phase === "importing" || phase === "paused" ? <div className="ns-progress" role="status" aria-live="polite">
          <span className="ns-meter" aria-hidden><i style={{ width: `${pct}%` }} /></span>
          <p className="ns-sum"><b>{sent.toLocaleString("en-IN")}</b> of {total.toLocaleString("en-IN")} records{phase === "importing" ? " · keep this page open" : ""}</p>
          {phase === "paused" ? <div><button type="button" className="nx-btn" onClick={() => void go()}><RotateCcw size={13} />Continue from row {(sent + 1).toLocaleString("en-IN")}</button></div> : null}
        </div> : null}
      </section> : null}
      {phase === "done" ? <section className="ns-sec">
        <div className="nx-sec-h"><h2>Imported</h2></div>
        <p className="ns-sum"><b>{totals.animals ? `${plural(totals.animals, "new animal")} on your register.` : "Your register is up to date."}</b> Open cases from the register wait in Cases, under Imported.</p>
        <dl className="ns-dl" style={{ marginTop: 8 }}><div><dt>New animals</dt><dd>{totals.animals}</dd></div><div><dt>Cases</dt><dd>{totals.cases}</dd></div><div><dt>Care records</dt><dd>{totals.care}</dd></div><div><dt>Follow-ups ahead</dt><dd>{totals.followUps}</dd></div>{totals.already ? <div><dt>Already imported</dt><dd>{totals.already}</dd></div> : null}</dl>
        {held.length ? <details className="ns-details"><summary>{plural(held.length, "row")} left out</summary><ul className="ns-list">{held.slice(0, 200).map((h, i) => <li key={i}><span className="ns-mono">{h.sheet} · row {h.row}</span> {h.reason}</li>)}</ul></details> : null}
        <div className="ns-acts"><Link className="nx-btn" href="/next/ngo/animals">See your animals</Link><Link className="nx-btn is-quiet" href="/next/ngo/cases">Imported cases</Link><button type="button" className="nx-btn is-quiet" onClick={reset}>Import another file</button></div>
      </section> : null}
      {!sample ? <section className="ns-sec"><div className="nx-sec-h"><h2>Earlier imports</h2>{past ? <span className="nx-count">{past.length}</span> : null}</div>
        {pastErr ? <Failed error={`Earlier imports could not be read. ${pastErr}`} retry={loadPast} /> : past === null ? <p className="nx-sub">Reading…</p> : <Grid label="Earlier imports" cols={pastCols} rows={past} rowKey={(b) => b.id} empty={<b>No earlier imports.</b>} />}
      </section> : null}
      {asking && book ? <Confirm title="Import this register" confirm={`Import ${plural(total, "record")}`} onClose={() => setAsking(false)} onConfirm={() => void go()}><p>{plural(total, "record")} from {book.fileName} are added to your organisation, in small steps, labelled imported. The original file is kept privately with the import. If it stops, you can continue from where it stopped.</p></Confirm> : null}
    </>
  );
}

function Sheet({ s, busy, onKind, onMap, onYear }: { s: ReadSheet; busy: boolean; onKind: (k: SheetKind) => void; onMap: (m: Mapping) => void; onYear: (y: number) => void }) {
  const notes = s.records.filter((r) => r.notes.length).length;
  const thisYear = new Date().getFullYear();
  return (
    <div className={`ns-sheet ${s.kind === "skip" ? "is-skip" : ""}`}>
      <div className="ns-sheet-h">
        <div><b style={{ fontWeight: 500 }}>{s.name}</b><p className="ns-small">{s.kind === "skip" ? s.reason : `${s.records.length.toLocaleString("en-IN")} records${s.empty ? ` · ${s.empty} blank or total rows skipped` : ""}`}</p></div>
        <select className="ns-sel" value={s.kind} disabled={busy} aria-label={`What ${s.name} holds`} onChange={(e) => onKind(e.target.value as SheetKind)}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
      </div>
      {s.kind !== "skip" ? <>
        {s.yearless > 0 || s.privateColumns.length > 0 || notes > 0 ? <p className="ns-small" style={{ display: "flex", gap: "4px 14px", flexWrap: "wrap", alignItems: "center" }}>
          {s.yearless > 0 ? <span>Dates without a year read as <select className="ns-sel" value={s.year ?? thisYear} disabled={busy} onChange={(e) => onYear(Number(e.target.value))} aria-label={`Year for undated rows in ${s.name}`}>{Array.from({ length: 12 }, (_, i) => thisYear - i).map((y) => <option key={y} value={y}>{y}</option>)}</select></span> : null}
          {s.privateColumns.length ? <span>Kept on this device: {s.privateColumns.join(", ")}</span> : null}
          {notes ? <span>{plural(notes, "row")} with a cell that could not be read; the rest of the row is kept</span> : null}
        </p> : null}
        <details className="ns-details"><summary>Columns</summary>
          <div className="ns-colmap">{FIELDS.map((f) => <label key={f} className="nx-field"><span>{FIELD_LABEL[f]}</span><select value={s.mapping[f] ?? ""} disabled={busy} onChange={(e) => onMap({ ...s.mapping, [f]: e.target.value || undefined })}><option value="">Not in this sheet</option>{s.headers.filter((h) => !s.privateColumns.includes(h)).map((h) => <option key={h} value={h}>{h}</option>)}</select></label>)}</div>
        </details>
      </> : null}
    </div>
  );
}
