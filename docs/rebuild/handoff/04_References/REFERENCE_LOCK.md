# VISUAL REFERENCES — EXACT ASSIGNMENTS

**This is a hard creative brief, not optional inspiration.** StrayPaw should closely match the selected interfaces' layout thinking, density, typography, motion precision and usability, while remaining an original, branded application (do not ship other companies' logos, fonts or proprietary art).

## A. ATTIO — PRIMARY APP DESIGN / HOME / RECORDS / ACTIVITY / INBOX
**Attio dominates the application's look and data experience** — not just its table component. Key patterns: left attribute column, header actions at the top-left, flexible record canvas, filterable relationship tables, notes, email, activity, tasks and files in one record. Compact/standard list density, intuitive table row behavior, almost zero decorative cards.
- 2026 record page redesign: https://attio.com/changelog/2026/record-page-redesign
- Oct 2026 redesigned record pages (tables in relationship tabs; tabs also in record drawer): https://attio.com/changelog/2026/redesigned-record-pages
- Authoritative record-page layout: https://attio.com/help/reference/managing-your-data/records/create-and-view-records
- New inbox, action-needed view and direct action without leaving records: https://attio.com/changelog/2026/your-new-inbox
- Attio changelog (current patterns): https://attio.com/changelog/2026
**Apply to:** default home/Today, organization records, NGO Animals/Cases, Government Partners/Verification, clinical patients/specimens, Research datasets, records with activity and related data. Use Attio's restraint AND richness. No giant blank areas or low-information KPI cards.

## B. LINEAR — INSIGHTS / ANALYTICS / POLISHED NAVIGATION & MOTION
**Linear is the main reference for analytic pages, information hierarchy, keyboard productivity and fast, invisible-feeling transitions.** Don't use generic marketing analytics cards: chart + breakdown table + interactive filters + drilldown to real records.
- Insights: https://linear.app/features/insights
- Features and layout/navigation: https://linear.app/features
- Changelog and design evolution: https://linear.app/changelog
**Apply to:** Government Coverage, Surveillance, Programmes, Research Analytics and NGO programme metrics. Show real denominators, valid time periods and evidence quality. For navigation borrow compact rail, context preservation, command bar, overlay previews and quiet transitions.

## C. RAYCAST — KAJU UI / PROMPTS / CONTEXTUAL INTERACTION
**Raycast controls Kaju's visual language.** Crisp command-input focus, useful empty states, keyboard shortcuts, context-rich AI results, compact utility and full-page/window-like AI workspace. Interaction must be low friction. A prompt can grow from a quick question to a durable mission.
- AI Chat reference: https://manual.raycast.com/ai/ai-chat
- Quick AI: https://manual.raycast.com/ai/quick-ai
- New in Raycast v2: https://manual.raycast.com/new-in-v2
- Product AI page: https://www.raycast.com/core-features/ai
**Apply to:** always-available compact Kaju, full Kaju workspace, suggested actions, tool outputs, context chips, keyboard command palette, inline prompt refinement. Preserve conversation/mission state when expanding/collapsing.

## D. SLACK — NATIVE CHANNEL COMMUNICATION
**Slack defines the mechanics and ease of collaboration**, but StrayPaw owns the communication experience. Channel directory, threads, DMs, mentions, channel-level tabs (Messages / Work / Records / Files), light team social conversations and organization/programme-scoped channels.
- Channel / DM tabs: https://slack.com/help/articles/32562841868307-Add-and-manage-tabs-in-channels-and-direct-messages
- Channel and DM canvases/tabs: https://slack.com/help/articles/203950418-Use-a-canvas-in-Slack
- Multitasking, separate threads: https://slack.com/help/articles/4403608802963-Open-separate-windows-in-Slack
**Apply to:** persistent channel navigation inside each of the four workspaces, messages, activity feeds, record-linked discussions and @Kaju tool interactions. Do NOT replace structured records with messages or auto-create a channel per animal/case.

## E. INNGEST — KAJU MISSION ACTIVITY / STATUS / EXECUTION TRACE
**Inngest defines the UX pattern for work actually being executed**: trigger, actions, success/error/awaiting approval, inspectable history, retries and safe recovery. Translate its engineering run interface into a human-readable mission timeline.
- Inspect events/runs: https://www.inngest.com/docs/platform-and-operations/inspect-events-and-runs
- Traces/step timeline: https://www.inngest.com/docs/platform-and-operations/traces
**Apply to:** Kaju full-screen Missions, approval work, background automation history, visible reasons/inputs/outcomes, run retries, failure recovery. Do not expose raw infrastructure logs to ordinary staff.

## F. IMPLEMENTATION LIBRARIES / MOTION INSPIRATION
These are suggestions; Claude should confirm compatibility with the existing codebase before adopting.
- Motion for React, layout/shared element transitions: https://motion.dev/docs/react-layout-animations
- Animate UI (animated Radix/Base UI/React Aria primitives): https://animate-ui.com/docs
- Animate UI primitive list: https://animate-ui.com/docs/primitives
- shadcn/ui components: https://ui.shadcn.com/
- TanStack Table: https://tanstack.com/table/latest
- MapLibre GL: https://maplibre.org/
**Apply to:** coherent micro-interactions, dialogs, tab indicators, list rearrangement, Kaju expand/collapse, skeletons, status/success transitions, responsive drawers and map/table synchronization.

## Reference look-up tasks for Claude
1. Open at least 3 actual Attio record/inbox pages and inspect composition at desktop and mobile. Capturing reference screenshots for private comparison is fine; **do not ship copied third-party assets**.
2. Open Linear Insights and inspect chart/filter/drilldown and data table behavior.
3. Open Raycast Chat/Quick AI and see how keyboard-first prompts present structured results.
4. Open Slack channel/DM tab documentation and the native app if access is available.
5. Open Inngest workflow runs and timeline details.
6. Produce a screenshot comparison sheet to validate the actual app screens against these patterns.

## Included visuals
`05_Visuals/` contains **original, synthetic StrayPaw screen interpretations**, not proprietary product screenshots. Use them as a quick composition target. The official live URLs above remain the source references for the exact design feeling.
