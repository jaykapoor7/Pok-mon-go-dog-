# Contributing to StrayPaw

StrayPaw is an actively developed product. Changes should improve a real user journey, preserve record integrity and be reviewable before reaching production.

## Before changing code

- Start from the current `main` branch and open a scoped pull request. Do not commit directly to production.
- Read `README.md`, `DESIGN.md` and the relevant architecture or database documentation.
- Identify whether the change affects NGO staff, veterinary sign-off, municipal review, community reporting or public research views.
- Treat migrations, row-level security, production data, real partner records and external integrations as high-risk changes requiring a separate review.

## Engineering expectations

- Preserve tenancy, permissions, audit history, data provenance, accessible interaction and mobile usability.
- Use explicit human confirmation for irreversible, clinical, financial or reviewer actions.
- Do not use real people's information, partner credentials or sensitive case media in fixtures or screenshots.
- Do not claim that a historical import, research dataset, illustrative demonstration or automated test is a verified live programme result.
- Update relevant documentation when behaviour, required environment variables or product availability change.
- Run `npm run typecheck`, `npm run build` and relevant regression tests. Explain checks not run instead of marking them passed.

## Pull requests and commits

Use a specific title describing the outcome: `fix: bound municipal package queries` is better than `updates`. A PR should explain the user problem, changed behaviour, verification, risk and rollback requirements.

Keep commit messages and PR descriptions professional and factual. Omit session links, transcript dumps, tool-generated filler and promotional claims. Preserve correct attribution for actual contributors; do not rewrite or misstate authorship.

The repository may contain historical design notes and engineering handoffs. Those are context, not a substitute for current source code and verified deployments. When documents conflict, call out the discrepancy and establish the current source of truth.

## Security reports

Please use the guidance in [SECURITY.md](SECURITY.md). Do not post credentials, private case details or security vulnerabilities in public issues.
