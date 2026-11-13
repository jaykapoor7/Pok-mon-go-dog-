/* The "Switch space" event and whether a Welcome picker is listening for it.

   Kept apart from Welcome.tsx so the root layout's RoleSwitchFallback can
   read them without bringing the Welcome dialog (and its dialog library)
   into every page. Welcome registers itself here while it is mounted. */

export const TOUR_EVENT = "straypaw:tour";

/* How many Welcome dialogs are mounted. RoleSwitchFallback reads this so it
   only takes over when there is no in-place picker to open: both listen to
   the same event, and without this the fallback's hard navigation reloaded
   the page out from under the dialog every time, so the in-place picker
   never actually ran. */
let mountedTours = 0;

export function tourIsMounted() {
  return mountedTours > 0;
}

/** Called by Welcome on mount; the returned function is called on unmount. */
export function registerTour() {
  mountedTours += 1;
  return () => {
    mountedTours -= 1;
  };
}

export function openTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}
