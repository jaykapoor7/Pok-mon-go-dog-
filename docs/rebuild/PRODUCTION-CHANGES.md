# Production database changes for the rebuild

**Applied to production (`toujthlzjmhmoyykmayx`) on 15 Nov 2026 by the owner**, as one transaction in the SQL Editor,
after the owner approved it. Every file was first applied and tested on staging (`ucxfxiddufwqithtdtix`).

All five are additive. They create new tables and functions, and `nx_my_workspaces` gains one more kind of row. None of
them drops, renames or rewrites an existing table, and none changes or deletes an existing row.

| Order | File | What it adds | Staging | Production |
| --- | --- | --- | --- | --- |
| 1 | `supabase/migrations/20261113120000_automations.sql` | `automations`, `automation_runs`, `automation_notices`; save, pause, run and due functions. Nothing is switched on. | Applied (run by the owner in the SQL Editor) | Applied |
| 2 | `supabase/migrations/20261115100000_rebuild_foundations.sql` | `nx_channels`, `nx_channel_members`, `nx_messages`, `nx_tasks`, `nx_notifications`, `nx_missions`, `nx_mission_steps`; `nx_is_member`, `nx_my_workspaces`, `nx_can_read_channel`; realtime on messages | Applied | Applied |
| 3 | `supabase/migrations/20261115110000_rebuild_kaju_in_channel.sql` | `nx_kaju_reply`: Kaju's fixed-rule reply in a channel (no model) | Applied | Applied |
| 4 | `supabase/migrations/20261115120000_rebuild_kaju_missions.sql` | `nx_tasks.mission_id`, one-follow-up-per-case guard, `nx_mission_followups`, `nx_mission_approve`, `nx_mission_cancel` | Applied | Applied |
| 5 | `supabase/migrations/20261115130000_rebuild_people_studies_vet.sql` | Direct messages (`nx_org_people`, `nx_open_dm`, `nx_my_dms`), unread (`nx_mark_read`, `nx_unread`), studies (`nx_studies`, `nx_study_notes`, `nx_study_outputs`, `nx_study_snapshot`), appointments (`nx_appointments`), and the veterinarian's Healthcare row in `nx_my_workspaces` | Applied | Applied |

## What was checked on staging

- An organisation's members see only their own organisation's rows, and the database refuses everyone else. Covered: channels, messages, tasks, missions, studies, appointments and direct messages.
- A direct message is readable only by its two members. A third member of the same organisation cannot read it or post in it.
- An outsider cannot open a direct message, mark a channel read, book an appointment or list an organisation's people.
- A study snapshot is taken by the database as the signed-in person, from the programme's suppressed extract. It cannot contain more than that person is allowed to see.
- Mission approval is idempotent, only the person who started a mission can approve it, and a case with an open follow-up is never given a second one.
- Automations: a coordinator turned on a rule, ran it, paused it and removed it. One run found nothing and told nobody; another found 1 record and told the 3 leads and coordinators inside StrayPaw. Removing the rule removed its runs and notices.
- An NGO veterinarian gets both the NGO workspace and the Healthcare (Veterinary) workspace for the same organisation, and can book an appointment only for that organisation's animals.

## Checked on production after it was applied (read-only)

- All 14 new tables exist. Each has row-level security on and its policies in place, and the anonymous role cannot read any of them.
- All 19 new functions exist as security-definer functions, and the anonymous role cannot execute any of them.
- `nx_messages` is in the realtime publication, and the new tables are empty.
- Supabase's security advisor reports nothing new beyond its project-wide note that signed-in users can call
  security-definer functions. Each of these functions checks the caller's organisation membership itself.
- `www.straypaw.org/next/ngo/today` returns 200.

## Rollback

Every change is additive, so rolling back means dropping the new objects. Existing data is not touched either way. The
rebuild's pages already fall back to sample data, or to a plain "not set up yet" message, when the tables are missing.

---

# Second set: collaboration, Kaju engine, research access, saved views, automations, clinics and joining, bite referral link

