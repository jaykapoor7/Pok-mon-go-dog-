"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ROLE_META, readStoredRole } from "@/lib/roles";
import { ArrowUpRight, Menu, X } from "lucide-react";
import "./header.css";

/* ════════════════════════════════════════════════════════════════════
   The site header, one bar on every company page.

   StrayPaw · Product · Explore Map · For Organisations · Our Story ·
   Contact, and the one strong action, Open App. Glass over its ground:
   night over a dark page, paper over a light one. On a phone the links
   open as a full-screen sheet: the five places large, the shortcuts
   residents and teams need most beneath them, and Open App at the thumb.
   ════════════════════════════════════════════════════════════════════ */

type NavKey = keyof Dictionary["nav"];
type NavItem = { label: string; href: string; tKey?: NavKey; also?: string[] };

const LINKS: NavItem[] = [
  { label: "Product", href: "/product" },
  { label: "Explore Map", href: "/explore", also: ["/community", "/map"] },
  { label: "For Organisations", href: "/organisations", also: ["/for-ngos", "/for-governments", "/for-funders"] },
  { label: "Our Story", href: "/our-story", also: ["/about"] },
  { label: "Contact", href: "/contact" },
];
const SHORTCUTS = [
  { label: "Report an animal", href: "/community/report" },
  { label: "For NGOs", href: "/for-ngos" },
  { label: "For municipalities", href: "/for-governments" },
  { label: "Sign in with your code", href: "/join" },
];

export function SiteHeader({ tone = "paper" }: { tone?: "paper" | "night" }) {
  const { t } = useLocale();
  const pathname = usePathname() ?? "";
  const label = (item: { label: string; tKey?: NavKey }) => (item.tKey ? t.nav[item.tKey] : item.label);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  /* Someone who has picked a space before goes straight back to it; the
     picker is for the first visit, and is one "Switch space" away after. */
  const [appHref, setAppHref] = useState("/app?choose=1");

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

  /* The sheet closes on Escape, holds the page still behind it, and closes when the page changes. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);

  const here = (l: NavItem) => [l.href, ...(l.also ?? [])].some((h) => pathname === h || pathname.startsWith(h + "/"));

  return (
    <header className={`sp-header is-${tone} ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="sp-header-bar">
        <Link href="/" className="sp-wordmark" aria-label="StrayPaw home">
          <StrayPawMark />
          <span>StrayPaw</span>
        </Link>

        <nav className="sp-nav" aria-label="Site">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={here(l) ? "page" : undefined} className={here(l) ? "is-here" : ""}>
              {label(l)}
            </Link>
          ))}
        </nav>

        <div className="sp-header-actions">
          <LanguageSwitcher />
          <Link href={appHref} prefetch className="sp-header-cta">
            Open App <ArrowUpRight size={15} />
          </Link>
          <button className="sp-menu-btn" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="sp-sheet">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div id="sp-sheet" className="sp-sheet" hidden={!open}>
        <nav aria-label="Site, menu">
          <ol>
            {LINKS.map((l, i) => (
              <li key={l.href} style={{ ["--i" as string]: i }}>
                <Link href={l.href} onClick={() => setOpen(false)} aria-current={here(l) ? "page" : undefined}>
                  <span>{label(l)}</span><ArrowUpRight size={20} aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
          <ul className="sp-sheet-short">
            {SHORTCUTS.map((l) => <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)}>{l.label}</Link></li>)}
          </ul>
        </nav>
        <Link href={appHref} className="sp-sheet-cta" onClick={() => setOpen(false)}>Open App <ArrowUpRight size={18} aria-hidden /></Link>
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
