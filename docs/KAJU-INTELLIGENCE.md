# Kaju intelligence layer (November 2026)

What Kaju is now, what changed in this pass, how to switch on the paid model for the owner's first test, how to open
it to pilot organisations, and what is measured. Written 17 November 2026.

**Status: paid model inference is OFF.** No request was made to Anthropic, any other model, voice or embedding service
while building or testing this. Every model response in the tests is a fixture.

## 1. What existed, and what changed

Kaju already had a real engine (`src/sp3/ai/engine.ts`): about 40 record tools that read with the person's own
Supabase session (row-level security decides), a deterministic router that answers without a model, a Claude tool-use
loop behind a fail-closed gate (`src/lib/ai/inference.ts`), proposals that save only on Confirm, missions with approval
levels (`nx_kaju_tools`, `nx_kaju_policies`), automations, deterministic operational checks, Kaju Voice and a usage
ledger. The audit found these gaps, now closed:

| Gap found | Now |
| --- | --- |
| Once the environment was set, **any** signed-in user could use the paid model. No owner-only stage, no instant stop, no per-person or per-organisation rupee budget. | Owner-only by default, a database switch (off), grants with monthly rupee budgets and daily caps for people and organisations, an in-app emergency stop. |
| Output tokens were hard-coded at 4000 in two places; nothing capped one answer's cost; cache writes were under-counted. | Output allowance from settings (2000 default, 4000 ceiling); every model call is checked against the per-answer allowance *before* it is made; cache writes counted at 1.25×. |
| The **public bite helper** prefers a direct `ANTHROPIC_API_KEY` when one is present. | It never uses the direct key unless `STRAYPAW_BITE_AI_DIRECT_KEY=true`. See section 8. |
| Conversations lived in one browser tab. | Saved per person, resumable from the Kaju page and the panel; health conversations are never saved. |
| Structured answers (figures, tables, charts, timelines, record lists, fill-in-the-blank questions) were produced by the engine but **never drawn**: the renderer was removed in #116. | Restored on the current theme and wired into every conversation. |
| The panel knew the page's address and title, not the record open on it. | Case and animal pages pass the record; "this case" means it; plain statements become a note on it; two or three record-specific starting points. |
| "Check this package" and "this record" only recognised retired addresses (`/city/review`, `/ngo/packages`). | Today's `/ngo/submissions/…` and `/gov/verification/…` work. |
| The organisation's approved procedures (Rules & memory) were never consulted by chat. | `org_procedures` tool and rule: approved entries are quoted with their source; drafts, revoked, expired and other organisations' entries never are. |
| Hindi typed in Devanagari was stripped to nothing by the rules. | Read into the words the rules know (whole words only, names untouched); the model, when on, is told to reply in the person's language. |
| No feedback or pilot measurement. | One-tap rating, optional reason or time saved, a turn log with no text, and aggregates for leads and the owner. |

## 2. Architecture

One orchestrator, many small tools. No fine-tuning, no embeddings, no background agents.

```
Kaju panel (⌘J, every page) / Kaju page / @Kaju boxes / record "Tell Kaju" / Voice
        │  question + page context (path, title, open record ids: hints only)
        ▼
/api/ai  ── caller's own Supabase token; scope (user, org, role) read on the server
        │
        ├─ health turns ──────────────► fixed rules only (patient data never goes to a model)
        ├─ model gate open? ─ no ─────► deterministic router (understand.ts, capture.ts, hindi.ts)
        │                    yes       │
        │                              ▼
        │                   Claude tool-use loop (≤6 calls, per-call worst-case cost check)
        ▼                              │
     record tools (tools.ts, orgKnowledge.ts, connectTools.ts) — reads under RLS; writes only as proposals
        │
        ▼
  reply: text · citations from tool results · proposals (Confirm) · blocks (drawn by the app) · suggestions
        │
        ├─ kaju_turn_log (kind of request, outcome, tools, timing, tokens, cost; never text)
        └─ client: kaju_threads (saved conversation, owner-only)
```

Consequential work never runs from a chat answer: it is a proposal the person confirms (`confirm.ts`, audit row in
`ai_action_log`), or a mission step whose autonomy level comes from the database (`nx_tool_level`), where clinical,
laboratory, verification, payment and data-access decisions are level 4 (a person only).

### The paid-model gate (all must hold, otherwise fixed rules answer)

1. `STRAYPAW_AI_MODE=model`, a dated `STRAYPAW_AI_AUTHORISED_BY`, a monthly ceiling, daily quotas and token prices.
2. `STRAYPAW_AI_ROLLOUT`: `owner` (default) admits only `STRAYPAW_AI_OWNER_USER_ID`, and only with a confirmed email
   or phone; `grants` admits granted people and organisations.
3. Database switch `kaju_ai_control.live = true` (created **false**).
4. An active grant in `kaju_ai_access` for the person or their organisation, with budget left this month and requests
   left today.
