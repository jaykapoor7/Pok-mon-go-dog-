"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { BarChart3, Camera, ChevronLeft, ClipboardList, FileCheck2, FlaskConical, FolderKanban, Hash, Home, LayoutGrid, Menu as MenuIcon, MessageSquare, Moon, PawPrint, Plus, Radar, Route, Scissors, Settings, ShieldCheck, Sparkles, Stethoscope, Sun, Syringe, X } from "lucide-react";
import type { NavItem } from "./nav";
import { KAJU } from "./nav";
import { useReducedMotion } from "framer-motion";
import "./css/phone.css";

/* StrayPaw on a phone (docs/rebuild/MOBILE.md): a bar with the role's own daily destinations, one "+" for the
   records the role makes, and a Menu sheet that holds everything else the sidebar has. Nothing here renders on a
   desktop: the bar and both sheets are phone-only in phone.css. */

export type PhoneKind = "ngo" | "field" | "clinic" | "lab" | "vet" | "gov" | "office" | "research";
type Tab = { href: string; label: string; icon: typeof Home };

/** The role's daily places, in the order a thumb reaches them. Never a page from another workspace. */
export function phoneTabs(kind: PhoneKind, home: string): Tab[] {
  switch (kind) {
    case "ngo": return [{ href: home, label: "Today", icon: Home }, { href: "/ngo/cases", label: "Cases", icon: ClipboardList }, { href: "/ngo/animals", label: "Animals", icon: PawPrint }];
    /* A field worker: their own day with Kaju, then the records they work on. */
    case "field": return [{ href: home, label: "My day", icon: Home }, { href: "/ngo/cases", label: "Cases", icon: ClipboardList }, { href: "/ngo/animals", label: "Animals", icon: PawPrint }];
    case "clinic": return [{ href: home, label: "Today", icon: Home }, { href: "/health/bites", label: "Bites", icon: ClipboardList }, { href: "/health/pep", label: "PEP", icon: Syringe }];
    case "lab": return [{ href: home, label: "Queue", icon: Home }, { href: "/health/samples", label: "Samples", icon: FlaskConical }, { href: "/health/results", label: "Results", icon: FileCheck2 }];
    case "vet": return [{ href: home, label: "Today", icon: Home }, { href: "/health/patients", label: "Patients", icon: PawPrint }, { href: "/health/procedures", label: "Procedures", icon: Scissors }];
    case "office": return [{ href: home, label: "Overview", icon: BarChart3 }, { href: "/gov/verification", label: "Verify", icon: ShieldCheck }, { href: "/gov/programmes", label: "Programmes", icon: FolderKanban }];
    case "gov": return [{ href: home, label: "Overview", icon: BarChart3 }, { href: "/gov/programmes", label: "Programmes", icon: FolderKanban }, { href: "/gov/surveillance", label: "Surveillance", icon: Radar }];
    case "research": return [{ href: home, label: "Datasets", icon: LayoutGrid }, { href: "/research/explore", label: "Explore", icon: BarChart3 }, { href: "/research/studies", label: "Studies", icon: FolderKanban }];
  }
}

/** What "+" offers: Kaju first, then the records this role makes. Roles that make no records get no "+". */
export function phoneActions(kind: PhoneKind): { href: string; label: string; detail: string; icon: typeof Home }[] {
  /* The field home is field mode, so a field worker's "+" does not offer it again. */
  if (kind === "field") return phoneActions("ngo").filter((a) => a.href !== "/ngo/field");
  if (kind === "ngo") return [
    { href: "/ngo/field?record=1", label: "Record an animal", detail: "Photo, place and what you saw, works offline", icon: Camera },
    { href: "/ngo/cases/new", label: "Open a case", detail: "A rescue or a report that needs the team", icon: ClipboardList },
    { href: "/ngo/field", label: "Field mode", detail: "Today's round, one hand, offline", icon: Route },
  ];
  if (kind === "clinic") return [{ href: "/health/bites/new", label: "Record a bite", detail: "A bite, scratch or lick at the desk", icon: Stethoscope }];
  if (kind === "vet") return [{ href: "/health/care", label: "Record clinical care", detail: "Treatment, procedure or a check", icon: Stethoscope }];
  return [];
}

/** A sheet that rises from the bottom: focus stays inside, Escape and the backdrop close it, focus returns. */
export function Sheet({ open, onClose, label, children, full }: { open: boolean; onClose: () => void; label: string; children: ReactNode; full?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const calm = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("a,button,input")?.focus({ preventScroll: true });
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex='-1'])")];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; before?.focus?.({ preventScroll: true }); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={`ph-sheet-w ${calm ? "is-calm" : ""}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className={`ph-sheet ${full ? "is-full" : ""}`} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
        <div className="ph-grab" aria-hidden />
        <div className="ph-sheet-h"><h2 id={`${id}-t`}>{label}</h2><button type="button" className="ph-x" aria-label="Close" onClick={onClose}><X size={20} /></button></div>
        <div className="ph-sheet-b">{children}</div>
      </div>
    </div>
  );
}

