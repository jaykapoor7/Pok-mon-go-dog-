# 002 — Gate every hover transform behind a real pointer

- **Status**: TODO
- **Commit**: 5d87611
- **Severity**: HIGH
- **Category**: 6. Accessibility / 1. Purpose & frequency
- **Estimated scope**: 7 files, medium

## Problem

`@media (hover: hover) and (pointer: fine)` appears **zero times in any
CSS file in this repository**. Twenty rules change `transform` on
`:hover`, and none of them are gated.

On a touch screen a tap fires a hover, and the element **stays** in its
hover state until something else is tapped. So on the product's most
touched surfaces, things lift up and stay lifted. This is a phone-first
field product; touch is the dominant input.

The worst, by traffic:

```tsx
/* src/components/map/FeedingMarker.tsx:15 — current */
className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-status-hungry text-base shadow-pop transition-transform duration-150 hover:z-10 hover:scale-110 active:scale-95 dark:border-bark-900"
```

Map markers are tapped dozens of times per field session. `hover:scale-110`
plus `hover:z-10` leaves a permanently enlarged marker floating above its
neighbours. (`active:scale-95` is correct press feedback and must stay.)

```css
/* src/app/globals.css:520-533 — current */
@media (prefers-reduced-motion: no-preference) {
  ...
  .tlink:hover svg,
  .field-text-link:hover svg,
  .product-section-heading > a:hover svg,
  .mi-close a:hover svg,
  .wt-link:hover svg {
    transform: translate(2px, -2px);
  }
}
```

The author knew to gate this — they just gated the wrong axis. Reduced
motion and pointer capability are different questions.

```css
/* src/app/globals.css:270-271 — current */
  @apply transition-[transform,box-shadow] duration-200 ease-out
         hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 active:scale-[0.995];
```

`.card-interactive`, used in six components (`CaseCard.tsx:21`,
`FundraiserCard.tsx:18`, `FeedingZoneCard.tsx:11`, `HelpClient.tsx:80`,
`OrgManager.tsx:171`, `news/page.tsx:80`) — every list of tappable cards
a volunteer scrolls.

The rest, same fault, in descending traffic:

| file:line | rule |
| --- | --- |
| `src/app/product.css:288` | `.spa-global-report:hover{...transform:translateY(-1px)}` |
| `src/app/product.css:53` | `.product-primary:hover{...transform:translateY(-1px)}` |
| `src/app/product.css:100` | `.community-animal-row a:hover{...transform:translateY(-2px)}` |
| `src/components/site/field-site.css:33`, `:36` | `.field-button:hover` + its `svg` |
| `src/components/app/app.css:1324` | `a.dir-card:hover { transform: translateY(-3px); ... }` |
| `src/components/app/app.css:1649` | `.follow-card:hover { transform: translateY(-4px); ... }` |
| `src/components/app/app.css:898` | `.console-link:hover > svg:last-child { ... transform: translate(1px,-1px); }` |
| `src/components/app/app.css:668` | `.spa-atlas-primary:hover { ... transform: translateY(-2px); }` |
| `src/components/dashboard/CasePipeline.tsx:46` | `hover:-translate-y-0.5` |
| `src/components/site/site.css:540-541` | `.sp-node:hover { transform: translateY(-8px); }` — largest travel in the repo |
| `src/components/site/site.css:611` | `.sp-gap-card:hover { transform: translateY(-6px); }` |
| `src/components/site/site.css:1474`, `:2068` | `.sp-loop-stage:hover`, `.sp-part:hover` |

One is a comprehension bug rather than a cosmetic one:

```css
/* src/components/site/site.css:1111-1113 — current */
.sp-point:hover span,
.sp-point.selected span {
  transform: scale(1.45);
}
```

Hover shares a rule with `.selected`, so after a tap the point is
indistinguishable from the selected one.

## Target

Wrap every hover-transform rule in the pointer query. AUDIT.md gives the
exact form:

```css
/* target */
@media (hover: hover) and (pointer: fine) {
  .element:hover { transform: scale(1.05); } /* touch fires false hovers on tap */
}
```

For the Tailwind call sites, use the `@media` block in CSS rather than
rewriting the utility strings — except `FeedingMarker.tsx:15` and
`CasePipeline.tsx:46`, where the class list is short enough to edit.

For `FeedingMarker.tsx:15` the target class list is:

```tsx
/* target — src/components/map/FeedingMarker.tsx:15 */
className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-status-hungry text-base shadow-pop transition-transform duration-150 active:scale-95 [@media(hover:hover)and(pointer:fine)]:hover:z-10 [@media(hover:hover)and(pointer:fine)]:hover:scale-110 dark:border-bark-900"
```

For `src/components/site/site.css:1111-1113`, split the shared rule so a
false hover cannot impersonate selection:

```css
/* target — src/components/site/site.css:1111-1113 */
.sp-point.selected span { transform: scale(1.45); }
@media (hover: hover) and (pointer: fine) {
  .sp-point:hover span { transform: scale(1.45); }
}
```

## Repo conventions to follow

- Each stylesheet keeps its own rules; do not move rules between files.
  Wrap them in place.
- `src/app/globals.css` already nests media queries around motion (lines
  520-533). Nest the pointer query **inside** the existing
  `prefers-reduced-motion: no-preference` block there rather than
  replacing it — both conditions must hold.
- Exemplar of a correct pointer check in this codebase:
  `src/components/ux/TiltCard.tsx:29-30`, which checks pointer capability
  *and* motion preference before doing anything.

## Steps

1. `src/app/globals.css:520-533` — nest the five-selector `svg` transform
   rule inside an additional `@media (hover: hover) and (pointer: fine)`.
2. `src/app/globals.css:270-271` — move `hover:-translate-y-0.5` out of the
   `@apply` and re-express it as a gated rule below the class. Keep
   `hover:shadow-pop`, `active:translate-y-0` and `active:scale-[0.995]`
   exactly as they are.
3. `src/components/map/FeedingMarker.tsx:15` — replace the class list with
   the target above.
4. `src/components/dashboard/CasePipeline.tsx:46` — replace
   `hover:-translate-y-0.5` with `[@media(hover:hover)and(pointer:fine)]:hover:-translate-y-0.5`.
5. `src/app/product.css` — wrap the hover rules at :53, :100 and :288.
6. `src/components/site/field-site.css` — wrap :33 and :36.
7. `src/components/app/app.css` — wrap :668, :898, :1324, :1649.
8. `src/components/site/site.css` — wrap :540-541, :611, :1474, :2068, and
   split :1111-1113 as shown under **Target**.

## Boundaries

- Do NOT remove any `:active` rule. Press feedback is correct and must
  survive — AUDIT.md's press spec is `scale(0.95–0.98)`.
- Do NOT change any hover rule that only changes colour, background or
  border. Those are fine on touch; only movement sticks.
- Do NOT change the transform values themselves, only when they apply.
- Do NOT add new dependencies.

## Verification

- **Mechanical**: `npx tsc --noEmit` clean; `npx next build` exits 0;
  `grep -rc "hover: hover" src/` returns a non-zero count in at least
  seven files.
- **Feel check**: in DevTools, toggle device emulation to a phone
  (touch) and:
  - Tap a feeding marker on `/map`, then tap elsewhere. The marker must
    not stay enlarged.
  - Tap a card on `/following` and `/cases`. It must not stay lifted.
  - On `/`, tap a `.sp-point`. It must be visually distinguishable from
    the selected point.
  - Then switch back to a desktop mouse and confirm every hover lift
    still happens.
- **Done when**: no element remains visually transformed after a tap
  finishes, on any of the surfaces listed in the table above.
