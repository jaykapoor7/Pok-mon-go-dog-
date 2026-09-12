# 001 — Stop the reduced-motion reset from freezing loading spinners

- **Status**: TODO
- **Commit**: 5d87611
- **Severity**: HIGH
- **Category**: 6. Accessibility
- **Estimated scope**: 4 files, small

## Problem

`src/app/globals.css` is imported at `src/app/layout.tsx:4`, so this rule
applies to every page in the product:

```css
/* src/app/globals.css:278-286 — current */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

Universal selector, `!important`, no exceptions. Two consequences:

1. **Loading spinners freeze on their first frame.** `animation-duration:
   0.001ms` plus `animation-iteration-count: 1` stops every infinite
   rotation. A frozen spinner is worse than no spinner — it reads as a
   hung app. Affected: `.imp-spin` (`src/components/app/app.css:2304`,
   used by `DatasetClient.tsx:90`, `IncomingClient.tsx:165` and `:178`),
   `.demo-spin` (`src/components/app/app.css:3804`), and `.fb-spin`
   (`src/components/feedback/feedback.css:251`).

2. **It silently defeats a deliberate decision made elsewhere.**
   `src/components/feedback/feedback.css:254-255` reads:

```css
/* src/components/feedback/feedback.css:254-255 — current */
@media (prefers-reduced-motion: reduce) {
  .fb-spin { animation-duration: 1.6s; }
```

   That is the correct shape — keep the spinner, slow it down — but
   `1.6s` carries no `!important`, so the global `0.001ms !important`
   wins regardless of specificity. The spinner its author deliberately
   preserved is frozen in production.

AUDIT.md is explicit: *"Reduced motion means fewer and gentler
animations, **not zero** — keep transitions that aid comprehension,
remove position changes."*

Three more near-duplicate copies of the same over-reach exist and are
fully subsumed by the global one:
`src/components/app/app.css:1876-1881`, `src/components/site/site.css:2040-2043`,
`src/app/product.css:275`.

## Target

```css
/* target — src/app/globals.css, replacing lines 278-286 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }

  /* A spinner is not decoration, it is the only signal that work is in
     progress. Reduced motion means gentler, not absent: these keep
     turning, slower. Opted in by class so the blanket above stays the
     default for everything else. */
  .imp-spin,
  .demo-spin,
  .fb-spin,
  .animate-spin,
  [data-keep-motion] {
    animation-duration: 1.6s !important;
    animation-iteration-count: infinite !important;
  }
}
```

And in `src/components/app/app.css`, replace lines 3826-3829:

```css
/* target — src/components/app/app.css:3826-3829 */
@media (prefers-reduced-motion: reduce) {
  .demo-switch, .demo-switch-knob { transition: none; }
  /* .demo-spin deliberately keeps turning — see globals.css. */
}
```

## Repo conventions to follow

- Global, cross-surface rules live at the end of `src/app/globals.css`,
  under a boxed `/* ═══ */` header comment explaining the decision.
  Exemplar: the touch-floor block at the end of that file.
- Comments in this repo explain *why*, and name the thing that went
  wrong. Match that register.
- `src/components/feedback/feedback.css:254-260` is the exemplar for
  correct reduced-motion shape: keep the spinner, drop only the
  `:active` transforms.

## Steps

1. In `src/app/globals.css`, add the spinner exception block inside the
   existing `@media (prefers-reduced-motion: reduce)` at lines 278-286,
   exactly as written under **Target**.
2. In `src/components/app/app.css`, delete the line `.demo-spin { animation: none; }`
   from the reduced-motion block at lines 3826-3829 and leave the
   `.demo-switch` line, adding the comment shown above.
3. In `src/components/map/map.css:84`, change `.sp-map-detail{animation:none}`
   so the opacity ramp survives and only the travel is dropped:
   `.sp-map-detail{animation:map-detail-fade .2s ease both}` and add
   `@keyframes map-detail-fade{from{opacity:0}to{opacity:1}}`.
4. Delete the three redundant blanket resets, which are fully subsumed by
   the global one and will otherwise drift from it:
   `src/components/app/app.css:1876-1881`,
   `src/components/site/site.css:2040-2043`,
   and the `.spa *` reset inside `src/app/product.css:275`.
   Leave `src/components/site/field-site.css:119` alone for now — plan 006 covers it.

## Boundaries

- Do NOT touch any file under `src/components/partner/`.
- Do NOT change which elements animate when reduced motion is OFF.
- Do NOT add new dependencies.
- If a step does not match the code you find (drift since the commit
  stamp), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` clean; `npx next build` exits 0.
- **Feel check**: in Chrome DevTools → Rendering → "Emulate CSS
  prefers-reduced-motion: reduce", then:
  - Open the feedback dialog and press Send. The spinner must keep
    turning, slowly, not freeze.
  - Load `/data` and `/partner/incoming`. Their loading spinners must
    turn.
  - Tap a map marker. The detail panel must fade in without sliding.
  - Confirm the landing page's scroll reveals do NOT move.
- **Done when**: with reduced motion on, no `animation-play-state` is
  effectively frozen on any element whose job is to indicate progress,
  and every positional animation is still suppressed.
