# StrayPaw documentation

This directory contains current engineering references alongside dated design, testing and migration history. **A dated report is evidence of work at that date, not a statement that the feature is live today.** For user-facing availability, use the status table in the [repository overview](../README.md) and check the current deployment.

## Start here

| Document | Purpose |
| --- | --- |
| [README](../README.md) | Product mission, workflows, status and local setup |
| [Design system](../DESIGN.md) | Current design decisions; newer sections supersede older notes |
| [Architecture](ARCHITECTURE.md) | Service boundaries, spatial data flow and performance |
| [Database](DATABASE.md) | Schema, permissions, spatial summaries and access controls |
| [Imports](IMPORTS.md) | Source provenance, register import and reconciliation |
| [Connections](CONNECTIONS.md) | Integration contracts and setup dependencies |
| [QA checklist](QA-CHECKLIST.md) | Release verification |
| [Release recovery](../REVERT.md) | Safe application and database incident response |
| [Contribution standards](../CONTRIBUTING.md) | Engineering and review expectations |
| [Security reporting](../SECURITY.md) | Private vulnerability disclosure |

## Programme data and evidence

- [Data provenance](sp4/DATA-PROVENANCE.md) documents source classifications and proposed historical-data cleanup as of its stated audit date.
- [CareOS integration](CAREOS-INTEGRATION.md) describes the integration design; a built integration is not proof of a live WhatsApp connection.
- [Operations workspace](OPERATIONS-WORKSPACE-IMPLEMENTATION.md) and [municipal release records](sp4/RELEASE-2026-11-01.md) preserve implementation and test history.

## Historical records

Design explorations, audits, screenshots, staging runs and release handoffs are retained for traceability. These include `sp3/`, `sp4/`, `quality-pass/`, `straypaw-2/` and the various render directories. Their titles and claims may no longer describe the current implementation.

Do not rely on an old handoff, a demo screen or an imported dataset for live product claims. Check the active code, release state, actual permissions and provenance before quoting outcomes.

When creating new documentation, prefer updating an existing authoritative reference over adding another top-level redesign note. Date observations, distinguish verified behavior from planned work, and avoid publishing secrets, personal case records, private partner correspondence or staged test credentials.
