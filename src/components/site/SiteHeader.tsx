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
        <span>StrayPaw</span>
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
  /* A paw whose pad is a map pin: the animal and its location in one form,
     which is the whole product. Geometric enough to hold at 16px in the
     console nav, and drawn in currentColor so it inherits whatever ground
     it sits on. */
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* locate ring — the identity half of the mark */}
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeOpacity="0.45"
      />
      {/* toes */}
      <circle cx="7.7" cy="8.6" r="1.75" fill="currentColor" />
      <circle cx="12" cy="7.15" r="1.85" fill="currentColor" />
      <circle cx="16.3" cy="8.6" r="1.75" fill="currentColor" />
      {/* pad, shaped as a pin: round shoulders tapering to a point below */}
      <path
        d="M12 11.1c2.5 0 4.3 1.85 4.3 4.05 0 1.5-.85 2.5-1.95 3.4L12 20.9l-2.35-2.35c-1.1-.9-1.95-1.9-1.95-3.4C7.7 12.95 9.5 11.1 12 11.1z"
        fill="currentColor"
      />
    </svg>
  );
}
