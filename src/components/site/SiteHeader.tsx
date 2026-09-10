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
  { label: "Mission", href: "/mission" },
  {
    label: "Get involved",
    href: "/how-to-help",
    children: [
      { label: "Report an animal", href: "/report", note: "A photo and a place is enough" },
      { label: "Volunteer with an organisation", href: "/get-involved", note: "Routed to a named group near you" },
      { label: "What an area needs", href: "/take-action", note: "Pick a place, see what its data says" },
      { label: "For NGOs", href: "/for-ngos", note: "Bring your team's records in" },
      { label: "For funders", href: "/for-funders", note: "Scope and cost a programme" },
    ],
  },
  { label: "For NGOs", href: "/for-ngos" },
  { label: "Evidence", href: "/evidence" },
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
        <Link href="/app?choose=1" className="sp-header-cta">
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

/** The StrayPaw mark: the dog looking over the rim of its circle.
 *
 * Restored. A generated S-path replaced this for a while; the wordmark
 * beside it already says "StrayPaw", so a second S was saying the same
 * thing twice, and it dropped the animal out of the brand entirely.
 *
 * A raster rather than an SVG: the artwork has soft strokes and a specific
 * weight that a hand-traced path flattens. At these sizes a 512px source is
 * a few kilobytes and never blurs. */
export function StrayPawMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/straypaw-mark.png"
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      style={{
        flexShrink: 0,
        borderRadius: "50%",
        display: "block",
        boxShadow: "0 0 0 1px rgba(11,16,32,0.12)",
      }}
    />
  );
}
