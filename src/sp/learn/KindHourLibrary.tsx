"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { KIND_HOUR_MATERIALS } from "@/lib/platform/education";
import "./academy-focus.css";

/** The Foundation's original documents remain intact, credited and linked. */
export function KindHourLibrary() {
  const [index, setIndex] = useState(0);
  const [preview, setPreview] = useState(false);
  const m = KIND_HOUR_MATERIALS[index];
  const choose = (i: number) => { setIndex(i); setPreview(false); };
  return <section className="kh-library" aria-labelledby="kh-title">
    <header><p className="k">Classroom library</p><h2 id="kh-title">The Kind Hour Foundation</h2><p>Original teaching materials on animals, empathy and coexistence.</p></header>
    <label className="kh-picker"><span>Choose a document</span><select className="select" value={index} onChange={e => choose(Number(e.target.value))}>{KIND_HOUR_MATERIALS.map((d, i) => <option key={d.id} value={i}>{d.title}</option>)}</select></label>
    <div className="kh-feature">
      <div className={`kh-cover is-${m.id}`} aria-hidden="true"><span>The Kind Hour Foundation</span><FileText size={32} /><b>{m.title}</b><small>{m.languages}</small></div>
      <div className="kh-reading"><p className="kh-meta">{m.audience} · {m.slides} slides</p><h3>{m.title}</h3><p>{m.purpose}</p><ul className="kh-themes">{m.themes.map(t => <li key={t}>{t}</li>)}</ul><p className={`kh-facilitator${m.id === "hello" ? " is-sensitive" : ""}`}><b>{m.id === "hello" ? "Content note" : "StrayPaw’s facilitator note"}</b>{m.facilitatorNote}</p><div className="row"><a className="btn is-ink" href={m.driveUrl} target="_blank" rel="noreferrer">Open original document<ArrowUpRight size={16} aria-hidden /></a><button type="button" className="btn" aria-expanded={preview} aria-controls="kh-preview" onClick={() => setPreview(v => !v)}>{preview ? "Close preview" : "Preview here"}</button></div></div>
    </div>
    {preview && <div id="kh-preview" className="kh-preview"><header><b>{m.title} · original document</b><button type="button" className="icon-btn" onClick={() => setPreview(false)} aria-label="Close document preview"><X size={18} aria-hidden /></button></header><iframe key={m.id} src={m.driveUrl.replace(/\/view$/, "/preview")} title={`${m.title}, by The Kind Hour Foundation`} loading="lazy" allowFullScreen /><p className="small">If Google Drive cannot display the preview, use “Open original document”.</p></div>}
    <footer><span>{index + 1} of {KIND_HOUR_MATERIALS.length} documents</span><div><button type="button" className="icon-btn" disabled={index === 0} onClick={() => choose(index - 1)} aria-label="Previous document"><ChevronLeft size={18} aria-hidden /></button><button type="button" className="icon-btn" disabled={index === KIND_HOUR_MATERIALS.length - 1} onClick={() => choose(index + 1)} aria-label="Next document"><ChevronRight size={18} aria-hidden /></button></div></footer>
    <p className="kh-credit">Created by The Kind Hour Foundation. Originals open from their shared Google Drive. StrayPaw’s facilitation notes are labelled separately.</p>
  </section>;
}
