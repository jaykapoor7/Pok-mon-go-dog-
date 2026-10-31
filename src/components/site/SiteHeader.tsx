"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, Menu, Sparkles, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import "@/sp3/sp3.css";
import "@/sp3/legacy.css";
import "@/sp4/sp4.css";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw site navigation, on every public page (StrayPaw 4).

   Built to the reference's structure: a one-line announcement bar, then a
   72px bar with the wordmark left, Platform ▾ · Solutions ▾ · Customers ·
   Resources ▾ · Security · Pricing centred, and Login · Book a demo right.
   Dropdowns are wide three-column panels: grey column titles, a title and
   one quiet line per link, no icons. A signed-in visitor sees "Open app"
   instead of "Login"; both go through /app.

   The props are kept so every existing page that renders <SiteHeader/>
   picks up the bar without an edit.
   ════════════════════════════════════════════════════════════════════ */

import { MEGA, type MegaCol } from "@/sp3/site/nav-data";
export { AUDIENCES, PLATFORM, RESOURCES, SOLUTIONS } from "@/sp3/site/nav-data";

type MenuId = "platform" | "solutions" | "resources";
const NOTICE_KEY = "sp4.notice.ai";

export function SiteHeader(props: { tone?: "paper" | "night"; overlay?: boolean; float?: boolean } = {}) {
  void props;
  const path = usePathname() ?? "";
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [sheet, setSheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notice, setNotice] = useState(true);
  const bar = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => { try { if (sessionStorage.getItem(NOTICE_KEY) === "0") setNotice(false); } catch { /* storage blocked */ } }, []);
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
  /* A click right after the hover that opened the same menu keeps it open
     (the pointer is already there); otherwise a click toggles. */
  const hoverOpened = useRef<{ id: MenuId; at: number } | null>(null);
  const toggle = (id: MenuId) => {
    const h = hoverOpened.current; hoverOpened.current = null;
    if (h && h.id === id && Date.now() - h.at < 1500) { setMenu(id); return; }
    setMenu((m) => (m === id ? null : id));
  };
  /* Pointer users open menus on hover, like the reference; a short delay
     on leave lets the pointer travel from the button into the panel.
     Touch input never hovers, so this only affects mice and trackpads. */
  const hover = (id: MenuId | null) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (id) { if (menu !== id) hoverOpened.current = { id, at: Date.now() }; setMenu(id); }
    else { hoverOpened.current = null; closeTimer.current = window.setTimeout(() => setMenu(null), 140); }
  };
  const dismiss = () => { setNotice(false); try { sessionStorage.setItem(NOTICE_KEY, "0"); } catch { /* fine */ } };

  return (
    <header ref={bar} className={`s4 s4-nav${scrolled ? " is-scrolled" : ""}`}>
      {notice && !sheet && (
        <div className="s4-notice">
          <p><Sparkles size={14} aria-hidden /> <span>New: StrayPaw AI is in every workspace.</span> <Link href="/ai">See how it works <ArrowRight size={14} aria-hidden /></Link></p>
          <button type="button" onClick={dismiss} aria-label="Dismiss announcement"><X size={16} /></button>
        </div>
      )}
      <div className="s4-wrap s4-nav-in">
        <Link href="/" className="s4-brand" aria-label="StrayPaw home"><StrayPawMark size={28} /><span>StrayPaw</span></Link>

        <nav className="s4-nav-links" aria-label="Site" onPointerLeave={(e) => { if (e.pointerType === "mouse") hover(null); }}>
          <Mega id="platform" label="Platform" open={menu === "platform"} onToggle={toggle} onHover={hover} cols={MEGA.platform}
            feature={<><div className="s4-mega-shot" aria-hidden><span className="s4-mega-q">Which Ward 14 releases lack a photo?</span><span className="s4-mega-a"><Sparkles size={11} /> Three of eighteen: SP-1031, SP-1044, SP-1067.</span><span className="s4-mega-c">Prepared by StrayPaw AI · confirmed by Anita</span></div><p>StrayPaw AI finds missing evidence and prepares records. A person confirms every change. <Link href="/ai">Learn more</Link></p></>} />
          <Mega id="solutions" label="Solutions" open={menu === "solutions"} onToggle={toggle} onHover={hover} cols={MEGA.solutions} />
          <Link href="/customers" onPointerEnter={(e) => { if (e.pointerType === "mouse") hover(null); }} aria-current={here("/customers") ? "page" : undefined}>Customers</Link>
          <Mega id="resources" label="Resources" open={menu === "resources"} onToggle={toggle} onHover={hover} cols={MEGA.resources} />
          <Link href="/security" onPointerEnter={(e) => { if (e.pointerType === "mouse") hover(null); }} aria-current={here("/security") ? "page" : undefined}>Security</Link>
          <Link href="/pricing" onPointerEnter={(e) => { if (e.pointerType === "mouse") hover(null); }} aria-current={here("/pricing") ? "page" : undefined}>Pricing</Link>
        </nav>

        <div className="s4-nav-end">
          {user
            ? <Link href="/app" className="s4-nav-signin">Open app</Link>
            : <Link href="/sign-in" className="s4-nav-signin">Login</Link>}
          <Link href="/demo" className="s4-btn is-primary is-sm s4-hide-m">Book a demo</Link>
          <button type="button" className="s4-burger" aria-label={sheet ? "Close menu" : "Open menu"} aria-expanded={sheet} aria-controls="s4-sheet" onClick={() => setSheet((v) => !v)}>
            {sheet ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div id="s4-sheet" className={`s4-sheet${sheet ? " is-open" : ""}`} aria-hidden={!sheet} inert={!sheet ? true : undefined}>
        <SheetGroup label="Platform" cols={MEGA.platform} />
        <SheetGroup label="Solutions" cols={MEGA.solutions} />
        <Link href="/customers">Customers</Link>
        <SheetGroup label="Resources" cols={MEGA.resources} />
        <Link href="/security">Security</Link>
        <Link href="/pricing">Pricing</Link>
        <div className="s4-sheet-cta">
          <Link href="/demo" className="s4-btn is-primary">Book a demo</Link>
          <Link href={user ? "/app" : "/sign-in"} className="s4-btn is-line">{user ? "Open app" : "Login"}</Link>
        </div>
      </div>
    </header>
  );
}

