# StrayPaw motion

**The idea: a record being written.** Ink settles rather than bouncing. A line is drawn in the order things happened, at a constant speed, because it stands for time. A figure arrives at its value and holds long enough to be read.

Movement only ever says one of three things:

- this changed;
- this came from there;
- this happened before that.

Nothing moves just to be noticed.

The vocabulary was chosen from the 637 techniques in [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion) (© 2026 gongnyang, MIT licence). It was then tuned down to StrayPaw's quieter register. The sections below list what was taken, where it lives and what was deliberately refused.

## Tokens

| | CSS (`src/app/tokens.css`, `src/app/motion.css`) | JS (`src/lib/motion.ts`) | Use |
|---|---|---|---|
| touch | `--sp-fast` 160ms | `DUR.touch` | a control under the finger |
| base | `--sp-base` 280ms | `DUR.base` | state changes, the nav indicator |
| enter | `--sp-slow` 500ms | `DUR.enter` | something entering the page |
| scene | `--sp-scene` 850ms | `DUR.scene` | a section arriving, a bar growing |
| count | — | `DUR.count` 1100ms | a figure counting to its value |
| stagger | `--mo-stagger` 45ms, capped at 600ms | `STAGGER`, `STAGGER_CAP` | siblings in reading order |

| Curve | CSS | JS | Use |
|---|---|---|---|
| settle | `--sp-ease` `cubic-bezier(.23,1,.32,1)` | `settle` | arriving; the default |
| decel | — | `decel` (power2.out) | counting, growing |
| travel | — | `travel` (cubic in-out) | camera moves; anything that leaves as well as arrives |
| linear | `linear` | `linear` | lines that stand for time |
| confirm | `cubic-bezier(.34,1.4,.64,1)` | reels: `E.confirm` | **the only spring**: a decision becoming true |

## What is applied, and where

| Technique (catalogue slug) | Where | How |
|---|---|---|
| `retarget-motion` (+ `count-up` opt-in) | Dashboard KPIs (`Dashboard.tsx`), via `components/motion/Tally.tsx` | An app figure appears at its true value at once (DESIGN.md: never delay primary data). When the city or lens changes, it travels from the shown figure to the new one, so the change is seen. `countIn` opts story surfaces into count-up from zero. Digits are written to the text node, not through React state, and `tabular-nums` keeps the width still. |
| `map-event-accumulation` | National map bubbles (`SpatialMap.tsx`) | Bubbles settle largest-first, 70ms apart, driven by a paint expression over a per-feature rank. Labels fade in with them. It runs once per lens. If interrupted, every bubble lands at full size. |
| `fly-to` | Map camera (`SpatialMap.tsx` `camera()`) | Duration scales with the zoom distance (`cameraDuration`, 0.7–1.9s) using the `travel` curve. A hop between cells is quick; India to a city is a journey. |
| `line-draw` + `temporal-overlap` | Animal chronology (`LivingChronology.tsx`) | A hairline life line draws down through each entry's mark at constant speed. Each mark settles as the thread reaches it. |
| `bar-grow` | City Brief outcomes bar (`CityOperations.tsx`) | `.mo-grow`: `scaleX` from the baseline, never width. |
| `stagger` + `fade-slide` | Care Inbox, Follow-ups, City Brief lists | `.mo-list`: 10px rise, 45ms apart, all in by about 0.6s. |
| `active-indicator-glide` | Desktop nav, phone tab bar, phone section tabs (`useGlide`) | One indicator per strip, measured per item (tabs are never assumed equal width) and moved by `transform` only. The first placement is instant. |
| progress fill | Report flow step rail (`motion.css`) | Each step's rule fills from the left as the reporter reaches it. |
| confirm + `line-draw` | "Take this case" (`CaseRegister.tsx`) | A check presses in and its stroke draws, at the moment the case becomes yours. |

The report flow's directional step transition (`AnimatePresence`, 28px, 220ms) predates this pass and was already within the system. It was left as it is.

## Accessibility and performance rules

