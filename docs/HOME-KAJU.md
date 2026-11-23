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
first holds there is a short still stretch, so the scripted demo can be watched and its pause and scene controls stay
put before the window starts to grow.

Screenshots: [before and after, desktop](home-kaju/before-after-desktop.jpg) ·
[the journey through Kaju](home-kaju/kaju-journey-desktop.jpg) · [before and after, phone](home-kaju/before-after-phone.jpg).

## How it is built

| Part | Where | Notes |
| --- | --- | --- |
| The passage (pinning, growing in, drawing back) | `src/sp4/home/kx/Passage.tsx`, `passage.css` | One sticky stage. Per frame it writes `transform`, `clip-path` and `opacity` on five elements; nothing is laid out again. |
| Kaju's frame | `src/sp4/home/kx/KajuLive.tsx`, `live.css` | The app's stylesheet (`.nx`), `Composer`, `Thread`, `Blocks`, proposal cards and Kaju's rig, unchanged. Loaded on first intent (scroll, tap, key) or after 3.5 s idle, never with the first load. |
| The conversation | `src/sp4/home/kx/demoKaju.tsx` | Gives those components the context they read in the app (`KajuCtx`, now exported from `src/nx/kaju/state.tsx`), pointed at the public endpoint. Kept in `sessionStorage` only. |
| The sample programme | `src/lib/kaju/demo/programme.ts` | The hero demo's own Ward 14 ABC Unit, written out as records. Every name and figure is invented and labelled "Sample programme" wherever shown. |
| Tools, rules, model | `src/lib/kaju/demo/{tools,rules,model,engine}.ts` | Same reply shape as the product (`AiReply`), same block checks, same transport (NDJSON progress lines, then the reply). |
| The endpoint | `src/app/api/kaju/demo/route.ts` | Public. See below. |

**First load** (production build, measured locally against the commit before): the homepage's first-load script is
237 kB against 233 kB, largest paint and layout shift are unchanged (shift 0), and nothing in the page's flow moves
when the passage switches on. Kaju's own code (about 70 kB of script and 115 kB of styles, uncompressed) is fetched on
first intent.

**Reduced motion:** nothing pins and nothing travels. The hero card is as it was and Kaju is an ordinary section under
it. **No JavaScript:** the hero is exactly the earlier one.

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
| `e2e/home-kaju.spec.ts` | the hero unchanged and the product's code absent from the first load; in, ask, record card, confirm, out, back; scrolling never held; Escape and focus; axe WCAG 2 AA inside Kaju; reduced motion; no JavaScript; the endpoint's refusals. Phone and desktop projects. |

Not tested here: a real phone's on-screen keyboard and retracting browser bars (emulated only), and any model.
