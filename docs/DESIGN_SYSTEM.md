# Design system

The authoritative detailed frontend rulebook is `.claude/skills/straypaw-design/SKILL.md`. Read it before any visual work. This file is the short engineering contract and intentionally does not duplicate every rule.

## Product character

StrayPaw is civic infrastructure for field work: a shared animal register, map, evidence system and operational tool. It should feel like a well-made field instrument, census form, register or transit map — not generic SaaS.

Simplify before decorating: remove, group, establish hierarchy, align to the system, then consider adding.

## Source of tokens

`src/app/tokens.css` is the source of truth for reusable visual values. Do not introduce raw hex values, one-off radii, arbitrary spacing or animation timings in ordinary UI components when a token exists.

If a genuinely reusable value is missing, add it deliberately to the token system rather than creating component-local drift.

## Visual rules

- Warm light grounds; ink/navy for structure; blue is the primary action color; orange/flame is a restrained accent.
- Prefer rules, whitespace and grouping to stacks of floating cards.
- Buttons/actions and selectable rows have intentionally different shapes.
- Avoid glassmorphism, glowing blobs, grid/dot wallpaper, excessive gradients, stock SaaS illustration and decorative icons.
- No invented live numbers or records.
- Sparse/empty data must look intentional and useful.

## Typography

Use the fonts as actually wired by the current app and tokens. Historical planning files may mention older display-face choices and are not authoritative.

The design skill currently defines:
- DM Sans for interface text.
- Newsreader for tightly constrained editorial emphasis/large figures.
- DM Mono for exact data such as IDs, dates, coordinates and tabular values.
- `--font-display` resolves to the current display stack in the app; do not infer the face from the token name.

## Responsive behavior

Phone is the primary field surface. Verify meaningful UI changes at 320, 360, 390 and 1280 px.

- No body-level horizontal overflow.
- Keep coarse-pointer touch targets at least 44 px.
- Convert dense tables to readable record layouts on narrow screens when necessary.
- Keep controls reachable one-handed and legible outdoors.

## Maps and data graphics

Maps communicate recorded field evidence and coverage. They must not imply that unmapped equals no need or that recorded-animal density equals population density.

Use exact/private geometry only for audiences authorized to see it. Public surfaces should use approved aggregate/coarse representations.

## Institutional tone

Public and partner-facing surfaces should read as credible infrastructure. Avoid hype, apologetic beta language, excessive partner shout-outs, gamified copy where evidence is expected, or UI that looks like a generic growth dashboard.
