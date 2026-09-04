"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const LINKS = [
  { label: "Why StrayPaw", href: "/why-straypaw" },
  { label: "The network", href: "/the-network" },
  { label: "For funders", href: "/for-funders" },
  { label: "For NGOs", href: "/for-ngos" },
  { label: "The data", href: "/the-data" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sp-header">
      <Link href="/" className="sp-wordmark" aria-label="StrayPaw home">
        <StrayPawMark />
        <span>straypaw</span>
      </Link>

      <nav className={`sp-nav ${open ? "open" : ""}`}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
      </nav>

      <div className="sp-header-actions">
        <Link href="/map" className="sp-header-cta">
          Open app <ArrowUpRight size={15} />
        </Link>
        <button
          className="sp-menu-btn"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </header>
  );
}

/** Minimal signal mark — three points on a ring. */
export function StrayPawMark({ size = 21 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 21"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="10.5" cy="10.5" r="10" stroke="currentColor" strokeWidth="1" />
      <circle cx="5.5" cy="6.5" r="1.6" fill="currentColor" />
      <circle cx="15.5" cy="6.5" r="1.6" fill="currentColor" />
      <circle cx="10.5" cy="15.5" r="1.6" fill="currentColor" />
    </svg>
  );
}
