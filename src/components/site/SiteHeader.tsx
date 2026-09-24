"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import "./header.css";

/* ════════════════════════════════════════════════════════════════════
   The site header.

   The map and the figures are what StrayPaw is, so they lead the bar;
   what to do and who it is for follow, and the pages about StrayPaw sit
   behind one "About". The bar is glass over whatever it sits on — night
   over the landing plate, paper over a page — so the plate is never cut
   off by a white slab. On a phone it is two rows: the wordmark and the
   way into the app, then the four places people actually go, always in
   reach without opening a menu.

   tKey names an entry in the nav dictionary. An item without one keeps its
   English label while translation is partial.
   ════════════════════════════════════════════════════════════════════ */

type NavKey = keyof Dictionary["nav"];
type Child = { label: string; href: string; note: string; tKey?: NavKey };
type NavItem = { label: string; href: string; tKey?: NavKey; children?: Child[] };

const LINKS: NavItem[] = [
  { label: "Map", href: "/map" },
  { label: "Insights", href: "/insights" },
  {
    label: "Get involved",
    href: "/how-to-help",
    children: [
      { label: "Report an animal", href: "/report", note: "A photo and a place is enough" },
      { label: "Volunteer with an organisation", href: "/get-involved", note: "Routed to a named group near you" },
      { label: "What an area needs", href: "/take-action", note: "Pick a place, see what its data says" },
      { label: "For funders", href: "/for-funders", note: "Scope and cost a programme" },
      { label: "For municipal bodies", href: "/for-governments", note: "Ward coverage you can audit", tKey: "forGovernments" },
    ],
  },
  { label: "For NGOs", href: "/for-ngos", tKey: "forNgos" },
  {
    label: "About",
    href: "/mission",
    children: [
      { label: "Mission", href: "/mission", note: "Why a shared record, and why now", tKey: "mission" },
      { label: "Organisations", href: "/orgs", note: "Who is already doing this, by state" },
      { label: "Partners", href: "/partners", note: "The organisations working on StrayPaw" },
      { label: "Education", href: "/education", note: "Before an animal becomes a case" },
      { label: "Evidence", href: "/evidence", note: "What the research says, and how we use it" },
    ],
  },
];
/* The phone's second row: where people actually go. */
const QUICK = [
  { label: "Map", href: "/map" },
  { label: "Insights", href: "/insights" },
  { label: "Report", href: "/report" },
  { label: "For NGOs", href: "/for-ngos" },
  { label: "Organisations", href: "/orgs" },
];

export function SiteHeader({ tone = "paper" }: { tone?: "paper" | "night" }) {
  const { t } = useLocale();
  const pathname = usePathname() ?? "";
  const label = (item: { label: string; tKey?: NavKey }) => (item.tKey ? t.nav[item.tKey] : item.label);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  /* Close the dropdown on outside click and on Escape. */
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!navRef.current?.contains(e.target as Node)) setMenu(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  const closeAll = () => { setOpen(false); setMenu(null); };
  const here = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className={`sp-header is-${tone} ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="sp-header-bar">
        <Link href="/" className="sp-wordmark" aria-label="StrayPaw home">
          <StrayPawMark />
          <span>StrayPaw</span>
        </Link>

        <nav ref={navRef} className={`sp-nav ${open ? "open" : ""}`} aria-label="Site">
          {LINKS.map((l) =>
            l.children ? (
              <div key={l.label} className={`sp-nav-group ${menu === l.label ? "on" : ""}`}>
                <button type="button" className={`sp-nav-trigger ${l.children.some((c) => here(c.href)) ? "is-here" : ""}`}
                  aria-expanded={menu === l.label} aria-haspopup="true" onClick={() => setMenu((m) => (m === l.label ? null : l.label))}>
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
                    <Link key={c.href} href={c.href} className="sp-nav-item" role="menuitem" onClick={closeAll}>
                      <b>{label(c)}</b>
                      <span>{c.note}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={l.href} href={l.href} onClick={closeAll} aria-current={here(l.href) ? "page" : undefined} className={here(l.href) ? "is-here" : ""}>
                {label(l)}
              </Link>
            ),
          )}
        </nav>

        <div className="sp-header-actions">
          <Link href="/join" className="sp-header-code">
            <span className="sp-header-code-long">I have a code</span>
            <span className="sp-header-code-short">Code</span>
          </Link>
          <Link href="/app?choose=1" className="sp-header-cta">
            Open app <ArrowUpRight size={15} />
          </Link>
          <LanguageSwitcher />
          <button className="sp-menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <nav className="sp-quick" aria-label="Quick links">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className={here(q.href) ? "is-here" : ""} aria-current={here(q.href) ? "page" : undefined}>{q.label}</Link>
        ))}
      </nav>
    </header>
  );
}

/** The StrayPaw mark: the dog looking over the rim of its circle. A raster
 *  rather than an SVG: the artwork has soft strokes a traced path flattens. */
export function StrayPawMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/straypaw-mark.png" alt="" width={size} height={size} aria-hidden="true"
      style={{ flexShrink: 0, borderRadius: "50%", display: "block", boxShadow: "0 0 0 1px rgba(11,16,32,0.12)" }} />
  );
}