**Staging: files 6 to 9 applied (2026-11-15); files 10 to 12 waiting** (`docs/rebuild/sql/STAGING_rebuild_stage3.sql`, one
transaction). **Production: waiting**, for the owner's approval after staging (`docs/rebuild/sql/PRODUCTION_rebuild_stage2.sql`,
all seven). Every file runs and re-runs cleanly on a local Postgres with the earlier migrations, and 119 behaviour and
permission checks pass (`npm run test:db`, in CI).

| Order | File | What it adds | Staging | Production |
| --- | --- | --- | --- | --- |
| 6 | `20261116100000_rebuild_collaboration.sql` | Mentions (notified only if they can read the channel), reactions, files in a private bucket (`nx-files`) readable only through the channel, edit and delete with kept history, message search under the caller's own access, one record-discussion channel per organisation, programme channels across organisations (access ends when an organisation leaves), announcement posting rules, notification settings, push subscriptions, delivery records | Applied, checked | Waiting |
| 7 | `20261116110000_rebuild_kaju_engine.sql` | Tool registry with levels, organisation rules (stricter only), personal limits, mission steps with retries and backoff, idempotent effects, approvals, person-only steps, trace, outbox for outside messages, organisation memory with approval; a once-a-minute database schedule (`nx-mission-tick`) that runs due steps | Applied, checked | Waiting |
| 8 | `20261116120000_rebuild_research_access.sql` | Data requests to programmes, steward decisions, versioned suppressed extracts, revocation | Applied, checked | Waiting |
| 9 | `20261116130000_rebuild_saved_views.sql` | Saved views and pins, private to each person | Applied, checked | Waiting |
| 10 | `20261116140000_rebuild_automations_v2.sql` | Automations for every workspace; consented PEP reminders queued in the clinical schema (not readable through the API); an hourly database schedule (`nx-automations-tick`) | Waiting | Waiting |
| 11 | `20261116150000_rebuild_vet_clinics_and_joining.sql` | `veterinary` organisation kind, clinic patients and veterinarian-signed records, the minimal status a partner NGO sees, finding an organisation and asking to join | Waiting | Waiting |
| 12 | `20261116160000_rebuild_bite_referral_link.sql` | A bite recorded at the facility a person was referred to keeps that referral, once per referral, and marks it arrived | Waiting | Waiting |

What changes in existing objects (all widening or equal-or-stricter; no data touched):
- Check constraints widened: `nx_channels.kind`, `nx_messages.record_kind`, `nx_tasks.record_kind`, `nx_notifications.kind`, `nx_mission_steps.state`, `oh_organisations.kind` (adds `veterinary`).
- Policies replaced: `nx_channels_read`, `nx_channels_add`, `nx_members_join`, `nx_messages_post` (programme and announcement rules added); `nx_appointments_add`, `nx_appointments_change` (clinic patients added).
- Functions replaced: `nx_can_read_channel` (programme channels), `nx_mission_cancel` (also cancels queued outside messages), `nx_my_workspaces` (veterinary clinics), `oh_record_exposure` (one more optional argument, `p_transfer`; every existing call behaves as before).
- Columns added: `nx_channels.programme_id`, `nx_messages.mentions`, `nx_messages.files`, several on `nx_missions` and `nx_mission_steps`, `nx_appointments.vet_patient_id`, `health.exposures.transfer_id` (with a partial unique index).
- Two database schedules (pg_cron): `nx-mission-tick` every minute and `nx-automations-tick` hourly. They run only steps and rules people started or turned on.

Rollback: drop the new tables, functions and the two schedules (`select cron.unschedule('nx-mission-tick'); select cron.unschedule('nx-automations-tick');`), and restore the replaced functions and policies from migrations 2 to 5 (and `oh_record_exposure` from `20261110230655_one_health_v2_2_workflows.sql`, then drop `health.exposures.transfer_id`). No existing row is changed by these files, so nothing needs restoring.
