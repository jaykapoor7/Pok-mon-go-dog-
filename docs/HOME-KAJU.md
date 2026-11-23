# Kaju on the homepage (November 2026)

The homepage hero now leads into the product itself. Scrolling on from "Meet Kaju", the product window on the blueprint
grows until it fills the screen and becomes Kaju: the app's own conversation, answering a visitor's own questions
about a sample programme. Scrolling further, the interface draws back into a framed window, the page's header returns,
and the page continues with the partner wall as before.

Nothing else on the homepage changed: the headline, both hero buttons, the scripted demo, every section after it and
their order are as they were. `MARKETING_EXPERIENCE=cinematic` is untouched.

## What a visitor can do

| | |
| --- | --- |
| Go in | Scroll, press **Ask Kaju yourself** on the blueprint, or click the product window. |
| Ask | Type anything, or start from a suggested question or one of the "Kaju noticed" cards. Answers arrive as words, tables, charts, timelines and record lists, each naming the records read. |
| Open a record | A record link in an answer opens that record as a card inside the window (stage, evidence, full history). It never navigates away. |
| Confirm | "Remind Ravi to…" prepares a task card. Confirm marks it confirmed and says nothing was stored. |
| Come out | Keep scrolling, press **Step out**, or press Escape. |
| Come back | **Back to Kaju** on the blueprint, or the chip at the bottom left of any later section. The conversation is kept for the browser tab. If an answer arrived while they were elsewhere, the chip says so. |

Scrolling is never held. Wheel, touch and keyboard always move the page; an answer never moves it. When the card
first holds there is a still stretch (a little under half a screen), so the scripted demo can be watched and its pause
and scene controls stay put before the window starts to grow. "Ask Kaju yourself" lands in the middle of the inside
stretch, with the same slack above and below, so a nudge of the page does not tip a visitor back out.

Screenshots: [before and after, desktop](home-kaju/before-after-desktop.jpg) ·
[the journey through Kaju](home-kaju/kaju-journey-desktop.jpg) · [before and after, phone](home-kaju/before-after-phone.jpg).

## The choreography (second pass)

