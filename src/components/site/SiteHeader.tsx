"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ROLE_META, readStoredRole } from "@/lib/roles";
import { ArrowUpRight, KeyRound, Menu, X } from "lucide-react";
import "./header.css";

/* ════════════════════════════════════════════════════════════════════
   The site header.

   Five places, no menus: what the record holds and where (Explore), who
   keeps it (About), what it teaches (Education), and the two teams that
   work from it (NGOs, Municipalities). Report and the map are not here; both are
   the first two things on the landing. Beside them, quietly, the language,
   the way in for someone holding an invitation, and the one strong action:
   into the app. The bar is glass over whatever it sits on — night over the
   landing plate, paper over a page. On a phone it is one row: the
   wordmark, the code, the app and the menu.

   tKey names an entry in the nav dictionary. An item without one keeps its
   English label while translation is partial.
   ════════════════════════════════════════════════════════════════════ */

type NavKey = keyof Dictionary["nav"];
type NavItem = { label: string; href: string; tKey?: NavKey };

const LINKS: NavItem[] = [
  { label: "Explore", href: "/explore" },
  { label: "About", href: "/about", tKey: "about" },
  { label: "Education", href: "/education" },
  { label: "NGOs", href: "/for-ngos" },
  { label: "Municipalities", href: "/for-governments" },
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

  /* The phone menu closes on Escape. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const closeAll = () => setOpen(false);
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
        </nav>

        <div className="sp-header-actions">
          <LanguageSwitcher />
          {/* Someone arriving from an invitation looks for this first: quiet, but always in the bar. */}
          <Link href="/join" className="sp-header-code" aria-label="I have a code" title="I have a code">
            <KeyRound size={15} aria-hidden /><span>I have a code</span>
          </Link>
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
