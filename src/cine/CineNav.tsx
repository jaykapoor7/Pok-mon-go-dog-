"use client";

/* ════════════════════════════════════════════════════════════════════
   The navigation of the cinematic site, on every public page.

   Five words and two ways in: Platform · Kaju · Solutions · Proof ·
   Pricing, then Sign in and Explore live demo. It floats over the world
   at the top of the homepage and Meet Kaju, settles onto a quiet white
   bar once the page moves (on every other page it is that bar, in the
   page's flow, where the earlier header stood), and steps out of the way while reading down (back on the first
   upward scroll). On phones the five words open as one calm sheet.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LIVE_DEMO_URL } from "@/lib/demo-site";
import "./cine.css";

export const CINE_LINKS = [
  { href: "/platform", label: "Platform" },
  { href: "/kaju", label: "Kaju" },
  { href: "/solutions", label: "Solutions" },
  { href: "/customers", label: "Proof" },
  { href: "/pricing", label: "Pricing" },
];

/* Pages whose first screen is the world: the bar floats over it. Every other page keeps a white bar in the flow, as before. */
const IMMERSIVE = new Set(["/", "/kaju"]);

export function CineNav() {
  const path = usePathname() ?? "/";
  const page = !IMMERSIVE.has(path);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"top" | "bar" | "away">("top");
  const last = useRef(0);
  const bar = useRef<HTMLElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const on = () => {
      const y = window.scrollY, d = y - last.current;
      last.current = y;
      setState((s) => (y < 24 ? "top" : d > 4 && y > 480 ? "away" : d < -4 ? "bar" : s === "top" ? "bar" : s));
    };
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    /* Escape closes; Tab stays inside the bar and its sheet while the sheet is open */
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab" || !bar.current) return;
      const f = [...bar.current.querySelectorAll<HTMLElement>("a[href], button")].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", esc); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open]);
  const here = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <header ref={bar} className={`cn8-nav is-${open ? "bar" : state}${open ? " is-open" : ""}${page ? " is-page" : ""}`}>
      <div className="cn8-nav-in">
        <Link href="/" className="cn8-brand" aria-label="StrayPaw home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/straypaw-mark.png" alt="" width={26} height={26} />
          <span>StrayPaw</span>
        </Link>
        <nav className="cn8-links" aria-label="Site">
          {CINE_LINKS.map((l) => <Link key={l.href} href={l.href} aria-current={here(l.href) ? "page" : undefined}>{l.label}</Link>)}
        </nav>
        <div className="cn8-end">
          <Link href={user ? "/app" : "/sign-in"} className="cn8-signin">{user ? "Open app" : "Sign in"}</Link>
          <a href={LIVE_DEMO_URL} className="cn8-btn is-primary">Explore live demo<ArrowRight size={15} aria-hidden /></a>
          <button type="button" className="cn8-burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="cn8-sheet" onClick={() => setOpen((v) => !v)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      <div id="cn8-sheet" className="cn8-sheet" aria-hidden={!open} inert={!open ? true : undefined}>
        <nav aria-label="Site, on a phone">
          {CINE_LINKS.map((l, i) => <Link key={l.href} href={l.href} style={{ ["--i" as string]: i }} aria-current={here(l.href) ? "page" : undefined}>{l.label}<ArrowRight size={18} aria-hidden /></Link>)}
        </nav>
        <div className="cn8-sheet-end">
          <a href={LIVE_DEMO_URL} className="cn8-btn is-primary is-lg">Explore live demo<ArrowRight size={16} aria-hidden /></a>
          <Link href={user ? "/app" : "/sign-in"} className="cn8-btn is-line is-lg">{user ? "Open app" : "Sign in"}</Link>
        </div>
      </div>
    </header>
  );
}