The brief was to make the passage feel art-directed without leaving StrayPaw's own register. The rule kept throughout
is the one in `docs/MOTION.md`: movement says *this changed*, *this came from there*, or *this happened before that*,
and nothing moves just to be noticed. Everything below is built from material the page already had (the plan of the
ward, Kaju, the ask field, the hero's rising words); nothing was borrowed from elsewhere.

| Moment | What moves | What it says |
| --- | --- | --- |
| The card arrives and holds | Nothing. The scripted demo plays; its pause and scene controls stay put. The arrow on "Ask Kaju yourself" nods. | Here is the product. |
| Going in | The window grows to the whole screen. The plan of the ward is drawn in three depths and comes nearer, the nearest marks fastest (one camera move, `travel` curve). | You are going into the ward. |
| | Kaju leaves his perch on the window and lands in his seat inside the product. He is one dog throughout: the perch empties as he takes off and the seat fills as he lands. | He came from there. |
| | The demo gives way to a clean sheet in register with it, and the demo's ask field travels across that sheet to become the real composer. | This is the same field, and now it is yours. |
| | The product's parts arrive in reading order: the frame from its edges, Kaju's words, the starting questions, what he noticed. | This happened before that. |
| Arrived | The composer shows a ring once; Kaju waves. | It is ready. |
| Coming out | The interface draws back and leans away a little; the plan pulls back; the card closes round it; the page header returns. | You are leaving the ward. |
| | Kaju hops back out and sits on the framed window. The plan marks the window's four corners and captions it in its own lettering. | He is where you met him, and the product is now one detail on the plan. |
| | The handover line rises word by word, in reading order (the hero headline's own motion), then its two actions. | What comes next. |
| Leaving | As the stage scrolls away its depths part slightly (the plan lags, the line leads). | It is behind you. |
| Waiting | The framed window lifts under the pointer; Kaju wags when the pointer is on it; the plan's capture and release points breathe. | It can be opened again. |

What is drawn follows the scroll through a settle of about a tenth of a second, so a wheel notch reads as one movement.
The settle applies only inside the passage; before it, the card follows the page exactly, so the demo's controls are
where a pointer expects them. Where the visitor *is* (and so what can be pressed) follows the scroll with no delay.

**On the house rules.** `docs/MOTION.md` refuses parallax, card tilts and kinetic type in the product because they
draw attention to the interface. This is the landing page, which already leans its product window towards the pointer,
and each of the three is used here as one of the things the rules allow: the depths of the plan are a camera move
(the map's own `fly-to`), the lean is the window travelling away and is flat at rest, and the line of type is the hero's
existing word rise in reading order, not a sweep. No overshoot, no blur, no particles, no glass. If the owner would
rather the landing kept strictly to the product's rules, the depths, the lean and the word rise are three constants in
`Passage.tsx` (`depth`, `lean`, the word loop) and can each be set to nothing without touching the rest.

**On libraries.** GSAP's ScrollTrigger and Flip were considered. They would add roughly 40 kB (compressed) to a
homepage whose first load is tested for weight, to do what is about two hundred lines here: a scrubbed timeline of
sub-ranges, a damped follow, and shared elements placed by transform. Nothing was added to `package.json`.

**Cost per frame** (production build, desktop, main thread only): about 9 ms going in and 6 ms coming out, against about
20 ms for the existing hero above it; nothing is written at rest inside the product, and no frame of the passage lays
anything out. Only `transform`, `opacity` and `clip-path` change. The window's shadow is painted once and faded.

## How it is built

| Part | Where | Notes |
| --- | --- | --- |
| The passage (pinning, growing in, drawing back) | `src/sp4/home/kx/Passage.tsx`, `passage.css` | One held stage. Per frame it writes `transform`, `clip-path` and `opacity` straight onto the elements that move; nothing is laid out again and nothing is written at rest. |
| Kaju's frame | `src/sp4/home/kx/KajuLive.tsx`, `live.css` | The app's stylesheet (`.nx`), `Composer`, `Thread`, `Blocks`, proposal cards and Kaju's rig, unchanged. Loaded on first intent (scroll, tap, key) or after 3.5 s idle, never with the first load. |
| The conversation | `src/sp4/home/kx/demoKaju.tsx` | Gives those components the context they read in the app (`KajuCtx`, now exported from `src/nx/kaju/state.tsx`), pointed at the public endpoint. Kept in `sessionStorage` only. |
| The sample programme | `src/lib/kaju/demo/programme.ts` | The hero demo's own Ward 14 ABC Unit, written out as records. Every name and figure is invented and labelled "Sample programme" wherever shown. |
| Tools, rules, model | `src/lib/kaju/demo/{tools,rules,model,engine}.ts` | Same reply shape as the product (`AiReply`), same block checks, same transport (NDJSON progress lines, then the reply). |
| The endpoint | `src/app/api/kaju/demo/route.ts` | Public. See below. |

**First load** (production build, measured locally against the commit before): the homepage's first-load script is
240 kB against 233 kB, largest paint and layout shift are unchanged (shift 0), and nothing in the page's flow moves
when the passage switches on. Kaju's own code (about 70 kB of script and 115 kB of styles, uncompressed) is fetched on
first intent.

**Reduced motion:** nothing pins and nothing travels. The hero card is as it was and Kaju is an ordinary section under
it. **No JavaScript:** the hero is exactly the earlier one.

### How the stage is held, and why

`position: sticky` catches the stage and lets it go (on the compositor, to the pixel). Between those two moments the
stage is `position: fixed` instead, in the identical spot: the passage switches three pixels inside either end, where
the two agree (measured: the stage is within half a pixel of where it should be across both seams, at 1440×900,
1280×720 and on a phone).

The reason is what a browser does to keep something in view. For a caret in the composer, a focused control, or a tool
scrolling a button into view, it scrolls whatever holds the thing, and for a box held by `sticky` it can reckon from
where the box started on the page. With a sticky stage, pressing Enter in the composer pulled the page up by about
800 px and tipped the visitor out of the product, and pressing one of the scripted demo's controls could carry the page
on into the product. It happened only when the page was busy, so it showed as a rare, random failure. Nothing inside a
fixed box can ask the page to scroll, so both are gone (0 in 24 and 0 in 60 runs, from 4 in 6 and 2 in 6).

Three smaller guards came out of the same investigation:

- "Ask Kaju yourself" lands in the middle of the inside stretch, not at its edge.
- A new answer is scrolled into place inside Kaju a frame at a time by the page's own code, and that yields the moment
  anything else scrolls the conversation; a short answer is placed whole above the composer, so its Confirm is in reach.
- A click on the demo window means "go in" only when the page has been still for 0.4 s; typing while the move in is
  finishing does not interrupt it, and a key that scrolls the page does.

## Isolation

The endpoint can reach one in-memory sample and nothing else. It creates no database client for records, forwards no
session, reads no organisation and has no write path. A unit test (`npm run test:kaju-home`) fails if any file under
`src/lib/kaju/demo` or the route imports a Supabase client, the staff engine or its tools, or reads a session.
Links in answers are restricted to sample records (`/#record/…`); anything else a model writes is dropped before it is
drawn. Nothing a visitor types is stored or logged; a log line holds a status only.

## The model switch (off)

**Status: no model is switched on for the homepage.** As shipped, Kaju answers the sample by fixed rules, which costs
nothing, and every answer says so ("Answered by fixed rules…"). It handles the suggested questions, record codes,
evidence, the package, wards, the team, tasks and what stays with people; for anything else it says plainly that it
only reads the sample.

To let visitors ask free-form questions on a model, the owner sets all of:

```
STRAYPAW_HOME_AI=model
STRAYPAW_HOME_AI_AUTHORISED_BY=<your name>:2026-MM-DD
STRAYPAW_HOME_AI_DAILY_TURNS=300          # model answers a day, whole deployment
```

and a credential the sample may use: the Vercel AI Gateway (`AI_GATEWAY_API_KEY`, or `STRAYPAW_AI_ALLOW_OIDC=true`),
or `STRAYPAW_HOME_AI_DIRECT_KEY=true` to let it spend the deployment's `ANTHROPIC_API_KEY`. Without that last line the
staff key is never used for the public page. It also needs `SUPABASE_SERVICE_ROLE_KEY` (Production only), because the
daily caps are counted in the database across every server instance (`check_rate_limit`, already deployed); without
that shared counter no model is called.

Optional, each with a ceiling in code:

| Variable | Default | Ceiling |
| --- | --- | --- |
| `STRAYPAW_HOME_AI_VISITOR_DAILY` (model answers per visitor per day) | 20 | 100 |
| `STRAYPAW_HOME_AI_MAX_OUTPUT_TOKENS` (per model call) | 1500 | 3000 |
| `STRAYPAW_HOME_AI_MAX_STEPS` (model calls per answer) | 4 | 5 |
| `STRAYPAW_HOME_AI_MAX_CONCURRENT` (per instance) | 4 | 8 |
| `STRAYPAW_HOME_AI_MODEL` | `claude-opus-5-5` (the deployment's usual model) | any model the key can use |

The model is a cost decision: this is a short, tool-led conversation, and a smaller model (for example
`claude-haiku-5-5`) costs a small fraction per answer. Set a spend limit in the Anthropic Console or the Gateway as
well; these are the application's limits, not the provider's.

To stop: unset `STRAYPAW_HOME_AI` (or set it to anything but `model`) and redeploy. Kaju goes back to fixed rules; the
page does not change.

### What bounds one visitor, with or without a model

- A request a browser makes from another site is refused (`Sec-Fetch-Site`, `Origin`). A script that sends neither
  header is still held by the limits below; the deployment-wide daily cap is the hard bound on model cost.
- 8 questions a minute and 60 an hour per visitor, on every answer including the free ones.
- A question is at most 600 characters; a conversation at most 24 questions; the request body at most 24 KB; only the
  last 12 turns are read.
- One answer: at most 4 model calls, 8 tool calls, 1500 output tokens a call and 28 seconds.
- The system prompt keeps Kaju to the sample programme and how StrayPaw works; other requests get one line.
- When any limit is reached the fixed rules answer, and the answer says why.

### What only a live test can show

No request was made to a model while building or testing this; every model response in the tests is scripted. Tool
choice, tone, Hindi replies, real latency and real cost per answer need the owner's own test with the switch on.

## Tests

| Suite | Checks |
| --- | --- |
| `npm run test:kaju-home` | 12: the switch and its ceilings, the daily cap, isolation of the sample's code, the sample's own consistency, every tool, the fixed rules, the scripted tool loop (invented tools, links out of the sample, step and tool limits, refusals, provider errors), clipping, no network |
| `npm run test:inference-off` | the homepage sample is on the list of model callers and asks its own gate |
| `e2e/home-kaju.spec.ts` | the hero unchanged and the product's code absent from the first load; in, ask, record card, confirm, out, back; scrolling never held; Kaju, the ask field and the plan each one thing all the way through, forwards and backwards, with nothing left styled at rest; Escape and focus; axe WCAG 2 AA inside Kaju; reduced motion (none of the passage's parts drawn); no JavaScript; the endpoint's refusals and its per-visitor limit. Phone and desktop projects. |

Not tested here: a real phone's on-screen keyboard and retracting browser bars (emulated only), and any model.
