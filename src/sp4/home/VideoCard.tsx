"use client";

/* A small card in the corner, after the storage notice is acknowledged and the visitor has scrolled a little:
   "Watch Kaju in 52 seconds". Opens the product demo (illustrative records,
   labelled in the video). Dismissed once, it stays dismissed on this device. */

import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

const KEY = "sp.videocard.dismissed";

export function VideoCard() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let off = false;
    try { off = localStorage.getItem(KEY) === "1"; } catch { /* storage blocked */ }
    if (off) return;
    // Never on top of the storage notice: the card waits until that notice is
    // acknowledged, then appears after the visitor has scrolled a little.
    let seen = false;
    try { seen = !!localStorage.getItem("straypaw.notice.storage.v1"); } catch { seen = true; }
    // Only once the hero (and its demo) has scrolled away, so it never covers the product.
    const past = () => { const h = document.querySelector(".s4-hero"); return h ? h.getBoundingClientRect().bottom < 0 : window.scrollY > 700; };
    const on = () => { if (seen && past()) { setShow(true); window.removeEventListener("scroll", on); } };
    const ack = () => { seen = true; on(); };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("straypaw:storage-notice-dismissed", ack);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("straypaw:storage-notice-dismissed", ack); };
  }, []);
  useEffect(() => { const d = dlg.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  const dismiss = () => { setShow(false); try { localStorage.setItem(KEY, "1"); } catch { /* fine */ } };
  return (
    <>
      {show && (
        <aside className="s6-vcard" aria-label="Product demo video">
          <button type="button" className="s6-vcard-x" onClick={dismiss} aria-label="Dismiss"><X size={14} /></button>
          <button type="button" className="s6-vcard-play" onClick={() => setOpen(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/video/kaju-demo-poster.jpg" alt="" width={320} height={180} />
            <span className="s6-vcard-btn" aria-hidden><Play size={16} fill="currentColor" /></span>
          </button>
          <b>Watch Kaju in 52 seconds</b>
          <p>From a field voice note to an accepted report package. Product demo, illustrative records.</p>
        </aside>
      )}
      <dialog ref={dlg} className="s6-vdlg" aria-label="Kaju product demo" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === dlg.current) setOpen(false); }}>
        <button type="button" className="s6-vdlg-x" onClick={() => setOpen(false)} aria-label="Close video"><X size={18} /></button>
        {open && <video src="/video/kaju-demo.mp4" poster="/video/kaju-demo-poster.jpg" controls autoPlay playsInline />}
      </dialog>
    </>
  );
}