5. The deployment-wide monthly ceiling not reached; per-instance concurrency free.
6. `STRAYPAW_AI_APPROVED_DATA_ROUTE` names exactly the transport and model in use.
7. Usage readable from the ledger. Anything unreadable, malformed or missing fails closed.

Within an answer: at most `STRAYPAW_AI_MAX_STEPS` (≤6) model calls, `STRAYPAW_AI_MAX_OUTPUT_TOKENS` (≤4000) per call,
and before each call its worst case (input estimated from size, full output allowance) must fit the smaller of
`STRAYPAW_AI_RUN_MAX_INR` (≤₹100, default ₹10) and what is left of the month's budgets. Every run is written to
`kaju_model_usage` with its cost.

**These are the application's own estimates and limits, not provider-enforced spending limits.** Two server instances
can each pass the check at the same moment, and the rupee figures come from the prices you set. Set a spend limit in
the Anthropic Console as well; that is the only hard cap.

## 3. Capabilities by role (verified without a model)

| Who | What works now, by fixed rules | With the model on (needs your live test) |
| --- | --- | --- |
| NGO members and leads | Case questions with filters and breakdowns, one case summarised, work summary, weekly digest, overdue follow-ups, missing evidence, duplicates, register figures, ward activity, claim draft, partner requests, bite-incident briefing (animal side), field messages → prepared records, tasks/notes/follow-ups/care in one line, organisation procedures, Academy lessons, report files, missions and automations, record-aware starting points, Hindi/Hinglish questions | Free-form questions, multi-step investigations, answers drawn as tables and charts, sentences with blanks, replies in Hindi |
| Municipal reviewers | Office brief, package checks claim by claim (never decides), package status | as above |
| Clinicians and health staff | Facility answers by fixed rules only; bite records from a note; PEP due lists | Never: patient work is not sent to a model |
| Researchers | Aggregate questions, data-access explanation | as above |
| Public | Bite help (its own switch), public programme figures | Bite help only with `STRAYPAW_BITE_AI` set |

Connected Gmail, Outlook, Calendar, Drive and Slack actions, email from missions, push and email notifications work as
before and show "Not connected" until their owner steps are done (`docs/rebuild/OWNER_ACTIONS.md`). WhatsApp and SMS
from missions remain **not connected**: Kaju prepares the message; nothing is sent.

## 4. Your first live test (owner only)

Do these in order. Until step 5 nothing can reach a model.

1. **Apply the migration** `supabase/migrations/20261119090000_kaju_intelligence_layer.sql` to production (additive:
   new tables and functions only). It creates the switch **off** and no grants.
2. **Find your user id**: Supabase → Authentication → Users → your account → copy the UUID.
3. **Vercel, Production** (keep the existing `ANTHROPIC_API_KEY`):
   `STRAYPAW_AI_MODE=model`, `STRAYPAW_AI_AUTHORISED_BY=<your name>:2026-11-DD`, `STRAYPAW_AI_ROLLOUT=owner`,
   `STRAYPAW_AI_OWNER_USER_ID=<uuid>`, `STRAYPAW_AI_MONTHLY_CEILING_INR=300`, `STRAYPAW_AI_USER_DAILY_REQUESTS=20`,
   `STRAYPAW_AI_ORG_DAILY_REQUESTS=40`, `STRAYPAW_AI_INR_PER_MTOK_IN=360`, `STRAYPAW_AI_INR_PER_MTOK_OUT=1800`,
   `STRAYPAW_AI_RUN_MAX_INR=10`, `STRAYPAW_AI_APPROVED_DATA_ROUTE=direct:claude-opus-5-5`. Redeploy.
   (₹300 is about $3.5 of your $5; ₹10 an answer is about 12 US cents, a generous worst case.)
4. **Set a spend limit in the Anthropic Console** for that key.
5. **SQL editor** (this is the moment it can spend):
   ```sql
   update public.kaju_ai_control set owner_user_id = '<uuid>', live = true, note = 'Owner first test', updated_by = '<your name>', updated_at = now();
   insert into public.kaju_ai_access (user_id, monthly_budget_inr, daily_requests, granted_by, note)
   values ('<uuid>', 150, 20, '<your name>', 'Owner first test');
   ```
6. Sign in, open **Kaju → Insights**. "Kaju's model (owner only)" should say *On*, list every setting as set, and show
   your grant. Ask one question in the Kaju panel; the line under the answer should read "Answered with a model".
   The panel shows this month's estimated spend; compare it with the Anthropic Console.
7. **To stop at any time:** the red "Stop all model use now" button on that panel, or `update public.kaju_ai_control set live = false;`,
   or `STRAYPAW_AI_MODE=tools_only` in Vercel and redeploy. Starting again is always the SQL in step 5.

