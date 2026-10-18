"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ROLE_META, readStoredRole } from "@/lib/roles";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import "./header.css";

/* ════════════════════════════════════════════════════════════════════
   The site header.

   StrayPaw · Explore · For organisations · Open app. Explore is the live
   Map; For organisations opens a short panel (NGOs first, municipalities,
   applying, signing in with an invitation). Beside them, quietly, the
   language and the one strong action: into the app. Everything else lives
   in the footer index. The bar is glass over whatever it sits on — night
   over the landing, paper over a page.

   tKey names an entry in the nav dictionary. An item without one keeps its
   English label while translation is partial.
   ════════════════════════════════════════════════════════════════════ */

type NavKey = keyof Dictionary["nav"];
type NavItem = { label: string; href: string; tKey?: NavKey };

const LINKS: NavItem[] = [{ label: "Explore", href: "/explore" }];
const ORGS = [
  { label: "For NGOs", sub: "Cases, care, follow-ups and animal histories in one workspace", href: "/for-ngos" },
  { label: "For municipalities", sub: "Recorded coverage, programmes and gaps, by area", href: "/for-governments" },
  { label: "Get StrayPaw for your NGO", sub: "Apply for access", href: "/partner-apply" },
  { label: "Sign in with your code", sub: "For members of an organisation", href: "/join" },
];

export function SiteHeader({ tone = "paper" }: { tone?: "paper" | "night" }) {
  const { t } = useLocale();
  const pathname = usePathname() ?? "";
  const label = (item: { label: string; tKey?: NavKey }) => (item.tKey ? t.nav[item.tKey] : item.label);
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState(false);
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

  /* The phone menu closes on Escape. */
  useEffect(() => {
    if (!open && !orgs) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setOrgs(false); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, orgs]);

  const closeAll = () => { setOpen(false); setOrgs(false); };
  const here = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className={`sp-header is-${tone} ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="sp-header-bar">
        <Link href="/" className="sp-wordmark" aria-label="StrayPaw home">
          <StrayPawMark />
          <span>StrayPaw</span>
        </Link>

        <nav className={`sp-nav ${open ? "open" : ""}`} aria-label="Site">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={closeAll} aria-current={here(l.href) ? "page" : undefined} className={here(l.href) ? "is-here" : ""}>
              {label(l)}
            </Link>
          ))}
          <div className={`sp-orgs${orgs ? " is-open" : ""}`} onMouseLeave={() => setOrgs(false)}>
            <button type="button" className={here("/for-ngos") || here("/for-governments") ? "is-here" : ""} aria-expanded={orgs} aria-controls="sp-orgs-panel" onClick={() => setOrgs((v) => !v)}>
              For organisations <ChevronDown size={14} aria-hidden />
            </button>
            <div id="sp-orgs-panel" className="sp-orgs-panel" hidden={!orgs}>
              {ORGS.map((o) => <Link key={o.href} href={o.href} onClick={closeAll}><b>{o.label}</b><small>{o.sub}</small></Link>)}
            </div>
          </div>
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
