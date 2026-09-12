# 005 — One curve, one duration scale, actually used

- **Status**: DONE
- **Commit**: 5d87611
- **Severity**: MEDIUM
- **Category**: 7. Cohesion & tokens / 2. Easing & duration
- **Estimated scope**: 6 files, medium

## Problem

The motion vocabulary exists and is almost entirely unused.

`src/app/tokens.css` declares `--sp-ease`, `--sp-ease-out`,
`--sp-ease-io`, `--sp-fast: 0.16s`, `--sp-base: 0.28s`, `--sp-slow: 0.5s`
and `--sp-scene: 0.85s`. The duration tokens have **almost no consumers**:
nearly every duration in the repo is hand-typed.

The consequence is four near-identical values doing one job —
19× `0.16s`, 13× `0.15s`, 22× `0.18s`, 31× `0.2s` — and one curve spelled
two ways:

- `cubic-bezier(.22,1,.36,1)` — 8 occurrences:
  `src/components/site/field-site.css:109`, `:111`, `:139`, `:142` (×2),
  `:177`, `:230`
- `cubic-bezier(0.22, 1, 0.36, 1)` — 4 occurrences:
  `src/components/feedback/feedback.css:106`, `:240`,
  `src/app/globals.css:481`, `:526`
- `cubic-bezier(0.23, 1, 0.32, 1)` — 2 occurrences:
  `src/components/app/app.css:1322`, `:1647`

**The two-instance minority is the correct one.** `(0.23, 1, 0.32, 1)` is
verbatim AUDIT.md's `--ease-out` target; `(0.22, 1, 0.36, 1)` is a
twelve-instance near-miss of it. Convergence goes toward the two, not
the twelve. framer-motion's side already agrees —
`src/lib/motion.ts:3` declares `EASE_OUT = [0.23, 1, 0.32, 1]` — while the
`.tsx` call sites that hardcode arrays use the wrong one:
`src/components/marketing/SlideDeck.tsx:44` and
`src/app/report/page.tsx:216` both inline `[0.22, 1, 0.36, 1]`.

`src/lib/motion.ts` is separately a trap: it has **zero importers**, and
its `ui` token is `duration: 0.32` — a name that says "interface"
attached to a value that breaches AUDIT.md's *"UI animations stay under
300ms"* ceiling. It is the file a future contributor will reach for.

## Target

```css
/* target — src/app/tokens.css, replacing the current --sp-ease line */
  --sp-ease: cubic-bezier(0.23, 1, 0.32, 1);  /* arriving, settling */
```

(It is already this value at the stamped commit — confirm, do not change.)

Every hand-typed `cubic-bezier(.22,1,.36,1)` and
`cubic-bezier(0.22, 1, 0.36, 1)` in CSS becomes `var(--sp-ease)`.

Every hand-typed duration in the four clustered values becomes a token:

| current | becomes |
| --- | --- |
| `0.15s`, `0.16s` | `var(--sp-fast)` (0.16s) |
| `0.18s`, `0.2s`, `.18s`, `.2s` | `var(--sp-base)` — but see the exception below |
| `0.5s` | `var(--sp-slow)` |

**Exception, do not collapse:** `transition-duration: 0.09s` inside
`:active` at `src/app/globals.css:501` and `:509` is a deliberate
asymmetry (90ms in, 180ms out) documented at `globals.css:499-500`, and
AUDIT.md §4 explicitly asks for it. Leave both alone.

`src/lib/motion.ts`: delete the file. It has no importers, its `ui`
duration is out of budget, and a dead parallel vocabulary is worse than
none.

For the two `.tsx` call sites that inline the wrong curve:

```tsx
/* target — src/components/marketing/SlideDeck.tsx:44 */
transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
```

```tsx
/* target — src/app/report/page.tsx:216 */
transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
```

## Repo conventions to follow

- Tokens live in `src/app/tokens.css`, imported first at
  `src/app/layout.tsx:3`. Do not declare motion values anywhere else.
- `src/components/site/field-site.css`'s newer blocks (the `.cx` and
  `.cm` sections at the end of the file) are the exemplar: every
  duration and curve there is already a token, with no hand-typed value.
- Do not rename any token.

## Steps

1. Confirm `src/app/tokens.css` declares `--sp-ease: cubic-bezier(0.23, 1, 0.32, 1)`.
   If it says `(0.22, 1, 0.36, 1)`, change it.
2. In `src/components/site/field-site.css`, `src/components/feedback/feedback.css`
   and `src/app/globals.css`, replace every literal
   `cubic-bezier(.22,1,.36,1)` and `cubic-bezier(0.22, 1, 0.36, 1)` with
   `var(--sp-ease)`.
3. In `src/components/app/app.css`, replace the two
   `cubic-bezier(0.23, 1, 0.32, 1)` literals with `var(--sp-ease)`.
4. Replace the clustered durations with their tokens per the table
   above, **skipping the two `0.09s` values in `globals.css`**.
5. `src/components/marketing/SlideDeck.tsx:44` and
   `src/app/report/page.tsx:216` — change the inline ease arrays to
   `[0.23, 1, 0.32, 1]`.
6. Delete `src/lib/motion.ts`. Confirm first with
   `grep -rn "lib/motion" src/` that it returns nothing but the file
   itself.

## Boundaries

- Do NOT change any duration that is not one of 0.15s/0.16s/0.18s/0.2s/0.5s.
- Do NOT touch the two `0.09s` press values — they are the documented
  asymmetry AUDIT.md asks for.
- Do NOT touch the infinite spinner durations (`0.8s`, `0.9s`, `1.6s`)
  or any `linear` timing — constant motion is correctly `linear`.
- Do NOT touch landing/marketing durations above 300ms. AUDIT.md's
  budget table exempts *"Marketing / explanatory — can be longer"*, and
  that is most of `site.css`.
- Do NOT add new dependencies.

## Verification

- **Mechanical**:
  - `grep -rn "cubic-bezier(\.22\|cubic-bezier(0\.22" src/` returns
    **zero** results.
  - `grep -rn "lib/motion" src/` returns zero results.
  - `npx tsc --noEmit` clean; `npx next build` exits 0.
- **Feel check**: this plan should change how things feel only very
  slightly — `(0.22,1,.36,1)` and `(0.23,1,.32,1)` are close. That is the
  point: it is a consolidation, not a redesign.
  - Open the feedback dialog. It must still rise and settle, not snap.
  - Hover a card on `/following` with a mouse. The lift must still ease.
  - In DevTools → Animations, set playback to 10% and open the feedback
    panel. Confirm the curve decelerates into its resting position
    rather than arriving at constant speed.
- **Done when**: one ease curve appears in the codebase, it is
  `cubic-bezier(0.23, 1, 0.32, 1)`, it is reached through `var(--sp-ease)`
  everywhere, and no duplicate motion vocabulary file remains.
