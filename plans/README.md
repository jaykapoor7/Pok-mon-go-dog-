# Animation plans

Produced by the `improve-animations` skill: recon, a seven-agent audit
against the eight categories in
`.claude/skills/improve-animations/AUDIT.md`, then every finding re-read
at its `file:line` before it earned a place here.

All plans stamped at commit `5d87611`.

## The plans

| # | Plan | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| 001 | [Stop the reduced-motion reset freezing spinners](001-reduced-motion-sledgehammer.md) | HIGH | Accessibility | DONE |
| 002 | [Gate every hover transform behind a real pointer](002-hover-motion-on-touch.md) | HIGH | Accessibility / Frequency | DONE |
| 003 | [Stop the moderation queue animating layout](003-moderation-queue-layout-thrash.md) | HIGH | Performance / Frequency | DONE |
| 004 | [Branch framer-motion on `useReducedMotion()`](004-framer-motion-reduced-motion.md) | HIGH | Accessibility | DONE |
| 005 | [One curve, one duration scale, actually used](005-motion-tokens-and-curve-drift.md) | MEDIUM | Cohesion & tokens | DONE |
| 006 | [Soften the field-site reduced-motion reset](006-field-site-reduced-motion-sledgehammer.md) | MEDIUM | Accessibility | DONE |

## All six are implemented

Executed in the order below and verified in a browser. What the
verification actually showed, rather than what it was supposed to show:

- `.fb-spin` and `.imp-spin` under `prefers-reduced-motion: reduce` now
  compute to `1.6s` / `infinite`. Before, both were frozen on frame one.
- `.field-button` under reduced motion now computes
  `transition-property: opacity, color, background-color, border-color,
  box-shadow` — colour feedback survives, travel does not. Before, the
  landing page had `transition: none !important` on every descendant.
- `(hover: hover) and (pointer: fine)` evaluates false on a touch
  context and true on a mouse one, so hover lifts are off on a phone and
  on at a desk.
- A feed card under reduced motion computes `transform: none`, which no
  CSS rule could previously achieve because framer-motion writes inline.

31 routes re-swept at 390px afterwards: no regressions.

## The order they were done in, and why

**001 → 006 → 004 → 002 → 003 → 005.**

- **001 first.** It is the only one that fixes a bug a user can see today
  (frozen spinners read as a hung app) and it removes three of the four
  blanket resets, which every other accessibility plan has to work
  around while they exist.
- **006 depends on 001.** It is the fourth blanket reset. Run it second
  or `globals.css` will still be overriding parts of it.
- **004 next.** It is one wrapper file and it closes the largest gap:
  framer-motion writes inline transforms through rAF, so *none* of the
  CSS reduced-motion work in 001 or 006 reaches any of the thirteen
  components that use it.
- **002 next.** The biggest single edit, seven files, but mechanical and
  independent of everything above.
- **003 is independent** and can be done at any point.
- **005 last.** It is a consolidation; doing it before 002 and 003 means
  re-touching lines those plans are already changing.

## Dependencies

- 006 **must** run after 001.
- 005 **should** run after 002 and 003 to avoid editing the same lines
  twice.
- Everything else is independent.

## Already fixed, not planned

Two findings from the audit were repaired during the session that
produced it, so they have no plan:

- **The `--sp-ease` cycle.** `src/components/site/site.css` declared
  `--sp-ease: var(--sp-ease)` and `--sp-ease-out: var(--sp-ease-out)`.
  A custom property defined as itself is a cycle: it resolves to
  guaranteed-invalid, and an invalid `var()` is invalid at
  computed-value time, which does **not** fall back to `ease` — it
  discards the entire declaration it sits in. Six transitions on the
  landing page had no transition at all, including the scroll reveal,
  which was written to glide 28px and was in fact teleporting. The
  values now live in `src/app/tokens.css`.
- **The four parallel token namespaces** (`--sp-*`, `--pl-*`,
  `--field-*`, `--mi-*`) are one, with the other three kept as aliases.

## Findings deliberately NOT planned

- **`/faq`'s "undersized" links.** They are inside sentences. Growing a
  link in running prose spaces the paragraph out for no purpose.
- **Marketing durations above 300ms** across `site.css` and
  `field-site.css`. AUDIT.md's budget table exempts *"Marketing /
  explanatory — can be longer"*, and the long header comments in those
  files document the intent.
- **The 90ms press-in / 180ms press-out asymmetry** at
  `src/app/globals.css:499-509`. AUDIT.md §4 asks for exactly this
  asymmetry; the comment there documents it.
- **`LandingMotion.tsx:17-22`'s symmetric scroll reveal.** Documented as
  a considered tradeoff. Not re-litigated.
- **Dead code with animation in it** — `src/components/ui/CountUp.tsx`,
  `src/components/marketing/FlipBoard.tsx`, `.spa-scrim`,
  `@keyframes sp-drift`. None is imported or rendered. Worth deleting,
  but it is a decluttering job, not an animation one.

## How to execute one

These plans are written for an executor with no context from the audit.
Each carries the current code verbatim, the exact target values, the
repo's own conventions with an exemplar, hard scope boundaries, and a
verification section including a feel check.

`improve-animations execute plans/001-reduced-motion-sledgehammer.md`
