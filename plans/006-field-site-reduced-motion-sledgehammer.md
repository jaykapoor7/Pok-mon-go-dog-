# 006 — Soften the field-site reduced-motion reset

- **Status**: TODO
- **Commit**: 5d87611
- **Severity**: MEDIUM
- **Category**: 6. Accessibility
- **Estimated scope**: 1 file, small

## Problem

```css
/* src/components/site/field-site.css:119 — current */
@media(prefers-reduced-motion:reduce){.field-site *,.field-site *::before,.field-site *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.street-hero-image{transform:none!important}.field-site[data-motion=on] .reveal{opacity:1;transform:none}}
```

The hardest reset in the repository: `transition: none !important` on
every descendant of the public-facing landing page. Not "gentler" —
literally zero. It removes colour and border transitions on buttons and
links, which is the press-and-hover feedback floor that
`src/app/globals.css:479-483` was deliberately written to establish, and
it kills `animation` outright on anything inside `.field-site`.

AUDIT.md §6: *"Reduced motion means fewer and gentler animations, **not
zero** — keep transitions that aid comprehension, remove position
changes."*

This is also the last of the four blanket resets; plan 001 removes the
other three.

## Target

```css
/* target — src/components/site/field-site.css, replacing line 119 */
@media (prefers-reduced-motion: reduce) {
  /* Reduced motion means no travel, not no feedback. Colour, border and
     opacity transitions stay — they are how a control says it heard
     you, and removing them makes the page feel broken rather than calm.
     Only movement goes. */
  .field-site *,
  .field-site *::before,
  .field-site *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-property: opacity, color, background-color, border-color, box-shadow !important;
  }
  .street-hero-image { transform: none !important; }
  .field-site[data-motion="on"] .reveal { opacity: 1; transform: none; }
  /* The console mock and the six-station rail arrive without travel. */
  .field-site[data-motion="on"] .cm-frame,
  .field-site[data-motion="on"] .cx-rail > li > a { opacity: 1; transform: none; }
  .field-site[data-motion="on"] .cm-track i,
  .field-site[data-motion="on"] .cx-rail > li::before { transform: none; }
  .field-site[data-motion="on"] .cm-ring-known { stroke-dashoffset: 0; }
}
```

`transition-property` restricted to the non-positional set is the key
move: it keeps every colour fade and kills every transform transition,
without needing to enumerate selectors.

## Repo conventions to follow

- `field-site.css` is minified in its older sections and expanded in its
  newer ones (everything after the `.cx` header comment). Write this
  expanded, with the boxed comment style used by the newer blocks.
- The correct reduced-motion shape in this codebase is
  `src/components/feedback/feedback.css:254-260`: keep the spinner, drop
  only the `:active` transforms.

## Steps

1. Replace line 119 of `src/components/site/field-site.css` with the
   target block.
2. Confirm no other rule in that file sets `transition: none` under a
   reduced-motion query.

## Boundaries

- Do NOT change anything outside the reduced-motion media query.
- Do NOT change what happens when reduced motion is off.
- Do NOT add new dependencies.
- Run this **after** plan 001, which removes the three other blanket
  resets; running it first leaves `globals.css` still overriding parts
  of it.

## Verification

- **Mechanical**: `npx next build` exits 0.
- **Feel check**: DevTools → Rendering → reduced motion, on `/`:
  - Scroll the page. Nothing must slide, rise or draw. The console mock
    and the six stations must simply be there.
  - Hover "Report a sighting" with a mouse. The background colour must
    still fade — that is the check this plan exists for.
  - Press it. The colour change must still happen.
- **Done when**: on the landing page with reduced motion on, no element
  translates, scales or draws, and every colour transition still runs.
