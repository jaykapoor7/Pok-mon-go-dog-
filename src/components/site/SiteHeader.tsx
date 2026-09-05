"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  /* Items with children open a panel; the parent stays a real link so it
     still works on touch and for anyone navigating by keyboard. */
  children?: { label: string; href: string; note: string }[];
};

const LINKS: NavItem[] = [
  { label: "Why StrayPaw", href: "/why-straypaw" },
  { label: "The network", href: "/the-network" },
  {
    label: "How you can help",
    href: "/how-to-help",
    children: [
      { label: "Report an animal", href: "/report", note: "A photo and a place is enough" },
      { label: "Volunteer with an organisation", href: "/get-involved", note: "Routed to a named group near you" },
      { label: "What an area needs", href: "/take-action", note: "Pick a place, see what its data says" },
      { label: "For NGOs", href: "/for-ngos", note: "Bring your team's records in" },
      { label: "For funders", href: "/for-funders", note: "Scope and cost a programme" },
    ],
  },
  {
    label: "The data",
    href: "/the-data",
    children: [
      { label: "Published data", href: "/data", note: "Counts by area, with the method and who collected it" },
      { label: "The evidence", href: "/evidence", note: "What is known, what is missing, what it would cost" },
      { label: "Sources", href: "/sources", note: "Every figure on this site, and where it came from" },
    ],
  },
  {
    label: "Help",
    href: "/faq",
    children: [
      { label: "Questions", href: "/faq", note: "How reporting, codes and dashboards work" },
      { label: "Contact us", href: "/contact", note: "Anything the questions do not cover" },
    ],
  },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  /* Close the dropdown on outside click and on Escape, both expected of a
     menu, and without them it strands open over the page. */
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const closeAll = () => {
    setOpen(false);
    setMenu(null);
  };

  return (
    <header className="sp-header">
      <Link href="/" className="sp-wordmark" aria-label="StrayPaw home">
        <StrayPawMark />
        <span>StrayPaw</span>
      </Link>

      <nav ref={navRef} className={`sp-nav ${open ? "open" : ""}`}>
        {LINKS.map((l) =>
          l.children ? (
            <div
              key={l.href}
              className={`sp-nav-group ${menu === l.href ? "on" : ""}`}
              onMouseEnter={() => setMenu(l.href)}
              onMouseLeave={() => setMenu(null)}
            >
              <button
                type="button"
                className="sp-nav-trigger"
                aria-expanded={menu === l.href}
                aria-haspopup="true"
                onClick={() => setMenu(menu === l.href ? null : l.href)}
              >
                {l.label}
                <ChevronDown size={13} />
              </button>

              <div className="sp-nav-panel" role="menu">
                {l.href === "/how-to-help" && (
                  <Link href={l.href} className="sp-nav-lead" onClick={closeAll}>
                    <b>Everything you can do</b>
                    <span>The whole picture, in one page</span>
                  </Link>
                )}
                {l.children.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="sp-nav-item"
                    role="menuitem"
                    onClick={closeAll}
                  >
                    <b>{c.label}</b>
                    <span>{c.note}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link key={l.href} href={l.href} onClick={closeAll}>
              {l.label}
            </Link>
          )
        )}
      </nav>

      <div className="sp-header-actions">
        {/* The way in for anyone holding six characters from their
            organisation. Secondary to the app, but next to it and visible:
            it used to inherit the body's dark ink onto a dark header and
            was effectively invisible. */}
        <Link href="/join" className="sp-header-code">
          I have a code
        </Link>
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

/** Minimal signal mark, three points on a ring. */
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
      {/* locate ring, the identity half of the mark */}
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
