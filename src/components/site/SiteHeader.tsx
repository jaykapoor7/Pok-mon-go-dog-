"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import "@/sp3/sp3.css";
import "@/sp3/legacy.css";
import "@/sp4/sp4.css";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw site navigation, on every public page (StrayPaw 4).

   StrayPaw · Platform ▾ · Solutions ▾ · Customers · Resources ▾ ·
   Security — Sign in · Book a demo. Links sit centred in a 72px bar, as in
   the reference. A signed-in visitor sees "Open app" instead of "Sign in";
   both go through /app, which sends a person to the workspace their
   account can actually use.

   The props are kept so every existing page that renders <SiteHeader/>
   picks up the bar without an edit.
   ════════════════════════════════════════════════════════════════════ */

import { PLATFORM, RESOURCES, SOLUTIONS, type Item } from "@/sp3/site/nav-data";
export { AUDIENCES, PLATFORM, RESOURCES, SOLUTIONS } from "@/sp3/site/nav-data";

type MenuId = "platform" | "solutions" | "resources";

export function SiteHeader(props: { tone?: "paper" | "night"; overlay?: boolean; float?: boolean } = {}) {
  void props;
  const path = usePathname() ?? "";
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [sheet, setSheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => { setMenu(null); setSheet(false); }, [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!menu && !sheet) return;
    const out = (e: PointerEvent) => { if (!bar.current?.contains(e.target as Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menu) bar.current?.querySelector<HTMLElement>(`[aria-controls="s4-dd-${menu}"]`)?.focus();
      setMenu(null); setSheet(false);
    };
    document.addEventListener("pointerdown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [menu, sheet]);
  /* The phone menu holds focus while open and gives it back to the button on close. */
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const burger = bar.current?.querySelector<HTMLElement>(".s4-burger");
    const focusables = () => Array.from(bar.current?.querySelectorAll<HTMLElement>(".s4-burger, #s4-sheet summary, #s4-sheet a") ?? []).filter((el) => el.getClientRects().length);
    const frame = requestAnimationFrame(() => bar.current?.querySelector<HTMLElement>("#s4-sheet summary, #s4-sheet a")?.focus());
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const f = focusables(); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", trap); document.body.style.overflow = prev; if (burger?.isConnected) burger.focus(); };
  }, [sheet]);

  const here = (href: string) => path === href || path.startsWith(href + "/");
  const toggle = (id: MenuId) => setMenu((m) => (m === id ? null : id));

  return (
    <header ref={bar} className={`s4 s4-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="s4-wrap s4-nav-in">
        <Link href="/" className="s4-brand" aria-label="StrayPaw home"><StrayPawMark size={28} /><span>StrayPaw</span></Link>

        <nav className="s4-nav-links" aria-label="Site">
          <Dropdown id="platform" label="Platform" open={menu === "platform"} onToggle={toggle} items={PLATFORM} wide
            side={<><b>ABC Operations & Verification</b><p>Record every animal from capture to release, check the evidence, and hand the reviewing office a report package it can accept.</p><Link className="s4-link" href="/abc-operations">See how it works <ArrowRight size={14} /></Link></>} />
          <Dropdown id="solutions" label="Solutions" open={menu === "solutions"} onToggle={toggle} items={SOLUTIONS} />
          <Link href="/customers" aria-current={here("/customers") ? "page" : undefined}>Customers</Link>
          <Dropdown id="resources" label="Resources" open={menu === "resources"} onToggle={toggle} items={RESOURCES}
            foot={<><Link href="/faq">FAQ</Link><Link href="/our-story">Our story</Link><Link href="/data-governance">Data governance</Link><Link href="/contact">Contact</Link></>} />
          <Link href="/security" aria-current={here("/security") ? "page" : undefined}>Security</Link>
        </nav>

        <div className="s4-nav-end">
          {user
            ? <Link href="/app" className="s4-nav-signin">Open app</Link>
            : <Link href="/sign-in" className="s4-nav-signin">Sign in</Link>}
          <Link href="/demo" className="s4-btn is-primary is-sm s4-hide-m">Book a demo</Link>
          <button type="button" className="s4-burger" aria-label={sheet ? "Close menu" : "Open menu"} aria-expanded={sheet} aria-controls="s4-sheet" onClick={() => setSheet((v) => !v)}>
            {sheet ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div id="s4-sheet" className={`s4-sheet${sheet ? " is-open" : ""}`} aria-hidden={!sheet} inert={!sheet ? true : undefined}>
        <SheetGroup label="Platform" items={PLATFORM} />
        <SheetGroup label="Solutions" items={SOLUTIONS} />
        <Link href="/customers">Customers</Link>
        <SheetGroup label="Resources" items={[...RESOURCES, { href: "/faq", label: "FAQ", hint: "Common questions", icon: null }]} />
        <Link href="/security">Security</Link>
        <div className="s4-sheet-cta">
          <Link href="/demo" className="s4-btn is-primary">Book a demo</Link>
          <Link href={user ? "/app" : "/sign-in"} className="s4-btn is-line">{user ? "Open app" : "Sign in"}</Link>
        </div>
      </div>
    </header>
  );
}

function Dropdown({ id, label, open, onToggle, items, side, foot, wide }: { id: MenuId; label: string; open: boolean; onToggle: (id: MenuId) => void; items: Item[]; side?: ReactNode; foot?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  /* Opened from the keyboard: focus the first item once the menu is rendered. */
  const focusFirst = useRef(false);
  useEffect(() => {
    if (open && focusFirst.current) { focusFirst.current = false; ref.current?.querySelector<HTMLElement>(".s4-dd-menu a")?.focus(); }
  }, [open]);
  return (
    <div className="s4-dd" ref={ref}
      onKeyDown={(e) => {
        if (!open) return;
        const links = Array.from(ref.current?.querySelectorAll<HTMLElement>(".s4-dd-menu a") ?? []);
        const i = links.indexOf(document.activeElement as HTMLElement);
        if (e.key === "ArrowDown") { e.preventDefault(); links[(i + 1) % links.length]?.focus(); }
        if (e.key === "ArrowUp") { e.preventDefault(); links[(i - 1 + links.length) % links.length]?.focus(); }
      }}>
      <button type="button" aria-expanded={open} aria-controls={`s4-dd-${id}`} onClick={() => onToggle(id)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); e.stopPropagation(); focusFirst.current = true; onToggle(id); } }}>
        {label}<ChevronDown size={14} aria-hidden />
      </button>
      <div id={`s4-dd-${id}`} className={`s4-dd-menu${wide ? " is-wide" : ""}`} hidden={!open}>
        {side ? <><div style={{ display: "grid", gap: 2 }}>{items.map((it) => <DdItem key={it.href} it={it} />)}</div><div className="s4-dd-side">{side}</div></>
          : <div style={{ display: "grid", gap: 2 }}>{items.map((it) => <DdItem key={it.href + it.label} it={it} />)}</div>}
        {foot && <div className="s4-dd-foot">{foot}</div>}
      </div>
    </div>
  );
}

function DdItem({ it }: { it: Item }) {
  return <Link href={it.href} className="s4-dd-item"><span className={`s4-ico c-${it.tone ?? "blue"}`} aria-hidden>{it.icon}</span><span><b>{it.label}</b><small>{it.hint}</small></span></Link>;
}

function SheetGroup({ label, items }: { label: string; items: Item[] }) {
  return (
    <details>
      <summary>{label}<ChevronDown size={20} aria-hidden /></summary>
      <div>{items.map((it) => <Link key={it.href + it.label} href={it.href}><b>{it.label}</b><small>{it.hint}</small></Link>)}</div>
    </details>
  );
}

/** The StrayPaw mark: the dog looking over the rim of its circle. */
export function StrayPawMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/straypaw-mark.png" alt="" width={size} height={size} aria-hidden="true"
      style={{ flexShrink: 0, borderRadius: "50%", display: "block", boxShadow: "0 0 0 1px rgba(11,16,32,0.12)" }} />
  );
}
