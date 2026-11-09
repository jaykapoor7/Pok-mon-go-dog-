# State machines in StrayPaw

Several parts of the app move a record through fixed states. When those
moves are written as scattered string checks, screens disagree and Kaju or an
agent has to guess. The rule here: **the database is the authority on what
may happen; the client keeps one written copy of the moves, in
`src/lib/machines/`, and every screen, Kaju and the recording demo read that
copy.** `npm run test:state-machines` pins each table down.

## Explicit (src/lib/machines)

| Machine | States | Authority | Client table | Used by |
|---|---|---|---|---|
| Report package | draft → submitted ⇄ queried; submitted → returned → submitted; submitted → accepted; per-record review → partially_accepted | `abc_package_act`, `operations_finalize_package` | `machines/package.ts` (`PACKAGE_STATE`, `PACKAGE_ACTIONS`, `actionsFor`, `nextStatus`, `isWaitingOnOffice` / `isWithOperator` / `isDecided`) | Package view actions, review inbox, office command strip, Kaju package answers, recording demo |
| ABC case stage | evidence → vet → review → ready → packaged → accepted; review → returned → back | Flags on the case (`vet_authorised`, `evidence_reviewed`, `government_accepted`, package membership), derived by `stageOf()` in `lib/abc.ts` | `machines/abc-stage.ts` (`STAGE_ORDER`, `STAGE_NEXT`: who acts next and what they do) | Verification queue filters; available to Kaju and agents |

What this changes:

- **UX:** the counts on the review inbox, the office strip and in Kaju's answers come from one definition, so they cannot drift apart. A status the client does not know yet falls into no group rather than the wrong one.
- **DX:** adding a status or action is a one-file change, and the test fails until the table, the groupings and this page agree.
- **AX:** an agent can read `PACKAGE_ACTIONS` and `STAGE_NEXT` to answer "who holds this, and what can happen next" without parsing UI code. The recording demo now refuses moves the server would refuse instead of allowing any.

## Already explicit elsewhere (left as they are)

| Machine | Where | Why it stays |
|---|---|---|
| Guided demo | `src/sp/demo/state.ts` (`TourMode`: guided / roam / off, plus step) | Small, local, already typed. |
| Field save acknowledgement | `AckState` in `src/sp/ui/index.tsx` (draft / pending / saved / failed / offline) | Already a closed union with one renderer. |
| Field outbox | `src/lib/field/outbox` | Has its own tests (`e2e/field-outbox.spec.ts`). |

## Implicit, deliberately not refactored yet

| Machine | Where today | Why not now |
|---|---|---|
| Case status (`status_class`: open, in_progress, closed, other_ngo, no_action, not_attended) | Mapped in the database views; read in maps, findings and Kaju | It is a classification of imported and live records, not a workflow the client drives. A client table would duplicate the database mapping. |
| Follow-ups (upcoming / done / missed) | `lib/case-actions.ts`, case register | Driven by dates on the server; the client only displays it. |
| Import batches (staged → imported / rolled_back) | `/api/admin/imports/*`, trust console | Admin-only, server-side, already covered by the master-import tests. |
| Integrations (configured / connected / expired / revoked) | `src/lib/connections/` | Blocked capability; revisit when integrations are switched on. |

When one of these gains client-driven moves, give it a table in
`src/lib/machines/` and a case in `scripts/test-state-machines.ts`.
