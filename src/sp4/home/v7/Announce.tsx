"use client";

/* The one-line news bar above the navigation: blue, one item, dismissible.
   Dismissed once, it stays dismissed on this device for this item. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

const KEY = "sp.announce.kaju-everywhere";

export function Announce() {
  const [show, setShow] = useState(true);
  useEffect(() => { try { if (localStorage.getItem(KEY) === "1") setShow(false); } catch { /* storage blocked */ } }, []);
  if (!show) return null;
  return (
    <div className="s7-ann">
      <Link href="/kaju-agents"><b>New</b><span>Kaju in every workspace: NGO, government, community and field.</span><span className="s7-ann-go">See what Kaju does <ArrowRight size={14} aria-hidden /></span></Link>
      <button type="button" aria-label="Dismiss this announcement" onClick={() => { setShow(false); try { localStorage.setItem(KEY, "1"); } catch { /* fine */ } }}><X size={16} aria-hidden /></button>
    </div>
  );
}
