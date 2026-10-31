# StrayPaw 4 — GovDash reference spec (measured) and gap list

Measured 2026-10-31 from https://www.govdash.com in Chromium (1440×900, 834×1112,
390×844) with scrolled viewport frames (full-page captures lose its
scroll-revealed content) and computed styles. GovDash captures are kept out of
git (`docs/sp4/reference/`, local only); nothing of theirs is copied.

## Measured system

| Property | GovDash | StrayPaw 3.0 (failed) | StrayPaw 4 target |
|---|---|---|---|
| Face | Inter, headings 500 | DM Sans 600 | Inter (next/font), headings 500 |
| h1 | 60/62px, −0.045em | 76px, −0.035em, 600 | 60/62, −0.045em, 500 |
| h2 | 48/51px, −0.04em | 50px 600 | 48/51, −0.04em, 500 |
| Tab-panel h3 | 40/44px, −0.035em | 28px | 40/44 |
| Card h3 | 22/27.5px, −0.02em | 18px 600 | 22/27.5, 500 |
| Lede / body | 20/29px, −0.02em, grey #777 | 20px, slate | 20/29, grey #6f7380 |
| Nav | 72px tall, links 14px/500, −0.02em | 68px, 15px | 72px, 14px/500 |
| Ground / ink | #FFFEFA / #0B0F1C | #FBF9F4 / #0B1E3D | #FFFEFA / StrayPaw ink #0B1E3D |
| Accent | #024FF5 | #2457CE | StrayPaw blue #2457CE (brand) |
| Container | 1440 max, 64px gutters → 1312 content, left-aligned | 1200 | 1440 / 64 / 1312 |
| Buttons | pill (99px), 44px, 16px/500 | pill 44px 15px/600 | pill 44, 16/500 |
| Two-tone headings | ink line + grey line | none | yes |

## Section composition (homepage, top → bottom)

1. **Hero** — left-aligned 2-line h1, grey 2-line lede, 2 pills. Below, a 1312px
   product window: real app (workspace sidebar with coloured module squares,
   "Quick actions ⌘K", a daily-brief page with record mentions, AI prompt bar),
   a phone overlapping the right edge with a live thread.
   *StrayPaw 3.0 gap:* small generic dashboard, fake-looking table, phone and
   AI card pasted on top; no daily-brief narrative; 40% of the fold is copy.
2. **Proof wall** — 5-column grid of pale tiles, monochrome logos, "Case study ↗"
   tags. *Gap:* a sentence list of names.
3. **Use cases** — title + underline tabs stay pinned while the page scrolls
   through 8 panels (≈800px each); left 40px h3 + lede + "Explore →"; right a
   grainy greyscale photographic tile with a product fragment floating on it.
   *Gap:* static tabs, white boxed window, no texture, no sticky storytelling.
4. **Teammate** — 2 large + 3 small grainy tiles, each with one UI fragment,
   22px caption + grey line beneath. *Gap:* missing (we used icon cards).
5. **Agents (dark)** — #0B0F1C band, 120px padding; left list of jobs with a
   progress underline on the active one; right a real configuration form.
   *Gap:* our AI section was light chips + chat card.
6. **Integrations** — tiled wall of app icons; big feature tiles (one dark
   with an embedded chat). *Gap:* six bordered cards.
7. **Results** — 3 big numbers + one dark story card with portrait tiles.
   *Gap:* navy story cards repeated; no hierarchy.
8. **Security** — 3×2 pale tiles, tiny icon, 18px title, grey text.
9. **FAQ** — 2 columns: h2 left, accordion right.
10. **Closing CTA** — centred two-tone h2 (grey/ink), 2 pills.
11. **Footer** — dark, uppercase 11px column labels, 14px links.

Motion: content fades/rises once on entry (~400ms ease-out), tabs switch with
a short cross-fade, sticky panels, hover darkens pills; no parallax, no
gradients, no glows. App screens are compact: 13–14px UI type, 32px rows.

## StrayPaw 4 decisions

* Copy the craft, not the content: same rhythm, scale and restraint; StrayPaw
  workflows, data shapes and brand.
* Texture: original procedural greyscale "street light" tiles (SVG noise + soft
  light bars) instead of photographs we do not own.
* Product truth: hero/demo UIs are StrayPaw screens with illustrative records,
  labelled "Product demo"; real counts only where sourced.
* Commercial story: operator-first (ABC Operations & Verification), government
  oversight as the next stage; community, research and education in Resources.

## Verification

Each section is checked by viewport frames at 1440/834/390 next to the
reference sheet (`docs/sp4/reference/`) for: type scale, spacing rhythm,
visual-to-copy balance, texture/UI layering, interaction (tabs, sticky,
dropdowns, mobile menu), and reduced motion. Results in `docs/sp4/VISUAL-QA.md`.
