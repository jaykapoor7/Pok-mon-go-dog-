"use client";

/* The site navigation: four menus that each answer one question (what is it,
   who is it for, can I trust it, where do I learn more), Pricing, Sign in and
   one call to action. Menus open on hover with intent, on click and from the
   keyboard; Escape closes. On a phone it is one sheet. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DEMO_SITE } from "@/lib/demo-site";
import { MENUS } from "./nav";
import "./site6.css";

const CTA = DEMO_SITE ? { href: "/try?go=1", label: "Start the live demo" } : { href: "/demo", label: "Book a demo" };

export function Nav() {
  const path = usePathname() ?? "";
  const { user } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [stuck, setStuck] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => { setOpen(null); setSheet(false); }, [path]);
  useEffect(() => { const on = () => setStuck(window.scrollY > 8); on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); setSheet(false); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  useEffect(() => { document.body.style.overflow = sheet ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [sheet]);
  const hover = (id: string | null) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(id), id ? 70 : 160); };
  const menu = MENUS.find((m) => m.id === open);
  return (
    <header className="s6 s6-nav s4-nav" data-stuck={stuck || !!open} onPointerLeave={(e) => { if (e.pointerType === "mouse") hover(null); }}>
      <div className="s6-wrap s6-nav-in">
        <Link href="/" className="s6-brand" aria-label="StrayPaw home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/straypaw-mark.png" alt="" width={28} height={28} /><span>StrayPaw</span>
        </Link>
        <nav aria-label="Site">
          <ul className="s6-menu">
            {MENUS.map((m) => (
              <li key={m.id}>
                <button type="button" aria-expanded={open === m.id} aria-controls={`s6-panel-${m.id}`} onPointerEnter={(e) => { if (e.pointerType === "mouse") hover(m.id); }} onClick={() => setOpen(open === m.id ? null : m.id)}>{m.label}<ChevronDown size={14} aria-hidden /></button>
              </li>
            ))}
            <li><Link href="/pricing" aria-current={path === "/pricing" ? "page" : undefined} onPointerEnter={() => hover(null)}>Pricing</Link></li>
          </ul>
        </nav>
        <div className="s6-nav-end">
          <Link href={user ? "/app" : "/sign-in"} className="s6-nav-signin s4-nav-signin">{user ? "Open app" : "Sign in"}</Link>
          <Link href={CTA.href} className="s6-btn is-primary is-small">{CTA.label}</Link>
          <button type="button" className="s6-burger" aria-label={sheet ? "Close menu" : "Open menu"} aria-expanded={sheet} onClick={() => setSheet((v) => !v)}>{sheet ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {menu ? (
        <div className="s6-panel" id={`s6-panel-${menu.id}`} key={menu.id} onPointerEnter={() => window.clearTimeout(timer.current)}>
          <div className="s6-wrap s6-panel-in">
            {menu.cols.map((c) => (
              <div key={c.title}><h4>{c.title}</h4><ul>{c.links.map((l) => <li key={l.href + l.label}><Link href={l.href}><b>{l.label}</b>{l.hint ? <span>{l.hint}</span> : null}</Link></li>)}</ul></div>
            ))}
            <div className="s6-panel-note"><b>{menu.note.title}</b><p>{menu.note.body}</p><Link href={menu.note.href} className="s6-textlink">{menu.note.cta}<ArrowRight size={15} aria-hidden /></Link></div>
          </div>
        </div>
      ) : null}
      {sheet ? (
        <div className="s6-sheet" role="dialog" aria-label="Menu">
          {MENUS.map((m) => (
            <details key={m.id}><summary>{m.label}<ChevronDown size={18} aria-hidden /></summary>{m.cols.flatMap((c) => c.links).map((l) => <Link key={l.href + l.label} href={l.href}>{l.label}</Link>)}</details>
          ))}
          <Link href="/pricing" className="plain">Pricing</Link>
          <Link href={user ? "/app" : "/sign-in"} className="plain">{user ? "Open app" : "Sign in"}</Link>
          <Link href={CTA.href} className="s6-btn is-primary">{CTA.label}</Link>
          <Link href="/community/report" className="s6-btn is-line">Report an animal</Link>
        </div>
      ) : null}
    </header>
  );
}
