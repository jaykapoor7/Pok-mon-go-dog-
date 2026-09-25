"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ROLE_META, readStoredRole } from "@/lib/roles";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import "./header.css";

/* ════════════════════════════════════════════════════════════════════
   The site header.

   The map and the figures are what StrayPaw is, so they lead the bar;
   what to do and who it is for sit behind "Get involved", and the pages
   about StrayPaw behind "About". One way into the app. The bar is glass over whatever it sits on — night
   over the landing plate, paper over a page — so the plate is never cut
   off by a white slab. On a phone it is one row: the wordmark, the way
   into the app and the menu, which holds everything else.

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
      { label: "For NGOs", href: "/for-ngos", note: "Run field work on one shared record", tKey: "forNgos" },
      { label: "Volunteer", href: "/get-involved", note: "With an organisation near you" },
      { label: "For funders", href: "/for-funders", note: "Scope and cost a programme" },
      { label: "For municipal bodies", href: "/for-governments", note: "Ward coverage you can audit", tKey: "forGovernments" },
      { label: "I have a code", href: "/join", note: "Join the team that invited you" },
    ],
  },
  {
    label: "About",
    href: "/mission",
    children: [
      { label: "Mission", href: "/mission", note: "Why a shared record, and why now", tKey: "mission" },
      { label: "Organisations", href: "/orgs", note: "Who is doing this work, by state" },
      { label: "Evidence", href: "/evidence", note: "What the research says" },
      { label: "Education", href: "/education", note: "Before an animal becomes a case" },
    ],
  },
];

export function SiteHeader({ tone = "paper" }: { tone?: "paper" | "night" }) {
  const { t } = useLocale();
  const pathname = usePathname() ?? "";
  const label = (item: { label: string; tKey?: NavKey }) => (item.tKey ? t.nav[item.tKey] : item.label);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  /* Someone who has picked a space before goes straight back to it; the
     picker is for the first visit, and is one "Switch space" away after. */
  const [appHref, setAppHref] = useState("/app?choose=1");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const role = readStoredRole();
    if (role) setAppHref(ROLE_META[role].home);
  }, []);

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
          <LanguageSwitcher />
          <Link href={appHref} prefetch className="sp-header-cta">
            Open app <ArrowUpRight size={15} />
          </Link>
          <button className="sp-menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
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