function Mega({ id, label, open, onToggle, onHover, cols, feature }: { id: MenuId; label: string; open: boolean; onToggle: (id: MenuId) => void; onHover: (id: MenuId | null) => void; cols: MegaCol[]; feature?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  /* Opened from the keyboard: focus the first link once the panel renders. */
  const focusFirst = useRef(false);
  useEffect(() => {
    if (open && focusFirst.current) { focusFirst.current = false; ref.current?.querySelector<HTMLElement>(".s4-mega a")?.focus(); }
  }, [open]);
  return (
    <div className="s4-dd" ref={ref} onPointerEnter={(e) => { if (e.pointerType === "mouse") onHover(id); }}
      onKeyDown={(e) => {
        if (!open) return;
        const links = Array.from(ref.current?.querySelectorAll<HTMLElement>(".s4-mega a") ?? []);
        const i = links.indexOf(document.activeElement as HTMLElement);
        if (e.key === "ArrowDown") { e.preventDefault(); links[(i + 1) % links.length]?.focus(); }
        if (e.key === "ArrowUp") { e.preventDefault(); links[(i - 1 + links.length) % links.length]?.focus(); }
      }}>
      <button type="button" aria-expanded={open} aria-controls={`s4-dd-${id}`} onClick={() => onToggle(id)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); e.stopPropagation(); focusFirst.current = true; onToggle(id); } }}>
        {label}<ChevronDown size={14} aria-hidden />
      </button>
      <div id={`s4-dd-${id}`} className="s4-mega" hidden={!open}>
        {cols.map((c) => (
          <div key={c.title} className="s4-mega-col">
            <p className="s4-mega-h">{c.title}</p>
            <ul>{c.links.map((l) => (
              <li key={l.href + l.label}><Link href={l.href} className="s4-dd-item"><b>{l.label}</b>{l.hint && <small>{l.hint}</small>}</Link></li>
            ))}</ul>
          </div>
        ))}
        {feature && <div className="s4-mega-col is-feature">{feature}</div>}
      </div>
    </div>
  );
}

function SheetGroup({ label, cols }: { label: string; cols: MegaCol[] }) {
  return (
    <details>
      <summary>{label}<ChevronDown size={20} aria-hidden /></summary>
      <div>{cols.flatMap((c) => c.links).map((l) => <Link key={l.href + l.label} href={l.href}><b>{l.label}</b>{l.hint && <small>{l.hint}</small>}</Link>)}</div>
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
