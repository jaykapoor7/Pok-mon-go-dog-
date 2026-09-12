# 003 — Stop the moderation queue animating layout on every decision

- **Status**: DONE
- **Commit**: 5d87611
- **Severity**: HIGH
- **Category**: 5. Performance / 1. Purpose & frequency
- **Estimated scope**: 1 file, small

## Problem

```tsx
/* src/components/admin/AdminClient.tsx:999-1008 — current */
<AnimatePresence initial={false}>
{items.map((s) => (
  <motion.div
    key={s.id}
    layout
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.96, height: 0, marginTop: 0 }}
    transition={{ duration: 0.22, ease: "easeOut" }}
    className="card overflow-hidden"
```

`act()` at `AdminClient.tsx:369` removes the row via
`setItems(prev => prev.filter(...))` at `:388`, so this plays on **every
approve and every reject**. A moderator clearing a queue pays it
hundreds of times a session.

Three separate faults in one block:

1. `height: 0` and `marginTop: 0` are **layout properties**. AUDIT.md §5:
   *"Animate `transform` and `opacity` only. `width`/`height`/`margin`/
   `padding`/`top`/`left` trigger layout + paint + composite."*
2. `layout` on the same element forces a per-frame measure pass and
   re-slides every remaining row in the list.
3. The frequency is wrong for any animation at all. AUDIT.md §1 puts
   100+/day actions at *"No animation. Ever."* — the moderator wants the
   next item, not a 220ms farewell for the one they just judged.

`ease: "easeOut"` is also the weak built-in string rather than a real
curve, but that is moot if the animation goes.

## Target

Delete the exit animation and the layout prop. Keep a short entry fade
for rows arriving from a refresh, because a row appearing from nowhere
in a queue somebody is reading IS the jarring change animation exists to
prevent.

```tsx
/* target — src/components/admin/AdminClient.tsx:999-1008 */
<AnimatePresence initial={false} mode="popLayout">
{items.map((s) => (
  <motion.div
    key={s.id}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    /* No exit. A moderator clearing a queue is performing a
       high-frequency action and wants the next item, not a farewell for
       the one they just judged — AUDIT.md puts 100+/day actions at "no
       animation, ever". The row simply goes.

       No layout prop either: it forced a per-frame measure pass and
       re-slid every remaining row, and the exit it was smoothing no
       longer exists. */
    transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
    className="card overflow-hidden"
```

`[0.23, 1, 0.32, 1]` is AUDIT.md's strong ease-out, and it is already
declared in this repo at `src/lib/motion.ts:3` as `EASE_OUT`.

## Repo conventions to follow

- This file uses inline framer-motion props, not variants. Stay with that.
- Comments here explain the decision and name what was wrong. Match it.
- `src/lib/motion.ts:3` already declares `export const EASE_OUT = [0.23, 1, 0.32, 1]`
  but **has zero importers**. Do not wire it up in this plan — that is
  plan 005's job. Inline the array here.

## Steps

1. In `src/components/admin/AdminClient.tsx`, replace lines 999-1008 with
   the target block above.
2. Search the same file for any other `exit={{` containing `height` or
   `marginTop` and apply the same treatment. (At the commit stamped
   above there is exactly one.)

## Boundaries

- Do NOT change `act()` or any data flow. Motion properties only.
- Do NOT touch the feedback tab added to this component.
- Do NOT remove `AnimatePresence` — it is still needed for the entry.
- Do NOT add new dependencies.
- If the code at those lines does not match, STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` clean; `npx next build` exits 0.
- **Feel check**: open `/admin`, authenticate, and with a queue of at
  least five items:
  - Approve one. The row must vanish immediately and the next row must
    be readable on the very next frame — no collapse, no re-slide of the
    rows below.
  - Approve five in a row as fast as you can click. There must be no
    growing backlog of animation and no visible reflow.
  - In DevTools → Performance, record while approving three items.
    Confirm no "Layout" entries fire per frame during the removal.
- **Done when**: approving an item produces zero layout work, and a
  moderator can clear ten items faster than the old 220ms × 10.
