"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import "@/sp3/sp3.css";
import "@/sp3/legacy.css";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw 3.0 site navigation, on every public page.

   StrayPaw · Platform ▾ · StrayPaw AI · Solutions ▾ · Customers ·
   Resources ▾ · Sign in · Book a demo. A signed-in visitor sees "Open app"
   instead of "Sign in"; both go through /app, which sends a person to the
   workspace their account can actually use.

   The props are kept so every existing page that renders <SiteHeader/>
   picks up the new bar without an edit; tone/overlay/float no longer change
   the look (one bar, one identity).
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
    const on = () => setScrolled(window.scrollY > 6);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!menu && !sheet) return;
    const out = (e: PointerEvent) => { if (!bar.current?.contains(e.target as Node)) { setMenu(null); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(null); setSheet(false); } };
    document.addEventListener("pointerdown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [menu, sheet]);
  /* The phone menu holds focus while open and gives it back to the button on close. */
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const burger = bar.current?.querySelector<HTMLElement>(".s3-burger");
    const focusables = () => Array.from(bar.current?.querySelectorAll<HTMLElement>(".s3-burger, #s3-sheet summary, #s3-sheet a") ?? []).filter((el) => el.getClientRects().length);
    const frame = requestAnimationFrame(() => bar.current?.querySelector<HTMLElement>("#s3-sheet summary, #s3-sheet a")?.focus());
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
    <header ref={bar} className={`s3-root s3-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="s3-nav-in">
        <Link href="/" className="s3-brand" aria-label="StrayPaw home"><StrayPawMark size={30} /><span>StrayPaw</span></Link>

        <nav className="s3-nav-links" aria-label="Site">
          <Dropdown id="platform" label="Platform" open={menu === "platform"} onToggle={toggle} items={PLATFORM} wide
            side={<><b>Every intervention. Accounted for.</b><p>One record for the programme, the animal and the evidence, shared by the NGO doing the work and the office overseeing it.</p><Link className="s3-link" href="/platform">See the platform <ArrowRight size={14} /></Link></>} />
          <Link href="/ai" aria-current={here("/ai") ? "page" : undefined}>StrayPaw AI</Link>
          <Dropdown id="solutions" label="Solutions" open={menu === "solutions"} onToggle={toggle} items={SOLUTIONS}
            foot={<><span>Also for</span><Link href="/for-community">Community</Link><Link href="/for-feeders">Feeders</Link><Link href="/education">Education</Link></>} />
          <Link href="/customers" aria-current={here("/customers") ? "page" : undefined}>Customers</Link>
          <Dropdown id="resources" label="Resources" open={menu === "resources"} onToggle={toggle} items={RESOURCES}
            foot={<><Link href="/our-story">Our story</Link><Link href="/faq">FAQ</Link><Link href="/data-governance">Data governance</Link><Link href="/contact">Contact</Link></>} />
        </nav>

        <div className="s3-nav-end">
          {user
            ? <Link href="/app" className="s3-nav-signin">Open app</Link>
            : <Link href="/sign-in" className="s3-nav-signin">Sign in</Link>}
          <Link href="/demo" className="s3-btn is-primary is-sm s3-hide-m">Book a demo</Link>
          <button type="button" className="s3-burger" aria-label={sheet ? "Close menu" : "Open menu"} aria-expanded={sheet} aria-controls="s3-sheet" onClick={() => setSheet((v) => !v)}>
            {sheet ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div id="s3-sheet" className={`s3-sheet${sheet ? " is-open" : ""}`} aria-hidden={!sheet} inert={!sheet ? true : undefined}>
        <SheetGroup label="Platform" items={PLATFORM} />
        <Link href="/ai">StrayPaw AI</Link>
        <SheetGroup label="Solutions" items={[...SOLUTIONS, { href: "/for-community", label: "Community", hint: "Report and follow street animals", icon: null }, { href: "/education", label: "Education", hint: "Learn, teach and share", icon: null }]} />
        <Link href="/customers">Customers</Link>
        <SheetGroup label="Resources" items={RESOURCES} />
        <div className="s3-sheet-cta">
          <Link href="/demo" className="s3-btn is-primary">Book a demo</Link>
          <Link href={user ? "/app" : "/sign-in"} className="s3-btn is-line">{user ? "Open app" : "Sign in"}</Link>
        </div>
      </div>
    </header>
  );
}

function Dropdown({ id, label, open, onToggle, items, side, foot, wide }: { id: MenuId; label: string; open: boolean; onToggle: (id: MenuId) => void; items: Item[]; side?: ReactNode; foot?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="s3-dd" ref={ref}
      onKeyDown={(e) => {
        if (!open) return;
        const links = Array.from(ref.current?.querySelectorAll<HTMLElement>(".s3-dd-menu a") ?? []);
        const i = links.indexOf(document.activeElement as HTMLElement);
        if (e.key === "ArrowDown") { e.preventDefault(); links[(i + 1) % links.length]?.focus(); }
        if (e.key === "ArrowUp") { e.preventDefault(); links[(i - 1 + links.length) % links.length]?.focus(); }
      }}>
      <button type="button" aria-expanded={open} aria-controls={`s3-dd-${id}`} onClick={() => onToggle(id)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); onToggle(id); requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(".s3-dd-menu a")?.focus()); } }}>
        {label}<ChevronDown size={14} aria-hidden />
      </button>
      <div id={`s3-dd-${id}`} className={`s3-dd-menu${wide ? " is-wide" : ""}`} hidden={!open}>
        {side ? <><div style={{ display: "grid", gap: 2 }}>{items.map((it) => <DdItem key={it.href} it={it} />)}</div><div className="s3-dd-side">{side}</div></>
          : items.map((it) => <DdItem key={it.href} it={it} />)}
        {foot && <div className="s3-dd-foot">{foot}</div>}
      </div>
    </div>
  );
}

function DdItem({ it }: { it: Item }) {
  return <Link href={it.href} className="s3-dd-item"><span className="s3-ico" aria-hidden>{it.icon}</span><span><b>{it.label}</b><small>{it.hint}</small></span></Link>;
}

function SheetGroup({ label, items }: { label: string; items: Item[] }) {
  return (
    <details>
      <summary>{label}<ChevronDown size={18} aria-hidden /></summary>
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
