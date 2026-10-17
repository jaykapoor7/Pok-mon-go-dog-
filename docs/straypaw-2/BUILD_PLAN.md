# StrayPaw 2.0 — build plan (from-scratch post–Open App rebuild)

Sources read in full: the nine documents of the StrayPaw 2.0 handoff ZIP and the
FigJam board export (`STRAYPAW_2.0` PDF, sections 01 Company & Vision, 02
Existing System, 03 Data & Algorithms, 04 Future Product, 05 Map & Design,
06 Business & Growth; decisions 001–048, batches 010–012 and the flow diagrams
for map selection, workspaces, CareOS, 029–032 and 037–048).

Founder instructions for this build (17 Oct 2026):

* Build a **new** post–Open App product. Nothing visual from the current app
  carries over; only data reads, server-confirmed writes, sign-in, permissions
  and spatial-precision rules are reused.
* New route structure; **every old URL redirects** to its new home.
* Replace in place on `claude/friendly-noether-u1c7u4`; `main` is the rollback.
* Landing `/`, its hero and the public marketing/legal pages are untouched.
* Art: no carried-over artwork. Commissioned-art slots are designed and shown
  honestly as placeholders until a named artist's work is licensed.

## Route structure

| Workspace | Destinations (decision 015) | Secondary (contextual) |
| --- | --- | --- |
| Community | `/community` Map · `/community/report` Report · `/community/activity` My Activity | `/community/stories`, `/community/organisations`, `/community/feeding`, `/community/help` |
| NGO | `/ngo` Work · `/ngo/animals` Animals · `/ngo/map` Map | `/ngo/inbox` triage, `/ngo/review`, `/ngo/field`, `/ngo/cases/[id]`, `/ngo/cases/new`, `/ngo/import`, `/ngo/programmes`, `/ngo/proof`, `/ngo/team`, `/ngo/settings` |
| Municipality | `/city` Map · `/city/programmes` Programmes · `/city/insights` Insights | `/city/report` (publication), `/city/programmes/[id]` |
| Education | `/learn` Learn · `/learn/workshops` Workshops · `/learn/resources` Resources | `/learn/[course]`, `/learn/[course]/[lesson]`, `/learn/playground` |
| Shared | `/animal/[id]` one animal, two depths · `/search` · `/trust` admin & trust | |

## Sign-off order (FigJam "Design coverage and sign-off order")

A shared navigation and states → B community map/report/profile → C NGO
Work/Animals/Map → D institutional map/proof → E education → F WhatsApp/mobile
→ G admin/verification → H usability/security review.

## Four reusable page patterns (FigJam "Shared page patterns")

Map canvas (layer / filter / inspect) · Work queue (sort / filter / act) ·
Record profile (identity / history) · Evidence review (compare / decide), in
one workspace frame. Public: immersive and legible. Professional: precise,
dense, honest.

## Truth rules carried into every screen

Receipt ≠ acceptance ≠ rescue. Delivered ≠ accepted ≠ done. Case closed ≠
follow-up done. Recorded ≠ clinician-signed ≠ independently reviewed.
Aggregate programme counts never become animal profiles. City-centroid
records stay city-level. Failed read ≠ zero. Pending ≠ saved. Historical
imports never enter today's Work. No emergency permission bypass.