What only the live test can show: whether the model chooses tools well, the quality of Hindi replies, real latency,
real token use per answer, and that the provider accepts the request shape. None of that is claimed here.

## 5. Opening it to Pawsome and other pilot organisations

1. After your own test, set `STRAYPAW_AI_ROLLOUT=grants` and redeploy.
2. Grant each organisation (its id is the `ngos.id`, or the organisation's id in `nx_my_workspaces`) a budget:
   ```sql
   insert into public.kaju_ai_access (org_id, monthly_budget_inr, daily_requests, expires_at, granted_by, note)
   values ('<pawsome org id>', 200, 60, now() + interval '30 days', '<your name>', 'Pawsome pilot');
   ```
   Or a single person: the same with `user_id` instead of `org_id`. Both a person's and their organisation's limits
   apply when both exist.
3. Revoke: `update public.kaju_ai_access set revoked_at = now() where id = '<grant id>';`
4. Without a grant, a person in a pilot organisation still gets the fixed-rule Kaju; nothing breaks.

Each organisation only ever sees its own records (RLS); grants change who may use the model, never what it can read.

## 6. What the pilot measures

| Signal | Where | Privacy |
| --- | --- | --- |
| What people ask Kaju to do | `kaju_turn_log.intent` (first record tool that ran) | Kind of request only; never the words |
| Which tools and surfaces | `tools`, `surface` (panel, page, channel, voice, capture) | Names only |
| Whether it finished | `outcome`: answered, prepared, clarify, no_match, limit, refused, error | — |
| Retries and corrections | `retry` (Try again), `correction` ("no, I meant…", "galat") | Detected, not stored as text |
| Usefulness | `kaju_feedback`: 👍/👎, reason, optional words | Words are optional and shown without the writer's name |
| Time saved | Optional "time saved?" after 👍 | Self-reported |
| Latency, tokens, cost per finished task | `latency_ms`, `input_tokens`, `output_tokens`, `cost_inr` | — |
| Confirmed actions | existing `ai_action_log` | As before |

Leads and admins see their organisation's aggregates under **Kaju → Insights → How Kaju is helping**; the owner sees
the whole pilot. A person can read only their own rows. Language (`en`, `hi`, `hinglish`) and page kind
(`/ngo/cases/[id]`, ids removed) are recorded to see where Kaju helps. Saved conversations older than 180 days can be
removed with `select public.kaju_threads_purge();` (service role).

## 7. Tests (no paid calls)

| Suite | Checks |
| --- | --- |
| `npm run test:kaju-spend` (new) | 21: owner-only rollout, verification, switch, grants, budgets, hard ceilings, per-call cost check, scripted tool loop, invented tools refused, proposals never write, cut-off and refusal handling, provider error fallback, six-call limit, bite help never uses the direct key, the log stores no text, no network |
| `npm run test:kaju-context` (new) | 13: record starters route correctly, notes on the open case, package checks on today's addresses, Hindi = English routing, org procedures (drafts/expired/revoked/other orgs excluded), no invented procedure |
| `npm run test:db` | +35 RLS checks on real Postgres (PGlite): switch unreadable and unwritable through the API, no self-grants, grants per org membership, owner-only stop, conversations private and hidden after leaving an org, health conversations refused, feedback only on one's own answers, aggregates only for admins/leads/owner, comments anonymous |
| `e2e/kaju-intelligence.spec.ts` (new) | Blocks drawn with axe WCAG 2 AA clean, blanks send the finished sentence, rating flows, no sideways scroll at 390, 768 and 1440 px, phone and desktop projects |
| Existing | All 44 unit scripts, 287 DB checks and 282 e2e tests in the Kaju, mission, accessibility, keyboard, records and gov/health specs pass |

Not tested here: anything signed in against a real database (the e2e answers are fixtures), the migration on staging
or production, real model behaviour, and email/WhatsApp delivery.

## 8. Risks and open items

- **Demo branch key.** In Vercel, `ANTHROPIC_API_KEY` is also set for the `demo` preview branch, where
  `STRAYPAW_BITE_AI=model` lets anyone use bite help with a model (300 turns a day per instance). The current demo
  deployment predates the key, so it uses the AI Gateway; the next `demo` deployment would have used your key. This
  change stops that, but only once it is on the `demo` branch. Until then, remove `ANTHROPIC_API_KEY` from the
  `demo` preview scope, or unset `STRAYPAW_BITE_AI` there, before any `demo` deploy.
- Budgets are the application's estimates, enforced per request, not provider limits (section 2).
- Concurrency is counted per server instance.
- Answers by fixed rules are in English even when the question is in Hindi; Hindi replies need the model.
- WhatsApp, SMS, and email from missions need the owner steps in `docs/rebuild/OWNER_ACTIONS.md`.
- Future autonomy: approved missions already run within tool levels; scheduled or event-driven model use is not
  enabled and would need its own grant type and limits.
