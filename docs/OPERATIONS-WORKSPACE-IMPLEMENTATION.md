# Operational workspace reinvention

Development branch: `codex/living-atlas`. The approved Atlas commit `2ff8965`
was pushed to main and its production deployment verified READY. This later
workspace round is separate development work, not a production deployment.

## Structural changes

User correction: Community Home (`/app`) and Insights (`/insights`) must remain
independent default screens. Restored their original components; the improved
Atlas remains on `/map`. Added rendered regression assertions for both defaults,
real insight findings and period filters. Do not replace other pages with maps.

- Case desk: compact command heading, working-queue rail, dense ledger,
  expandable triage matrix and keyboard-dismissible six-field case inspector.
  Search, filters, exports, pagination and full-case actions remain available.
- Case file: documentary record navigation and a visible next-decision desk;
  mobile puts operational actions before long notes and history. Geographic
  links retain the record's city. Existing save/assignment/outcome logic remains.
- Intake: an explicit identity/incident protocol with desktop guidance rail and
  mobile section navigation. Existing identity, photo and validation rules remain.
- Identity register: separate filtering rail and table; programme legend explains
  missing status. Counts are profiles, not a verified unique-animal population.
- NGO Reports: organisation-scoped analytical brief, period filters and preserved
  export studio instead of another embedded map. Error states offer retry and
  working-record links; all data uses the existing authenticated reader.
- Map usability: visible zoom-in/out buttons and compact three-column mobile
  toolbar to avoid overlapping the expanded detail-sheet grip.
- First-visit role chooser: original automatic entry condition restored. Returning
  visitors retain their stored role; explicit space switching remains available.
- Municipality: supported care/case/evidence questions above the living Atlas.
  Question links change the Lens without remounting the map. Planning limitations
  explicitly distinguish H3 from wards and reporting from population coverage.
- Community: linked Atlas/identity/report journey, paper record surface beside
  ink geography and honest missing-care-status wording. City selection preserves
  the community route instead of unexpectedly opening the Atlas.
- Resources: document contents rail, ruled reference sections, six existing
  telephone actions and organisational directory. Saved animals use practical
  wayfinding rather than decorative constellation art.
- Shared secondary system: editorial headers, ruled workspace navigation,
  scoped import/export/review/settings/project surfaces and 44px controls.
  Removed the hidden decorative map fetch from shared document headers.

The landing page, homepage hero and primary navigation are unchanged. Database
architecture, migrations, RLS and operational mutation contracts are unchanged.

## Verification and limits

Verified during development:

- TypeScript check; spatial-engine regression; no-full-register-read guard;
  case-input validation regression; whitespace/diff checks.
- Public municipal question changes, retained map instance, community place
  selection and reference telephone actions at 1440px and 390px: passed without
  page errors or document overflow.
- Authorized read-only NGO case desk, quick inspector, Escape dismissal, full
  four-section case file, next-decision navigation and existing/new intake modes
  passed at 1440px and 390px in the earlier focused run.
- Eighteen authenticated secondary routes rendered at desktop/mobile with HTTP
  200 and no document overflow across the extended and focused sweeps. A prior
  mobile report read hit database statement timeouts; its later focused run
  passed the period/export checks. These are read-only layout checks, not proof
  of every action or authorization variant.
- Public following/resources/report/stories/learn/feeding/help/programmes/
  fundraisers rendered at desktop/mobile without page errors or overflow.

No operational record, treatment, review, import or report was submitted during
QA. Write-path and other-role authorization coverage is therefore not claimed.
Private NGO screenshots stay in `/tmp`, never in this repository or public gallery.

Some secondary routes received the shared visual system rather than a bespoke
workflow rebuild. Dynamic project/programme details, every permission variant,
320px/200% text zoom and comprehensive write-path QA still need verification.
This is substantial implemented work, not a claim that every product screen is
finished.

Final local production build passed. Compiled-app municipal/community interaction
checks passed at 1440px and 390px. Reference, saved-animal and municipality renders
passed at 320px, 390px and 1440px without overflow or page errors. Following the
user's routing correction, Community Home and Insights rendered independently at
390px/1440px; Insights retained seven real findings, and its 90-day/all-time controls
passed. No Atlas component mounted on either restored default page.

Latest build also passed with the restored first-visit chooser, scoped NGO brief
and zoom buttons. Public interaction assertions passed at 1440px/390px for role
choice, Community entry, Insights periods, municipal questions and the actual
India → city → cell → animal map journey. A mobile toolbar overlap exposed by
the zoom buttons was corrected and retested without forced clicks.

The aggregate NGO error assertion initially failed because the QA preference
initializer ran in an embedded document that denies localStorage. The initializer
is now guarded; real application errors remain failures. The focused rerun passed
at both widths, including case workflows, scoped map, Reports periods/exports,
resources and stories, with no page errors. Org-scoped
reads also intermittently return database statement timeouts; this remains a
reliability limitation, not a completed backend fix.

Main contains only restoration commits `ee9c6c2` and `435d98d`, both deployed
READY. This operational redesign remains a separate development commit. The
design skill and historical audit now explicitly forbid replacing standalone
pages with the Atlas. The React review guided reuse of the existing scoped reader
and removal of the hidden background-map fetch instead of adding new endpoints.
