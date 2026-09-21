"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";

/* tKey names an entry in the nav dictionary. An item without one keeps its
   English label, which is the honest outcome while translation is partial:
   a reader sees their language where it exists and English where it does
   not, rather than a half-translated sentence. */
type NavKey = keyof Dictionary["nav"];
type NavItem = {
  label: string;
  href: string;
  tKey?: NavKey;
  /* Items with children open a panel; the parent stays a real link so it
     still works on touch and for anyone navigating by keyboard. */
  children?: { label: string; href: string; note: string; tKey?: NavKey }[];
};

const LINKS: NavItem[] = [
  { label: "Mission", href: "/mission", tKey: "mission" },
  {
    label: "Get involved",
    href: "/how-to-help",
    children: [
      { label: "Report an animal", href: "/report", note: "A photo and a place is enough" },
      { label: "Volunteer with an organisation", href: "/get-involved", note: "Routed to a named group near you" },
      { label: "What an area needs", href: "/take-action", note: "Pick a place, see what its data says" },
      { label: "For NGOs", href: "/for-ngos", note: "Bring your team's records in", tKey: "forNgos" },
      { label: "For funders", href: "/for-funders", note: "Scope and cost a programme" },
      { label: "For municipal bodies", href: "/for-governments", note: "Ward coverage you can audit", tKey: "forGovernments" },
    ],
  },
  { label: "For NGOs", href: "/for-ngos", tKey: "forNgos" },
  { label: "Partners", href: "/partners" },
  /* A core area, not a resources page: it is where somebody goes before an
     animal becomes a case, and it carries partner teaching material. */
  { label: "Education", href: "/education" },
  { label: "Evidence", href: "/evidence" },
];

export function SiteHeader() {
  const { t } = useLocale();
  /* Falls back to the English label written in LINKS whenever an item has
     no dictionary key, so adding a nav item never risks a blank label. */
  const label = (item: { label: string; tKey?: NavKey }) =>
    item.tKey ? t.nav[item.tKey] : item.label;
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
            >
              <button
                type="button"
                className="sp-nav-trigger"
                aria-expanded={menu === l.href}
                aria-haspopup="true"
                onClick={() => setMenu((current) => current === l.href ? null : l.href)}
              >
                {label(l)}
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
                    <b>{label(c)}</b>
                    <span>{c.note}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link key={l.href} href={l.href} onClick={closeAll}>
              {label(l)}
            </Link>
          )
        )}
      </nav>

      <div className="sp-header-actions">
        {/* The way in for anyone holding six characters from their
            organisation. Secondary to the app, but next to it and visible:
            it used to inherit the body's dark ink onto a dark header and
            was effectively invisible. */}
        {/* Two labels, one link. Below ~380px the bar cannot hold the
            wordmark, this label, the CTA and the menu button at once — the
            previous attempt squeezed this into a 52px two-line box at 10px
            and the menu button still ended up 55px past the right edge,
            unreachable, because the page does not scroll sideways. The
            short label buys back the width without truncating a word. */}
        <Link href="/join" className="sp-header-code">
          <span className="sp-header-code-long">I have a code</span>
          <span className="sp-header-code-short">Code</span>
        </Link>
        <Link href="/app?choose=1" className="sp-header-cta">
          Open app <ArrowUpRight size={15} />
        </Link>
        <LanguageSwitcher />
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
