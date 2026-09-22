# App Store Product Researcher

An [Agent Skill](https://agentskills.io) that validates App Store niche ideas using real competitor data, user reviews, and revenue estimates — then delivers a go/no-go verdict.

Compatible with [30+ AI coding agents](https://agentskills.io) including Claude Code, OpenAI Codex, Cursor, and Gemini CLI.

## Pipeline

```
Niche → Competitors → Reviews → Gap → App Idea → Validation Score (1-10)
```

1. **Competitors** — Multi-keyword iTunes search + Sensor Tower revenue/downloads. Direct vs. Adjacent tagging.
2. **Reviews** — 50 recent reviews per app. Recent sentiment vs. overall rating to detect declining apps.
3. **Gap** — Biggest unmet need, consistent failures, switching triggers.
4. **Idea** — Name options, features mapped to complaints, onboarding, monetization, viral concept.
5. **Score** — Pain / Market / Gap / Monetization / Build difficulty. Honest build-or-skip verdict.

## Quick Start

```bash
# Claude Code
/app-store-product-researcher "Quit Vaping"

# Any agent — place repo in project, then prompt:
# "Research the 'Quit Vaping' niche using the scripts in scripts/"
```

## Scripts

Free APIs, no auth. Work standalone or via agents.

```bash
bash scripts/search_apps.sh "habit tracker" [country] [limit]   # iTunes Search API
bash scripts/fetch_app_stats.sh "ID1,ID2,ID3"                   # Sensor Tower estimates
bash scripts/fetch_reviews.sh APP_ID [country] [page]            # iTunes RSS reviews
```

## Example

From a "Digital Detox" run:

| App | Downloads | Revenue | Overall | Recent | Signal |
|-----|-----------|---------|---------|--------|--------|
| Opal | 300k | $700k | 4.79 | 3.42 | Declining |
| BePresent | 200k | $300k | 4.84 | 3.02 | Severe decline |
| ScreenZen | 100k | $30k | 4.85 | 4.88 | Thriving |

**Score:** 7.0/10 — *"Build if you have a differentiation story. ScreenZen owns the honest-free position."*

## Multi-Agent

Supports parallel execution (~2x faster, tested):

```
Coordinator
  ├── 3 Search Agents (parallel)   → deduplicate → Sensor Tower batch
  ├── 3 Review Agents (parallel)   → structured summaries
  └── Synthesize → Gap → Idea → Score
```

<details>
<summary>Implementation</summary>

Define subagents in `.claude/agents/`. Each gets clean context + access to `scripts/` via `${CLAUDE_SKILL_DIR}`. Subagents can't nest.

| Scenario | Approach |
|----------|----------|
| Single niche | Sequential or parallel data collection |
| Comparing niches | One agent per niche, coordinator ranks |
| Quick app check | Standalone scripts |

</details>

## Design

Tested across 6 niches (Quit Vaping, Anxiety Relief, Fasting, White Noise, Digital Detox, Pet Training):

- **3+ search variations** — single keywords miss 30-50% of competitors
- **Direct vs. Adjacent** — adjacent giants inflate market size 5-20x
- **Recent sentiment check** — most valuable signal; every niche had declining leaders
- **Bundled scripts** — deterministic API work, not reinvented per run

## Limitations

- Revenue/downloads are **Sensor Tower estimates** (ML models, coarse buckets)
- Reviews cover the **most recent 50** — days for popular apps, months for small ones
- **US App Store** default; pass country code for other markets
- **iOS only**; Google Play needs different sources

## License

MIT
