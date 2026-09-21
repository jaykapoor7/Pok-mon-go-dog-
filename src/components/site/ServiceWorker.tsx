"use client";

import { useEffect } from "react";

/* Registers the offline worker. Renders nothing.

   Registration is deferred to the load event so it never competes with the
   first paint on a slow connection, which is the exact device this is for.
   Every step is guarded: an unsupported browser, a blocked registration
   under enterprise policy, or a worker that fails to parse must cost the
   visitor nothing. Offline support is an enhancement, never a dependency. */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* No offline support on this device; the site works as normal. */
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
