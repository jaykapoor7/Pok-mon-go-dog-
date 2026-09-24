"use client";

/* What a reader can do with a record: follow it, share it, open it on the
   map, take it out. Following is kept on this device; sharing uses the
   phone's own share sheet where there is one; the export carries only
   what the page itself shows. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Download, Link2, Map as MapIcon, MessageCircle, Printer, Share2, Star } from "lucide-react";
import { useFollows } from "@/lib/follows";
import { haptic } from "@/lib/haptics";

type Row = { date: string; kind: string; title: string; source: string };
const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function RecordActions({ id, label, place, mapHref, rows, straypawId }: {
  id: string; label: string; place: string | null; mapHref: string; rows: Row[]; straypawId: string | null;
}) {
  const { isFollowing, toggle } = useFollows();
  const [on, setOn] = useState(false);
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setOn(isFollowing(id)), [id, isFollowing]);
  useEffect(() => {
    if (!share && !exportOpen) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) { setShare(false); setExportOpen(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setShare(false); setExportOpen(false); } };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [share, exportOpen]);

  const url = () => `${window.location.origin}/dog/${id}`;
  const text = `${label}${place ? `, ${place}` : ""} — on the StrayPaw register.`;
  const nativeShare = async () => {
    haptic("light");
    if (navigator.share) { try { await navigator.share({ title: `${label} · StrayPaw`, text, url: url() }); return; } catch { /* cancelled */ } }
    setShare((v) => !v);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url()); setCopied(true); haptic("success"); setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ } };
  const csv = () => {
    const body = ["straypaw_id,animal,place,date,kind,event,source", ...rows.map((r) => [straypawId ?? id, label, place, r.date.slice(0, 10), r.kind, r.title, r.source].map(esc).join(","))].join("\n");
    const href = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = href; a.download = `${(straypawId ?? label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-record.csv`; a.click();
    URL.revokeObjectURL(href);
    setExportOpen(false);
  };

  return (
    <div className="lr-actions" ref={box}>
      <button type="button" className={`lr-act ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => { toggle(id); setOn(!on); haptic(on ? "select" : "success"); }}>
        <Star size={15} className={on ? "is-filled" : ""} /> {on ? "Following" : "Follow"}
      </button>
      <div className="lr-pop-host">
        <button type="button" className="lr-act" aria-expanded={share} onClick={nativeShare}><Share2 size={15} /> Share</button>
        {share && (
          <div className="lr-pop" role="dialog" aria-label="Share this record">
            <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${typeof window !== "undefined" ? url() : ""}`)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
            <button type="button" onClick={copy}>{copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? "Link copied" : "Copy the link"}</button>
          </div>
        )}
      </div>
      <Link href={mapHref} className="lr-act"><MapIcon size={15} /> See on the map</Link>
      <div className="lr-pop-host">
        <button type="button" className="lr-act" aria-expanded={exportOpen} onClick={() => setExportOpen((v) => !v)}><Download size={15} /> Export</button>
        {exportOpen && (
          <div className="lr-pop" role="dialog" aria-label="Export this record">
            <button type="button" onClick={csv}><Download size={15} /> The record, as CSV</button>
            <button type="button" onClick={() => { setExportOpen(false); window.print(); }}><Printer size={15} /> Print or save as PDF</button>
          </div>
        )}
      </div>
    </div>
  );
}
