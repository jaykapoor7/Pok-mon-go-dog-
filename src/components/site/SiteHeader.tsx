"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ROLE_META, readStoredRole } from "@/lib/roles";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import "./header.css";

/* ════════════════════════════════════════════════════════════════════
   The site header, one bar on every public page.

   StrayPaw · Product · Solutions · Our Story, and the one strong action,
   Open App. At the top of a page it lies flat across the paper; once
   the page moves it lifts into a floating, ink-framed pill. A coral
   brushstroke marks where you are and slides to whatever you point at.
   On a phone the menu opens as a painted sheet that blooms out of the
   button: the three places large, the shortcuts residents and teams need
   most beneath them, Open App at the thumb.
   ════════════════════════════════════════════════════════════════════ */

type NavKey = keyof Dictionary["nav"];
type NavItem = { label: string; href: string; tKey?: NavKey; also?: string[]; hint?: string };

export const AUDIENCES = [
  { label: "Community", href: "/for-community", hint: "Report animals. Follow updates." },
  { label: "NGOs & Rescues", href: "/for-ngos", hint: "Manage cases. Coordinate care." },
  { label: "Municipalities", href: "/for-governments", hint: "Plan programmes. Track coverage." },
  { label: "Feeders", href: "/for-feeders", hint: "Know your animals. Record care." },
  { label: "Education", href: "/education", hint: "Learn, teach and share." },
];
const LINKS: NavItem[] = [
  { label: "Explore", href: "/explore", hint: "The Living Atlas" },
  { label: "Our Story", href: "/our-story", also: ["/about"], hint: "Why we exist" },
];
const SHORTCUTS = [
  { label: "Report an animal", href: "/community/report" },
  { label: "Explore the map", href: "/explore" },
  { label: "Sign in with your code", href: "/join" },
  { label: "Contact", href: "/contact" },
  { label: "Learning resources", href: "/learn/resources" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function SiteHeader({ tone = "paper" }: { tone?: "paper" | "night" }) {
  const { t } = useLocale();
  const pathname = usePathname() ?? "";
  const label = (item: { label: string; tKey?: NavKey }) => (item.tKey ? t.nav[item.tKey] : item.label);
  const [open, setOpen] = useState(false);
  const [audiencesOpen, setAudiencesOpen] = useState(false);
  const audienceMenu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!audiencesOpen) return;
    const close = (e: PointerEvent) => { if (!audienceMenu.current?.contains(e.target as Node)) setAudiencesOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setAudiencesOpen(false); audienceMenu.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [audiencesOpen]);
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

  const header = useRef<HTMLElement>(null);

  /* The sheet closes on Escape, holds the page still behind it, and closes when the page changes. */
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
      if (e.key !== "Tab") return;
      const items = Array.from(header.current?.querySelectorAll<HTMLElement>(".sp-menu-btn, #sp-sheet a") ?? []).filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => header.current?.querySelector<HTMLElement>("#sp-sheet a")?.focus());
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; if (previous?.isConnected) previous.focus(); };

  }, [open]);
  useEffect(() => { setOpen(false); setAudiencesOpen(false); }, [pathname]);

  const here = (l: NavItem) => [l.href, ...(l.also ?? [])].some((h) => pathname === h || pathname.startsWith(h + "/"));

  /* the brushstroke: under the current page, sliding to whatever is pointed at */
  const nav = useRef<HTMLElement>(null);
  const place = (el: HTMLElement | null) => {
    const n = nav.current; if (!n) return;
    if (!el) { n.style.setProperty("--iw", "0px"); return; }
    n.style.setProperty("--ix", `${el.offsetLeft + 10}px`); n.style.setProperty("--iw", `${el.offsetWidth - 20}px`);
  };
  const rest = () => place(nav.current?.querySelector<HTMLElement>("a.is-here") ?? null);
  useLayoutEffect(rest, [pathname]);

  return (
    <header ref={header} className={`sp-header is-${tone} ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="sp-header-bar">
        <Link href="/" className="sp-wordmark" aria-label="StrayPaw home">
          <StrayPawMark />
          <span>StrayPaw</span>
        </Link>

        <nav className="sp-nav" aria-label="Site" ref={nav} onMouseLeave={rest}>
          {LINKS.slice(0, 1).map((l) => (
            <Link key={l.href} href={l.href} aria-current={here(l) ? "page" : undefined} className={here(l) ? "is-here" : ""} onMouseEnter={(e) => place(e.currentTarget)} onFocus={(e) => place(e.currentTarget)} onBlur={rest}>
              {label(l)}
            </Link>
          ))}
          <div className="sp-audiences" ref={audienceMenu} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAudiencesOpen(false); }}>
            <button type="button" aria-expanded={audiencesOpen} aria-controls="sp-audiences" onClick={() => setAudiencesOpen(v => !v)} onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); setAudiencesOpen(true); requestAnimationFrame(() => audienceMenu.current?.querySelector("a")?.focus()); } }}>Who It’s For <ChevronDown size={14} aria-hidden /></button>
            <div id="sp-audiences" className="sp-audience-menu" hidden={!audiencesOpen}>
              {AUDIENCES.map(l => <Link key={l.href} href={l.href} onClick={() => setAudiencesOpen(false)} aria-current={pathname === l.href ? "page" : undefined}><span>{l.label}</span><small>{l.hint}</small></Link>)}
            </div>
          </div>
          <Link href="/our-story" aria-current={pathname === "/our-story" ? "page" : undefined} onMouseEnter={e => place(e.currentTarget)} onFocus={e => place(e.currentTarget)}>Our Story</Link>
        </nav>

        <div className="sp-header-actions">
          <LanguageSwitcher />
          <Link href={appHref} prefetch className="sp-header-cta">
            Open App <ArrowUpRight size={15} aria-hidden />
          </Link>
          <button type="button" className="sp-menu-btn" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="sp-sheet">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div id="sp-sheet" className="sp-sheet" data-open={open ? "1" : "0"} aria-hidden={!open} inert={!open ? true : undefined}>
        <nav aria-label="Site, menu">
          <ol>
            {[LINKS[0], ...AUDIENCES, LINKS[1]].map((l, i) => (
              <li key={l.href} style={{ ["--i" as string]: i }}>
                <Link href={l.href} onClick={() => setOpen(false)} aria-current={here(l) ? "page" : undefined}>
                  <i aria-hidden>{String(i + 1).padStart(2, "0")}</i><span>{label(l)}<small>{l.hint}</small></span><ArrowUpRight size={22} aria-hidden />
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
