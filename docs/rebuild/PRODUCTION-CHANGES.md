# Production database changes waiting for the owner's approval

Nothing below has been applied to production (`toujthlzjmhmoyykmayx`). Each file has been applied and tested on staging
(`ucxfxiddufwqithtdtix`) only. Production stays unchanged until the owner approves these exact files, in this order.

All five are additive. They create new tables and functions, and `nx_my_workspaces` gains one more kind of row. None of
them drops, renames or rewrites an existing table, and none changes or deletes an existing row.

| Order | File | What it adds | Staging |
| --- | --- | --- | --- |
| 1 | `supabase/migrations/20261113120000_automations.sql` | `automations`, `automation_runs`, `automation_notices`; save, pause, run and due functions. Nothing is switched on. | Waiting: the file was sent for the staging SQL Editor |
| 2 | `supabase/migrations/20261115100000_rebuild_foundations.sql` | `nx_channels`, `nx_channel_members`, `nx_messages`, `nx_tasks`, `nx_notifications`, `nx_missions`, `nx_mission_steps`; `nx_is_member`, `nx_my_workspaces`, `nx_can_read_channel`; realtime on messages | Applied |
| 3 | `supabase/migrations/20261115110000_rebuild_kaju_in_channel.sql` | `nx_kaju_reply`: Kaju's fixed-rule reply in a channel (no model) | Applied |
| 4 | `supabase/migrations/20261115120000_rebuild_kaju_missions.sql` | `nx_tasks.mission_id`, one-follow-up-per-case guard, `nx_mission_followups`, `nx_mission_approve`, `nx_mission_cancel` | Applied |
| 5 | `supabase/migrations/20261115130000_rebuild_people_studies_vet.sql` | Direct messages (`nx_org_people`, `nx_open_dm`, `nx_my_dms`), unread (`nx_mark_read`, `nx_unread`), studies (`nx_studies`, `nx_study_notes`, `nx_study_outputs`, `nx_study_snapshot`), appointments (`nx_appointments`), and the veterinarian's Healthcare row in `nx_my_workspaces` | Applied |

## What was checked on staging

- An organisation's members see only their own organisation's rows, and the database refuses everyone else. Covered: channels, messages, tasks, missions, studies, appointments and direct messages.
- A direct message is readable only by its two members. A third member of the same organisation cannot read it or post in it.
- An outsider cannot open a direct message, mark a channel read, book an appointment or list an organisation's people.
- A study snapshot is taken by the database as the signed-in person, from the programme's suppressed extract. It cannot contain more than that person is allowed to see.
- Mission approval is idempotent, only the person who started a mission can approve it, and a case with an open follow-up is never given a second one.
- An NGO veterinarian gets both the NGO workspace and the Healthcare (Veterinary) workspace for the same organisation, and can book an appointment only for that organisation's animals.

## Rollback

Every change is additive, so rolling back means dropping the new objects. Existing data is not touched either way. The
rebuild's pages already fall back to sample data, or to a plain "not set up yet" message, when the tables are missing.
