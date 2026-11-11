"use client";

/* A thin line across the top while a page is on its way. It starts when a
   link to another page of this site is pressed, eases toward the end while
   the page loads, and finishes when the address changes. Nothing is shown
   for links that open elsewhere, in a new tab, or with a modifier key.
   Decorative: the page announces itself when it arrives. Under reduced
   motion it is a still bar that appears and goes. */
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import "./route-progress.css";

export function RouteProgress() {
  const path = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const [state, setState] = useState<"idle" | "going" | "done">("idle");
  const guard = useRef(0);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; /* same page, or only a #anchor */
      setState("going");
      window.clearTimeout(guard.current);
      guard.current = window.setTimeout(() => setState("idle"), 10_000); /* never left hanging */
    };
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); window.clearTimeout(guard.current); };
  }, []);

  /* The address changed: the page is here. */
  useEffect(() => {
    setState((s) => (s === "going" ? "done" : s));
    window.clearTimeout(guard.current);
    const t = window.setTimeout(() => setState("idle"), 420);
    return () => window.clearTimeout(t);
  }, [path, search]);

  return <span className="rp" data-state={state} aria-hidden><i /></span>;
}