/** The bar at the bottom of a phone. */
export function PhoneBar({ tabs, on, plus, onPlus, onMenu, menuOpen, unread }: { tabs: Tab[]; on: (href: string) => boolean; plus: boolean; onPlus: () => void; onMenu: () => void; menuOpen: boolean; unread?: string }) {
  const cells: ReactNode[] = tabs.map((t) => <Link key={t.href} href={t.href} className={`ph-tab ${on(t.href) ? "is-on" : ""}`} aria-current={on(t.href) ? "page" : undefined}><t.icon size={22} aria-hidden /><span>{t.label}</span></Link>);
  if (plus) cells.splice(2, 0, <button key="+" type="button" className="ph-plus" aria-label="New record, or tell Kaju" onClick={onPlus}><Plus size={26} strokeWidth={2.4} aria-hidden /></button>);
  cells.push(<button key="m" type="button" className={`ph-tab ${menuOpen ? "is-on" : ""}`} aria-expanded={menuOpen} aria-haspopup="dialog" onClick={onMenu} data-n={unread}><MenuIcon size={22} aria-hidden /><span>Menu</span></button>);
  return <nav className={`ph-bar ${plus ? "has-plus" : ""}`} aria-label="Sections" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>{cells}</nav>;
}

/** "+": Kaju first, then the role's records. */
export function PlusSheet({ open, onClose, kind, onKaju }: { open: boolean; onClose: () => void; kind: PhoneKind; onKaju: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="New">
      <ul className="ph-acts">
        <li><button type="button" className="ph-act is-kaju" onClick={() => { onClose(); onKaju(); }}><span className="ph-act-i"><Sparkles size={20} aria-hidden /></span><span><b>Tell Kaju</b><small>Say or type what happened; Kaju prepares it for you to confirm</small></span></button></li>
        {phoneActions(kind).map((a) => <li key={a.href}><Link href={a.href} className="ph-act" onClick={onClose}><span className="ph-act-i"><a.icon size={20} aria-hidden /></span><span><b>{a.label}</b><small>{a.detail}</small></span></Link></li>)}
      </ul>
    </Sheet>
  );
}

type Conv = { href: string; name: string; n: number; dm?: boolean };
/** Menu: everything the sidebar has, as large rows, so nothing is out of reach on a phone. */
export function PhoneMenu({ open, onClose, org, nav, more, on, convs, newConv, theme, flip, settings, kajuHome }: {
  open: boolean; onClose: () => void; org: ReactNode; nav: NavItem[]; more: NavItem[]; on: (href: string) => boolean;
  convs: Conv[] | null; newConv: () => void; theme: "light" | "dark"; flip: () => void; settings: string; kajuHome: boolean;
}) {
  const row = (i: { href: string; label: string; icon: typeof Home }, n?: number) => (
    <li key={i.href}><Link href={i.href} className={`ph-row ${on(i.href) ? "is-on" : ""}`} aria-current={on(i.href) ? "page" : undefined} onClick={onClose}><i.icon size={20} aria-hidden /><span>{i.label}</span>{n ? <i className="ph-n">{n}</i> : null}</Link></li>
  );
  return (
    <Sheet open={open} onClose={onClose} label="Menu" full>
      <div className="ph-org">{org}</div>
      <ul className="ph-rows">{nav.map((i) => row(i))}</ul>
      {more.length ? <><h3 className="ph-h">Your organisation</h3><ul className="ph-rows">{more.map((i) => row(i))}</ul></> : null}
      <h3 className="ph-h">Messages</h3>
      <ul className="ph-rows">
        {(convs ?? []).slice(0, 12).map((c) => <li key={c.href}><Link href={c.href} className={`ph-row ${on(c.href) ? "is-on" : ""} ${c.n ? "is-unread" : ""}`} onClick={onClose}>{c.dm ? <MessageSquare size={20} aria-hidden /> : <Hash size={20} aria-hidden />}<span>{c.name}</span>{c.n ? <i className="ph-n">{c.n}</i> : null}</Link></li>)}
        <li><button type="button" className="ph-row is-quiet" onClick={() => { onClose(); newConv(); }}><Plus size={20} aria-hidden /><span>New message</span></button></li>
      </ul>
      <h3 className="ph-h">Kaju</h3>
      <ul className="ph-rows">{KAJU.filter((k) => kajuHome || k.href === "/kaju" || k.href === "/kaju/missions").map((i) => row(i))}</ul>
      <ul className="ph-rows is-end">
        <li><Link href={settings} className="ph-row" onClick={onClose}><Settings size={20} aria-hidden /><span>Settings</span></Link></li>
        <li><button type="button" className="ph-row" onClick={flip}>{theme === "dark" ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}<span>{theme === "dark" ? "Light theme" : "Dark theme"}</span></button></li>
      </ul>
    </Sheet>
  );
}

/** The left edge of the top bar on a page below a section: back to the parent. */
export function Back({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="ph-back" aria-label={`Back to ${label}`}><ChevronLeft size={24} aria-hidden /></Link>;
}

/** Where "back" goes from a path: the section it sits in, or nothing on a top-level page. */
export function parentOf(path: string, home: string): { href: string; label: string } | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 3 || path === home) return null;
  if (parts[0] === "channels") return null;
  const href = "/" + parts.slice(0, 2).join("/");
  const label = parts[1].replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  return { href, label };
}

