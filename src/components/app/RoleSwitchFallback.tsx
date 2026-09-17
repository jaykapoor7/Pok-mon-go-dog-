"use client";

import { useEffect } from "react";
import { ROLE_KEY } from "@/lib/roles";
import { TOUR_EVENT } from "@/components/app/Welcome";

/**
 * Hard fallback for the global "Switch space" control.
 *
 * AppShell historically relied on Welcome's in-place dialog listener. If that
 * listener is missing or a nested shell swallows the dialog, the button looks
 * clickable but does nothing. This listener turns the same event into a real
 * navigation to the role picker, so switching workspace can never dead-end.
 */
export function RoleSwitchFallback() {
  useEffect(() => {
    const switchSpace = () => {
      try {
        window.localStorage.removeItem(ROLE_KEY);
      } catch {
        // Storage can be blocked; navigation still gives the user the picker.
      }
      window.location.assign("/app?choose=1");
    };

    window.addEventListener(TOUR_EVENT, switchSpace);
    return () => window.removeEventListener(TOUR_EVENT, switchSpace);
  }, []);

  return null;
}
