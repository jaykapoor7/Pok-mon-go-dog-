"use client";

/* The card that greets a first visit, bottom right: "Build your first Kaju
   workflow". One card only (it also carries the 52-second product video), it
   never covers the storage notice on a phone, and closing it is remembered. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play, X } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";

const KEY = "sp.welcome.first-workflow";
const NOTICE = "straypaw.notice.storage.v1";

export function Welcome() {
  const [show, setShow] = useState(false);
  const [video, setVideo] = useState(false);
  const [slim, setSlim] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let off = false;
    try { off = localStorage.getItem(KEY) === "1"; } catch { /* storage blocked */ }
    if (off) return;
    const phone = window.matchMedia("(max-width: 640px)").matches;
    setSlim(phone);
    let seen = true; try { seen = !!localStorage.getItem(NOTICE); } catch { /* blocked */ }
    let t = 0;
    const open = () => { t = window.setTimeout(() => setShow(true), 1200); };
    if (!phone || seen) open();
    const ack = () => { if (phone) open(); };
    window.addEventListener("straypaw:storage-notice-dismissed", ack);
    return () => { window.clearTimeout(t); window.removeEventListener("straypaw:storage-notice-dismissed", ack); };
  }, []);
  useEffect(() => { const d = dlg.current; if (!d) return; if (video && !d.open) d.showModal(); if (!video && d.open) d.close(); }, [video]);
  const close = () => { setShow(false); try { localStorage.setItem(KEY, "1"); } catch { /* fine */ } };
  return (
    <>
      {show && slim && (
        /* On a phone: one slim line that never covers the page. */
        <aside className="s7-welcome is-slim" aria-label="Build your first Kaju workflow">
          <span className="s7-welcome-kaju" aria-hidden><KajuFace size={26} /></span>
          <Link href="/demo" onClick={close}><b>Build your first Kaju workflow</b><small>Live session · 30 minutes</small></Link>
          <button type="button" className="s7-welcome-x" onClick={close} aria-label="Close"><X size={16} aria-hidden /></button>
        </aside>
      )}
      {show && !slim && (
        <aside className="s7-welcome" aria-label="Build your first Kaju workflow">
          <button type="button" className="s7-welcome-x" onClick={close} aria-label="Close"><X size={16} aria-hidden /></button>
          <span className="s7-welcome-kaju" aria-hidden><KajuFace size={40} /></span>
          <p className="s7-welcome-k">Live session · 30 minutes · online</p>
          <p className="s7-welcome-h" role="heading" aria-level={3}>Build your first Kaju workflow</p>
          <p>Bring one weekly job, like chasing missing release photos before the monthly bill. We set Kaju to run it on your own records, and you leave with it working.</p>
          <div className="s7-welcome-act">
            <Link href="/demo" className="s7-btn is-blue" onClick={close}>Save your spot <ArrowRight size={15} aria-hidden /></Link>
            <button type="button" className="s7-welcome-play" onClick={() => setVideo(true)}><Play size={13} aria-hidden /> Watch Kaju in 52 seconds</button>
          </div>
        </aside>
      )}
      <dialog ref={dlg} className="s6-vdlg" aria-label="Kaju product demo" onClose={() => setVideo(false)} onClick={(e) => { if (e.target === dlg.current) setVideo(false); }}>
        <button type="button" className="s6-vdlg-x" onClick={() => setVideo(false)} aria-label="Close video"><X size={18} /></button>
        {video && <video src="/video/kaju-demo.mp4" poster="/video/kaju-demo-poster.jpg" controls autoPlay playsInline />}
      </dialog>
    </>
  );
}
