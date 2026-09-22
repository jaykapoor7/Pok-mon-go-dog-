"use client";

import { useEffect } from "react";
import { ROLE_KEY } from "@/lib/roles";
import { TOUR_EVENT, tourIsMounted } from "@/components/app/Welcome";

/**
 * Hard fallback for the global "Switch space" control.
 *
 * AppShell relies on Welcome's in-place dialog listener. If that listener is
 * missing, or a nested shell swallows the dialog, the button looks clickable
 * but does nothing. This turns the same event into a real navigation to the
 * role picker, so switching workspace can never dead-end.
 *
 * It only acts when no Welcome is mounted. Both listen to the same event, and
 * while this fired unconditionally its hard navigation reloaded the page out
 * from under the dialog, so the in-place picker never ran and every switch
 * cost a full page load. A fallback has to check whether the thing it is
 * backing up is actually absent.
 */
export function RoleSwitchFallback() {
  useEffect(() => {
    const switchSpace = () => {
      /* Welcome is mounted and will open the picker in place. */
      if (tourIsMounted()) return;
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
