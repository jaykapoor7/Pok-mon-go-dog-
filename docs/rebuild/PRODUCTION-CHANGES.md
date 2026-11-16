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

**Applied on staging and on production on 2026-11-15**, with the owner's approval of each change in the session. Every file
runs and re-runs cleanly on a local Postgres with the earlier migrations, and 119 behaviour and permission checks pass
(`npm run test:db`, in CI). Checked on staging with its sample organisations (rolled back): a Kaju mission found 27 cases,
waited for approval and made 27 tasks once; mentions and search never crossed organisations; an automation ran and told the
sample team. Checked on production read-only afterwards: every new table and function present, 11 Kaju tools registered,
the two schedules (`nx-automations-tick`, `nx-mission-tick`) running, the `nx-files` bucket private, the new policies in place.

| Order | File | What it adds | Staging | Production |
| --- | --- | --- | --- | --- |
| 6 | `20261116100000_rebuild_collaboration.sql` | Mentions (notified only if they can read the channel), reactions, files in a private bucket (`nx-files`) readable only through the channel, edit and delete with kept history, message search under the caller's own access, one record-discussion channel per organisation, programme channels across organisations (access ends when an organisation leaves), announcement posting rules, notification settings, push subscriptions, delivery records | Applied, checked | Applied, checked |
| 7 | `20261116110000_rebuild_kaju_engine.sql` | Tool registry with levels, organisation rules (stricter only), personal limits, mission steps with retries and backoff, idempotent effects, approvals, person-only steps, trace, outbox for outside messages, organisation memory with approval; a once-a-minute database schedule (`nx-mission-tick`) that runs due steps | Applied, checked | Applied, checked |
| 8 | `20261116120000_rebuild_research_access.sql` | Data requests to programmes, steward decisions, versioned suppressed extracts, revocation | Applied, checked | Applied, checked |
| 9 | `20261116130000_rebuild_saved_views.sql` | Saved views and pins, private to each person | Applied, checked | Applied, checked |
| 10 | `20261116140000_rebuild_automations_v2.sql` | Automations for every workspace; consented PEP reminders queued in the clinical schema (not readable through the API); an hourly database schedule (`nx-automations-tick`) | Applied, checked | Applied, checked |
| 11 | `20261116150000_rebuild_vet_clinics_and_joining.sql` | `veterinary` organisation kind, clinic patients and veterinarian-signed records, the minimal status a partner NGO sees, finding an organisation and asking to join | Applied, checked | Applied, checked |
| 12 | `20261116160000_rebuild_bite_referral_link.sql` | A bite recorded at the facility a person was referred to keeps that referral, once per referral, and marks it arrived | Applied, checked | Applied, checked |

What changes in existing objects (all widening or equal-or-stricter; no data touched):
- Check constraints widened: `nx_channels.kind`, `nx_messages.record_kind`, `nx_tasks.record_kind`, `nx_notifications.kind`, `nx_mission_steps.state`, `oh_organisations.kind` (adds `veterinary`).
- Policies replaced: `nx_channels_read`, `nx_channels_add`, `nx_members_join`, `nx_messages_post` (programme and announcement rules added); `nx_appointments_add`, `nx_appointments_change` (clinic patients added).
- Functions replaced: `nx_can_read_channel` (programme channels), `nx_mission_cancel` (also cancels queued outside messages), `nx_my_workspaces` (veterinary clinics), `oh_record_exposure` (one more optional argument, `p_transfer`; every existing call behaves as before).
- Columns added: `nx_channels.programme_id`, `nx_messages.mentions`, `nx_messages.files`, several on `nx_missions` and `nx_mission_steps`, `nx_appointments.vet_patient_id`, `health.exposures.transfer_id` (with a partial unique index).
- Two database schedules (pg_cron): `nx-mission-tick` every minute and `nx-automations-tick` hourly. They run only steps and rules people started or turned on.

Rollback: drop the new tables, functions and the two schedules (`select cron.unschedule('nx-mission-tick'); select cron.unschedule('nx-automations-tick');`), and restore the replaced functions and policies from migrations 2 to 5 (and `oh_record_exposure` from `20261110230655_one_health_v2_2_workflows.sql`, then drop `health.exposures.transfer_id`). No existing row is changed by these files, so nothing needs restoring.

---

# Third set: four automation rules that counted the wrong thing or too little

**Applied on staging, then on production, on 2026-11-15**, through the Supabase tool. Both applies succeeded.

