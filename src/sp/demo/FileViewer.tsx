"use client";

/* Recording build only: opens the file Kaju just made, the way it opens on
   the coordinator's laptop. The deck is the real .pptx rendered to slides;
   the ledger is the real .xlsx read in the browser. */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import "./viewer.css";

type Open = { kind: "pptx" | "xlsx"; title: string } | null;
export const openDemoFile = (kind: "pptx" | "xlsx", title: string) => window.dispatchEvent(new CustomEvent("sp-demo-open", { detail: { kind, title } }));

export function DemoFileViewer() {
  const [open, setOpen] = useState<Open>(null);
  const [slide, setSlide] = useState(1);
  const [sheet, setSheet] = useState<string[][] | null>(null);
  useEffect(() => {
    const on = (e: Event) => { setSlide(1); setOpen((e as CustomEvent).detail); };
    window.addEventListener("sp-demo-open", on);
    return () => window.removeEventListener("sp-demo-open", on);
  }, []);
  useEffect(() => {
    if (open?.kind !== "pptx") return;
    const t = window.setInterval(() => setSlide((n) => (n % 5) + 1), 1500);
    return () => window.clearInterval(t);
  }, [open]);
  useEffect(() => {
    if (open?.kind !== "xlsx" || sheet) return;
    void (async () => {
      const XLSX = await import("xlsx");
      const buf = await (await fetch("/walkthrough/October-2026-ABC-ledger.xlsx")).arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      setSheet(XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Ledger, { header: 1, raw: false, defval: "" }) as string[][]);
    })();
  }, [open, sheet]);
  if (!open) return null;
  const app = open.kind === "pptx" ? "PowerPoint" : "Excel";
  const file = open.kind === "pptx" ? "October-2026-ABC-board-deck.pptx" : "October-2026-ABC-ledger.xlsx";
  const cols = "ABCDEFGHI".split("");
  return (
    <div className="dv-back" role="dialog" aria-label={`${file} opened`}>
      <div className={`dv-win is-${open.kind}`}>
        <header className="dv-bar">
          <span className="dv-dots" aria-hidden><i /><i /><i /></span>
          <b>{file}</b><span className="dv-app">{app} · Saved to Google Drive</span>
          <button type="button" className="dv-x" onClick={() => setOpen(null)} aria-label="Close file"><X size={16} /></button>
        </header>
        {open.kind === "pptx" ? (
          <div className="dv-deck">
            <ol className="dv-thumbs">{[1, 2, 3, 4, 5].map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <li key={n} className={n === slide ? "is-on" : undefined}><span>{n}</span><img src={`/walkthrough/deck-${n}.png`} alt="" /></li>
            ))}</ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="dv-stage"><img src={`/walkthrough/deck-${slide}.png`} alt={`Slide ${slide}`} /></div>
          </div>
        ) : (
          <div className="dv-sheet">
            <div className="dv-fx"><span>A1</span><i>fx</i><span>Record</span></div>
            <div className="dv-grid">
              <table>
                <thead><tr><th />{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{(sheet ?? []).slice(0, 40).map((r, i) => (
                  <tr key={i} className={i === 0 ? "is-head" : undefined}><th>{i + 1}</th>{cols.map((_, j) => <td key={j} className={j >= 6 ? "is-num" : undefined}>{r[j] ?? ""}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
            <footer className="dv-tabs"><span className="is-on">Ledger</span><span>About</span><em>{sheet ? `${sheet.length - 2} records · Sum of Amount (₹): ${Number(sheet[sheet.length - 1]?.[8] ?? 0).toLocaleString("en-IN")}` : ""}</em></footer>
          </div>
        )}
      </div>
    </div>
  );
}
