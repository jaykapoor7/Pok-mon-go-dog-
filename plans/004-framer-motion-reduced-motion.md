# 004 — Branch framer-motion movement on `useReducedMotion()`

- **Status**: TODO
- **Commit**: 5d87611
- **Severity**: HIGH
- **Category**: 6. Accessibility
- **Estimated scope**: 1 file (plus 1 line in layout), small

## Problem

`useReducedMotion` is imported in exactly **one** of the thirteen files
that use framer-motion (`src/app/report/page.tsx:5`).

This matters more than it looks. framer-motion writes inline
`transform` via requestAnimationFrame, **not** via CSS transitions — so
the blanket `transition-duration: 0.001ms !important` resets in
`src/app/globals.css:278-286` and its three copies **have no effect on
any of it**. Every item below plays its full travel for a user who has
asked the operating system for reduced motion.

The four sheets and drawers, worst first:

```tsx
/* src/components/map/DogBottomSheet.tsx:83-85 — current */
initial={{ y: "100%" }}
animate={{ y: 0 }}
exit={{ y: "100%" }}
/* with transition={{ type: "spring", damping: 34, stiffness: 340 }} */
```

A full viewport-height slide that opens on every dog marker tap.

```tsx
/* src/components/sighting/EditSightingSheet.tsx:88-90 — current */
initial={{ y: 60, opacity: 0 }}
```

Same shape at `src/components/help/HelperForm.tsx:94-96` (`y: 60`) and
`src/components/dashboard/FunderReport.tsx:118-120` (`y: 24`).

Also unguarded: `src/components/feed/SightingCard.tsx:64-66`
(`whileInView` `y: 16`, fired per card down a scrolling feed — the
category reduced-motion users most need suppressed), `:141`
(`animate={{ scale: liked ? [1, 1.35, 1] : 1 }}`),
`src/components/landing/Hero.tsx:15-16, 23-24, 35-36, 46-47, 62-63`,
and `src/components/marketing/SlideDeck.tsx:41-43` (a 120px horizontal
traverse).

The plumbing for this was built and never wired up:
`src/lib/motion.ts:18-21` defines `reducedMotionTransition` and
`:120-122` exports `withReducedMotion(isReduced, transition)`. **Neither
is imported by any file in `src/`.**

## Target

One line covers all of it. `MotionConfig` with `reducedMotion="user"`
makes framer-motion drop transform values and keep opacity for every
descendant component, automatically, without touching thirteen files.

```tsx
/* target — src/app/layout.tsx */
import { MotionConfig } from "framer-motion";

/* ... inside the body render, wrapping {children}: */
<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

AUDIT.md §6: *"In JS: `useReducedMotion()` and branch transform
values."* `MotionConfig reducedMotion="user"` is the framework's own
implementation of exactly that branch, applied once.

`layout.tsx` is a server component, so `MotionConfig` needs a client
boundary. Create one:

```tsx
/* target — new file: src/components/motion/MotionRoot.tsx */
"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/* framer-motion writes inline transforms through rAF, not through CSS
   transitions, so the blanket prefers-reduced-motion resets in
   globals.css never reached any of it — thirteen components were
   playing their full travel for somebody who had asked the operating
   system not to.

   reducedMotion="user" is framer's own implementation of the branch
   AUDIT.md asks for: transform values are dropped, opacity is kept, so
   a panel still fades in and simply does not fly. One wrapper instead
   of a useReducedMotion() call in every file, which is the version that
   stays correct when somebody adds the fourteenth. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
```

## Repo conventions to follow

- Client boundaries live in `src/components/<area>/`, marked `"use client"`
  at the top. Exemplar: `src/components/site/LandingMotion.tsx`.
- `src/app/layout.tsx` already wraps children in providers; add this one
  in the same place.
- The correct per-file pattern already exists at
  `src/app/report/page.tsx:213-216` (`x: reduceMotion ? 0 : 16`). Leave
  it as it is — it is right, and `MotionConfig` does not conflict with it.

## Steps

1. Create `src/components/motion/MotionRoot.tsx` exactly as above.
2. In `src/app/layout.tsx`, import `MotionRoot` and wrap the existing
   children (inside whatever providers are already there, outermost
   among the motion-related ones).
3. Delete `withReducedMotion` and `reducedMotionTransition` from
   `src/lib/motion.ts` (lines 18-21 and 120-122). They have no importers
   and `MotionConfig` now does their job; leaving them invites somebody
   to wire up a second mechanism.

## Boundaries

- Do NOT edit the thirteen component files individually. The whole point
  is one wrapper.
- Do NOT change `src/app/report/page.tsx` — its manual branch is correct.
- Do NOT change any transition durations or curves in this plan.
- Do NOT add new dependencies (framer-motion 11.18.2 is already present).

## Verification

- **Mechanical**: `npx tsc --noEmit` clean; `npx next build` exits 0.
- **Feel check**: DevTools → Rendering → "Emulate CSS
  prefers-reduced-motion: reduce", then:
  - Tap a dog marker on `/map`. The bottom sheet must appear without
    sliding up from the bottom of the screen, but must still fade.
  - Scroll `/feed`. Cards must appear without rising.
  - Open the auth modal. It must fade, not fly.
  - Turn the emulation off and confirm every one of those still moves.
- **Done when**: with reduced motion on, no framer-motion component
  translates or scales, and every one of them still changes opacity so
  the state change is still legible.