- **Reduced motion gets the finished state, never a hidden one.**
  - CSS utilities only exist inside `@media (prefers-reduced-motion: no-preference)`.
  - `tween()` and `Tally` deliver the final frame at once.
  - framer-motion runs under `MotionConfig reducedMotion="user"` (`MotionRoot.tsx`).
  - The global rule in `globals.css` reduces every remaining transition to an instant change.
- **Only compositor properties move:** `transform`, `opacity` and `stroke-dashoffset`. No width, height, top or left is animated. MapLibre radius changes are paint-property updates, which go to the GPU anyway.
- **Server-rendered figures are true figures.** `Tally` renders the real number on the server. A reader without JavaScript, or with a screen reader, never meets a zero.
- **Motion never carries meaning alone.** Every animated figure keeps its label and qualifier beside it, and the map keeps its legend.

## Refused, and why

These were refused:

- glitch and RGB split;
- particle bursts and assemblies;
- film grain;
- fluted glass;
- kinetic type sweeps;
- text scramble and typewriter in the product;
- parallax;
- 3D card tilts;
- soft-body jiggle;
- elastic overshoot on anything but a confirmation.

Each of them draws attention to the interface rather than to the record, and most of them read as generic AI motion. The catalogue's own "avoid" notes were followed:

- **Final states hold for at least 0.5s.** A figure must be readable before anything else moves.
- **Stagger follows reading order** and is capped at about 1.5s in total.
- **Accumulation never erases earlier marks.**
- **Motion is never the only way to read a value.**

## Instagram reels

`scripts/reels/` renders premium 1080×1920 reels from the live public record. It uses a seek-and-capture pipeline adapted from awesome-ai-motion's `scripts/render.mjs`, so every frame is exact, and it runs on Playwright, Chromium and ffmpeg.

```sh
npm run reel:snapshot          # dated snapshot of /api/spatial?kind=cities + India outline
npm run reel -- atlas          # → scripts/reels/out/atlas.mp4 + atlas-cover.jpg
npm run reel -- careos         # → scripts/reels/out/careos.mp4 + careos-cover.jpg
npm run reel -- atlas --fps 60 # smoother, larger
```

Open `scripts/reels/scenes/<scene>.html` through any static server to preview a scene live: it loops by itself. Add `?t=8.2` to freeze a frame.

### Scenes

| Scene | Length | Recipe | What it shows |
|---|---|---|---|
| `atlas` | 16s | data-story | The India outline draws in, then cities accumulate largest-first while the city and profile counts arrive. Focus hands off to Coimbatore (rescue & care) and then Ranchi (vaccination campaign). The caveat follows, then the end card with the snapshot date. |
| `careos` | 15s | product-demo | The homepage photograph with the hook, then the four CareOS steps disclosed along one thread, in the homepage's exact words. WhatsApp is marked **Pilot**. The end card points to the founding NGO pilot. |

### Rules for a new scene

1. **Figures come from `data/snapshot.json`, never typed by hand.** The end card states the snapshot date.
2. **Caveats are part of the reel, not small print.** For example, Jamshedpur's clinical register is ringed apart and never counted as street profiles.
3. **Never present an unshipped feature as live.** Use the site's own wording for what is in pilot.
4. **Use only real StrayPaw assets.** That means `public/` photographs and art, the mark and the India mask. Images that show an injured animal are not used.
5. **Keep text inside `.safe`.** Instagram's controls cover roughly the bottom 330px and the right 140px.
6. **Build every track as a pure function of time** with `timeline().add(start, len, fn, ease, key)`. Helpers (`maskLines`, `rise`, `fade`, `draw`, `count`) key themselves, so a later fade on the same element takes over cleanly.

DM Sans is vendored in `scripts/reels/assets/fonts/` under the SIL Open Font License (`OFL.txt`), so renders do not depend on the network.

## Credits

The technique catalogue and the render approach come from [gongnyang/awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion), MIT licence, © 2026 gongnyang. No code from the catalogue's effects is shipped in the product. `scripts/reels/render.mjs` and `lib/reel.js` follow its page contract (`__seek`, `__ready`, `__dur`, `__size`, `__poster`) and its capture approach.
