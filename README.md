# StrayPaw

**Accountable animal welfare, from field record to programme review.**

[Website](https://straypaw.org) · [Product](https://straypaw.org/product) · [Contact](https://straypaw.org/contact)

StrayPaw builds software for the people who deliver, supervise and evaluate animal welfare programmes. Our first focus is animal birth control (ABC) and anti-rabies vaccination (ARV) in India: field teams document the work, veterinarians sign off clinical records, and municipal offices can review the evidence behind contractor submissions.

The longer-term goal is an interoperable record of animal care across organisations and programmes — spanning identification, rescue, treatment, vaccination, sterilisation, release and follow-up. We are building that infrastructure through one practical problem at a time, beginning with verifiable ABC and ARV operations.

## What StrayPaw does

A programme follows a common record from intake through review:

1. **Receive work.** Record reports, field observations and programme tasks.
2. **Identify the animal.** Capture a photo, location, source, history and distinguishing markers; import existing registers without treating historical entries as newly completed work.
3. **Document care.** Record examination, sterilisation and vaccination with the responsible veterinary sign-off and supporting evidence.
4. **Record release and follow-up.** Keep the outcome, date and locality connected to the same animal.
5. **Prepare and review submissions.** Assemble month-end evidence and contract-linked claims for animal-by-animal municipal review, queries and decisions.

An NGO or programme operator records work once rather than rebuilding the evidence from spreadsheets, messages and photographs. A reviewing office receives an inspectable submission rather than an unsupported total.

**Kaju**, StrayPaw's workflow assistant, helps users find records, identify missing evidence and prepare work for human review. Veterinary authorisation, municipal decisions and other consequential actions remain subject to explicit user permissions and confirmation.

## Product status

| Area | Status | Scope |
| --- | --- | --- |
| NGO operations | **Live** | Animal records, case work, register imports and reporting |
| Municipal review | **In staging** | Evidence packages, queries, case-level review and decisions |
| WhatsApp intake | **Not connected** | Integration work exists, but live Meta connectivity is not enabled |
| Wider programme coverage | **Planned** | Extensions beyond the initial ABC/ARV workflow |

These labels distinguish software that can be used today from work still being validated. A tested municipal review journey is **not** a claim that a municipal office has accepted a real contractor package. Availability can vary by workspace and deployment configuration.

## Evidence and data integrity

StrayPaw distinguishes records entered through active workflows from historical NGO register imports, research datasets and illustrative product demonstrations. An imported record is not automatically independently verified; a record count is not a count of completed sterilisations or vaccinations. Programme metrics need a named source, date range, provenance and appropriate review status.

This distinction is part of the product, not just a reporting convention. The goal is to let programme teams and public authorities see what happened, who recorded it, what evidence exists and what remains unresolved.

## Technology

- **Application:** Next.js 15, React 19, TypeScript and Tailwind CSS
- **Data:** Supabase/PostgreSQL, PostGIS and row-level security
- **Geospatial:** MapLibre GL and H3 spatial aggregation
- **Delivery:** Vercel
- **Testing:** TypeScript, script-level regression tests and Playwright

The application uses permission-scoped records and bounded geospatial reads; sensitive records and operational actions must stay behind the appropriate access checks.

See the [documentation index](docs/README.md), [architecture](docs/ARCHITECTURE.md), [database](docs/DATABASE.md), and [data imports](docs/IMPORTS.md) for the engineering detail.

## Development

Requires Node.js 22 and npm.

```bash
npm ci
cp .env.example .env.local
# Configure the environment values needed for the workspace under test
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run build
npm run test:spatial
npm run test:sql-rpc-mapping
npm run test:e2e
```

Some operations and tests need configured services, accounts or browser dependencies. Never add credentials or personal animal/reporter records to a commit.

## Repository guide

| Path | Purpose |
| --- | --- |
| `src/app/` | Routes and API endpoints |
| `src/components/`, `src/sp*/`, `src/kaju/` | Product UI and workflow surfaces |
| `src/lib/` | Shared services and data access |
| `supabase/` | Database migrations, policies and functions |
| `scripts/`, `e2e/` | Operational tooling and tests |
| `docs/` | Architecture, security notes and product documentation |

Read [contributing guidelines](CONTRIBUTING.md) and the [quality checklist](docs/QA-CHECKLIST.md) before proposing changes. Changes to production services, access policies, database data or deployment settings require explicit review.

---

**StrayPaw is developing durable infrastructure for animal welfare programmes: one accountable animal record, from field action to evidence-based decision.**