| Order | File | What it changes | Staging | Production |
| --- | --- | --- | --- | --- |
| 13 | `20261116170000_rebuild_automation_rule_fixes.sql` | Replaces one function, `nx_automation_run`. No table, column, policy or row changes. | Applied | Applied |

What it fixes (found in `docs/rebuild/AUTOMATIONS-AUDIT.md`):
- `services_stale` counted every past confirmation, so a facility that confirmed daily was still told its services
  were stale. Now only each service's latest confirmation counts.
- `training_due` counted courses people had finished and told only leads. Now unfinished courses only, and each
  person is told about their own.
- `alerts_open` failed every time the hourly schedule ran it, because `oh_alerts` needs a signed-in programme member.
  A scheduled run now reads with the access of the person who turned the automation on. If that person has left the
  programme, the run fails and records why, as before.
- `referrals_waiting` counted only handoffs. It now also counts patients referred to the facility and not yet marked
  arrived. These are counts only; the notice names no patient.

Checked: `test:db` (139 checks). Five of the new checks fail without the migration and pass with it. On production today
no automation is turned on, so no organisation has had a wrong count.

Rollback: run the `nx_automation_run` definition from `20261116140000_rebuild_automations_v2.sql` again.

---

# Fourth set: automations follow up

**Applied on staging, checked there in a rolled-back run, then applied on production, on 2026-11-15**, through the Supabase
tool.

| Order | File | What it changes | Staging | Production |
| --- | --- | --- | --- | --- |
| 14 | `20261116180000_rebuild_automation_followup.sql` | Adds seven nullable columns to `nx_automation_runs` (`open_since`, `acknowledged_by`, `acknowledged_at`, `outcome`, `escalated_at`, `resolved_at`, `resolved_note`) and one partial index. Adds `nx_automation_ack`. Replaces `nx_automation_run` and `nx_automations_tick`. No existing row changes. | Applied, checked | Applied, checked |

Staging check (rolled back), as the sample NGO coordinator: a rule found one record and told 3 people; with the run
backdated past its 2 hours, the schedule escalated it once and told the 1 lead; the coordinator's acknowledgement was
kept; the next run found nothing and closed it ("Nothing left when it ran again").

Production check (read-only): all seven columns exist; members may run `nx_automation_ack` and anonymous visitors may
not; the hourly tick escalates. No automation has run on production yet.

`test:db`: 164 checks, including the follow-up lifecycle, escalation once and never when turned off, and a malformed
setting not stopping the schedule for everyone.

Rollback: run `nx_automation_run` from `20261116170000` and `nx_automations_tick` from `20261116140000`. The new
columns and `nx_automation_ack` can stay, unused.

---

# Fifth set: PEP reminders are checked again when they are sent

**Applied on staging, checked there in a rolled-back run, then applied on production, on 2026-11-16**, through the
Supabase tool.

| Order | File | What it changes | Staging | Production |
| --- | --- | --- | --- | --- |
| 15 | `20261117110000_rebuild_pep_reminder_validity.sql` | Replaces one function, `nx_pep_outbox_due` (delivery worker only; service role). Before returning what is due it cancels, with the reason, every queued reminder that no longer holds: the dose given or no longer due, its date passed or moved, the course stopped, consent withdrawn, or the number changed. No table, column, constraint or grant changes. | Applied, checked | Applied, checked |

Why: the morning automation queues a reminder and the delivery worker sends it later (once a day, at 04:45 UTC, and a
failed send waits for the next run). The worker sent whatever was queued, so a reminder could reach a patient after the
dose had been given, after the clinician stopped the course, after the patient withdrew consent, or at a number they had
since replaced.

Staging check (rolled back): a valid reminder was offered to the worker; one for a dose recorded as given, one whose date
the clinician moved and one for a patient who withdrew consent were cancelled with their reasons and not offered; a
signed-in user calling the function was refused.

Production before applying (read-only, 2026-11-16): `health.reminder_outbox` holds 0 rows, so no existing reminder changes.
Signed-in users cannot call the function.

Production after applying (read-only): the new definition is in place; the delivery worker's role may call it, signed-in
users and anonymous visitors may not; still 0 reminder rows.

`test:db`: 202 checks, including 20 on reminders: the retry wait (2, 4, … up to 60 minutes), giving up, never sending
twice, a missing SMS account not counted as an attempt, each of the six reasons a reminder stops holding, and staff seeing
the reason with the number still masked. Eight of them fail without this migration.

Rollback: run `nx_pep_outbox_due` from `20261116140000_rebuild_automations_v2.sql` again.
