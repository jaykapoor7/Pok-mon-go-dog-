# VISUAL SYSTEM & MOTION — HIGH PRIORITY ACCEPTANCE REQUIREMENT

## The user's aesthetic direction
Attio-dominant, Linear precision, Raycast focus, Slack warmth, Inngest workflow clarity. Beautiful **functionality**: every row has hierarchy, every view has a reason, motion helps orientation. Creative and distinctive, not another generic SaaS clone. Do not spend design budget on random animations while forms and table density remain ugly.

## Layout and density
- 8pt spacing system; local 4pt for very dense row metadata. Real grid alignment and consistent type rhythm. No visual gradients; no neon AI decoration.
- Five-colour functional palette **maximum** (counting accent/chromatic families, not neutral grey/white/black). Suggested: deep navy/ink, cobalt/blue accent, muted teal/success, amber/warning, red/critical — actual accessible shades to choose in design phase. Monochrome surfaces are primary.
- Dark and light mode of equal quality; don't let dark become oversaturated purple gradients.
- Secondary borders only where useful; prefer separation by spacing, subtle shading, fine dividers.
- Compact Attio-style rows typically 40–48px with clear focus/hover/selected states and extended metadata only when meaningful. Important primary actions nearby.
- Charts must answer a question, show units, denominators, time spans, drilldown and no invented measurements.
- Avoid huge home hero + 4 KPI cards + two empty tables. Instead use queues, meaningful snapshot, crosslinked records and a live activity rail.
- Content density should be configurable for heavy desktop users, while preserving touch dimensions on phone.

## Motion language
- **Hover:** 80–140ms gentle background/luminance, icon nudge or reveal; never content jumping around.
- **Tap/button press:** 70–110ms slight scale (~0.985) and active state; distinguish disabled/loading/failed/succeeded.
- **Inline save success:** status text + 150–250ms draw-check or small settle; avoid confetti. A completed row can slide/reorder or fade into its new group in ~180–260ms.
- **Drawer open:** 180–260ms transform + opacity with content already skeletoned; preserve focus and scroll.
- **Kaju expand compact -> full:** 260–420ms shared-element transition; avoid flashing/remounting conversation state; honor keyboard focus.
- **Tabs:** 140–230ms shared indicator; content changes only when ready; avoid reanimating entire page on simple filter changes.
- **Tables/filter:** short crossfade or animated list reflow (max ~220ms) without delaying updates; stable columns and row identities.
- **Messages:** subtle insertion and scroll anchoring, thread pane transition; no bouncing on every message.
- **Mission steps:** status changes animate to completion with a check and short highlight; progress line is truthful to actual execution state.
- **Charts:** restrained initial line/path or scale reveal ONLY on first actual data view, not on every mouse movement.
- **Loading:** shape-matched skeletons, no spinner explosions, no layout shifts; optimistic interaction only when rollback is safe.
- **Failure:** explain and offer retry or correction, no celebratory motion.
- **Reduce motion:** reduce or disable non-essential movement; accessibility and focus never depend on animation.

## Required signature interactions (visually demo all)
1. Open animal row into record drawer, smoothly resize detail panes, return to same filtered table scroll.
2. Click 'Vaccination recorded' and watch truthful save state settle into a verified/awaiting-review badge, with activity event inserted.
3. Mark field task complete: row animates to completed group while counters update; no confetti.
4. Open messages channel, reply in thread, @Kaju generates record-linked task preview then accepted action appears in Work tab.
5. Kaju composer recognizes/edit-underlines intent while typing; one final submit; no surprise external actions.
6. Collapse/expand Kaju with preserved conversation and mission state using shared-element transition.
7. Approval slider/confirmation for important bulk action with safety summary and success state.
8. Government chart selection updates map/table together, selected geography persists across tabs.
9. Phone camera/voice report capture uploads offline with visibly pending sync then resolves to source record.
10. Tab, drawer, dialog and command menu are keyboard navigable with clear focus rings.

## Mobile-specific creativity
- Purpose-built phone home (one primary action, stacked priority work, compact filter chips, focused messages, persistent Kaju entry).
- Bottom nav + clean drawers and bottom sheets; no desktop hover-only affordances or horizontal page overflow.
- Capture actions with camera, voice, geo picker and resilient offline upload. Large thumbs for actionable evidence; use full-screen record detail instead of microscopic side rail.
- Motion can feel native using interruptible spring transitions, but respect devices and keep offline/low-power experiences fast.

## Technical/accessibility constraints
Target smooth 60fps on realistic midrange phones for UI interactions, virtualize large tables, use transforms/opacity where practical, lazy-load heavy charts/maps, avoid excessive `will-change` and reflow, test WCAG 2.2 AA, usable at 200% zoom, 44px touch targets, proper reduced-motion and high-contrast focus. Use animation libraries only when they are compatible with current React/Next stack.

## Visual QA gate — mandatory before release
Capture and compare **1440px, 768px, 390px** for NGO Today, Animals table, Animal record, Government Insights, Healthcare clinical queue, Research Explore, Channels, Kaju compact/full-screen and onboarding. Test light/dark, empty/loading/error/populated, and multi-step micro-interactions (short clips where possible). Review visual density, data meaning, row actions, brand, performance, focus, animation quality and responsiveness. This is a pass/fail gate, not a design suggestion.
