# Sandbox boundary review

- `DemoProvider` holds state only in React memory, under the homepage. It creates no UUID, real animal ID, organisation membership, auth session or persistent object.
- `Chain` has no form action or transport. Until hydration, the form's fieldset is disabled, including its submit button. With JavaScript, submit prevents native navigation. Whitespace-only observations fail native field validation. Draft changes become shared report text only on Send.
- `WorkflowPreview` imports production `PageBrief`, condition/triage/status vocabulary and display icons. It imports no Supabase client, mutation helper, server action, WhatsApp transport or analytics event. Acceptance, assignment and undo change memory only. Care is explained, never invented or recorded.
- `AudienceTask` reads the same example state. Municipal and partner views use separately labelled actual server-derived city aggregates. No sample is inserted into the map, counted as evidence or attached to a real animal.
- Hero reads use the existing cached, bounded `getAnimalRegister` (sensitivity/needs-help/injury exclusions) in parallel with existing story and city reads. Only one chosen record is rendered; no whole-register fetch or new read API is introduced.
- Real animal pages and map city/area links are ordinary read-only navigation. Exact animal locations, reporter contacts and private workspaces are not passed into the sandbox.
- Reload discards the demonstration. Replay clears acceptance and assignment; history remains unlinked, care absent, follow-up unscheduled. No storage key is created for the example.

Automated coverage intercepts every non-GET/HEAD/OPTIONS request while playing all demo actions, checks that the write list stays empty, checks shared identity and reset/reload, verifies pending state and explicitly qualified example acceptance, and checks no-JS disabled submission.
