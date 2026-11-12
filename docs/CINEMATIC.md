# The cinematic public site: "The whole world, connected."

The public website comes in two experiences. One value chooses between them.

| Value | What the public sees |
|---|---|
| `MARKETING_EXPERIENCE=legacy`, or unset | The website exactly as it was: homepage, header with its menus, footer, every page. **The default; production runs this.** |
| `MARKETING_EXPERIENCE=cinematic` | The new site: the landscape homepage, Meet Kaju at `/kaju`, the new navigation and footer on every public page. |

## Rollback, in one line

Set `MARKETING_EXPERIENCE=legacy` (or delete the variable) in the deployment's environment and redeploy the same commit.

No revert, no old code, no files restored. In Vercel: Project → Settings → Environment Variables → `MARKETING_EXPERIENCE`, then Deployments → the current deployment → Redeploy.

## How the switch works

- `next.config.mjs` reads `MARKETING_EXPERIENCE` once and writes it into the build (`env`). Anything other than `cinematic` means legacy.
- Four places choose with that same value, which the build turns into a constant: the homepage (`src/app/page.tsx`), `/kaju` (`src/app/kaju/page.tsx`), the header (`src/components/site/SiteHeader.tsx`) and the footer (`src/components/site/SiteFooter.tsx`).
- The experience that isn't chosen is left out of the bundles. The legacy build carries no cinematic script or style. `/kaju` is a 330-byte redirect to `/ai` there, and every public page's stylesheets contain no `cn8-` rule (checked). The cinematic build doesn't carry the legacy homepage.
- The legacy homepage is `src/app/_home/legacy.tsx`. It is a byte-for-byte copy of the homepage before this work (checked against `origin/main`).
- The value is written in at build time, so switching needs a redeploy, not just a restart. A redeploy of the same commit is enough.
- No backend, database, record, permission or authorisation change is involved.

## Where it is set now

| Environment | Value |
|---|---|
| Production (straypaw.org) | unset → legacy |
| demo.straypaw.org | unset → legacy |
| Preview of branch `claude/brave-hawking-0ohpo5` only | `cinematic` (Preview target, scoped to that branch) |

## What the cinematic site is

Nature → intelligence → product → trust, on one page, without scroll-jacking. The page scrolls normally. Only the opening scene is held while the camera moves.

| Chapter | What happens | Code |
|---|---|---|
| 01 The world | A full-screen hillside of grass and heather drawn live, with a slow camera drift. The headline, one line and two ways in sit above it. | `src/cine/Story.tsx`, `src/cine/world/*` |
| 02 The world made legible | As you scroll, the camera rises and the same ground becomes a map with contours. Points appear, and one animal's chain connects: Capture → Identity → Treatment → Release → Evidence → Verification. Each stage opens a small illustrative record. | `Story.tsx` |
| 03 Meet Kaju | Ask one of four questions. Kaju's run ticks through its steps, then answers with the records it used and what it prepared for a person. | `src/cine/KajuDemo.tsx` |
| 04 The actual platform | The app's own window (sidebar, squares, tabs, grey stage) opens from a point, for NGOs, municipal government, researchers, hospitals and CSR sponsors. | `src/cine/Platform.tsx` |
| 05 One connected ecosystem | One shared record linking animals, field teams, vets, NGOs, municipalities, hospitals, laboratories and researchers, each seeing what their role allows. Bengaluru's One Health programme is named as context. | `src/cine/Ecosystem.tsx` |
| 06 Proof and the way in | One operational field partner, then three labelled groups: live, illustrative (the demo) and planned. Then Explore live demo and Sign in. | `src/cine/Home.tsx` |
| `/kaju` | "Meet Kaju." Understand, Investigate, Prepare and Coordinate, each driving the demonstration, then the four rules Kaju keeps. | `src/cine/KajuPage.tsx` |

Navigation: Platform · Kaju · Solutions · Proof · Pricing, Sign in, Explore live demo. Over the homepage and `/kaju` it floats over the world. It becomes a glass bar on scroll, steps aside while you read down and comes back on the first scroll up. On every other page it is a white bar in the page's flow, where the old header stood, so existing layouts keep their spacing. On phones the menu opens as a sheet; Escape closes it, focus stays inside while it is open and the page behind doesn't scroll.

## What is illustrative, and labelled so

Everything with a record in it on the cinematic pages is illustrative and carries that label: the chain's records, Kaju's answers (SP-1044, SP-1067, SP-1042, Ward 14 · October), the five platform windows and the hospital doses. The real Kaju and real records are in the product and in the live demo (with sample records). The proof section says what is not connected yet: WhatsApp intake (waiting for Meta approval), hospital and laboratory information systems, and photo identification of animals. No partnership, accepted package, payment or integration is claimed.

## Engineering notes

- **No new dependency.** The world is one raw WebGL 2 canvas: a noise-terrain mesh and a fragment shader for grass, heather, light, fog and the map's contour lines. Markers are real, focusable buttons placed over projected points.
- **Performance.** The canvas renders at most 1.5× (1.25× on phones) and drops to a lower resolution if the first frames are slow. It stops drawing whenever it is off screen or the tab is hidden. The footer's small world sleeps until it is visible.
- **Without WebGL 2** the hillside is a still picture and everything else works.
- **Reduced motion:** the camera holds still, the story's height is shorter, Kaju answers at once, and every CSS transition and animation is off.
- **Accessibility:** a skip link (from the site's chrome), labelled landmarks, tab lists with `aria-selected`, live regions for Kaju's run, visible focus, and buttons for every point on the map.

## Tests

`e2e/marketing-experience.spec.ts` reads which experience the server runs and checks that one, so the same file runs against either build:

- legacy: the homepage is the earlier one; `/kaju` goes to `/ai`;
- cinematic: the headline, the five nav links and the demo link, plus the phone sheet; the chain's records; Kaju's steps, evidence and prepared note; the platform roles; proof's three groups; `/kaju`'s four capabilities; reduced motion; existing pages under the new bar; every nav and footer link resolves.

```
npm run build && npx next start -p 3100                                   # legacy
MARKETING_EXPERIENCE=cinematic npm run build && npx next start -p 3100    # cinematic
E2E_BASE_URL=http://localhost:3100 npx playwright test e2e/marketing-experience.spec.ts
```
