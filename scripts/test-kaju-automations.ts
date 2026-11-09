/** Kaju automations: pure measures and tool contracts against test doubles.
 * Run from test-kaju-polish.ts (the CI entry point) or on its own. */
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { activityShifts, digestLines, overdueGroups, rescheduleDate, wardCoverage, weekIndex, weeklySeries } from '../src/sp3/ai/automations';
import { runTool, type ToolCtx } from '../src/sp3/ai/tools';
import { withTools } from '../src/sp3/ai/engine';

const DAY = 86_400_000;

/** A record store double: every table read resolves to `table(name)`, every RPC to `rpc(name)`. */
function store(table: (name: string) => unknown, rpc: (name: string) => unknown = () => ({ data: null, error: { message: 'no rpc' } })) {
  return {
    from: (name: string) => { const q: unknown = new Proxy({}, { get: (_, k) => k === 'then' ? (res: (r: unknown) => unknown) => Promise.resolve(table(name)).then(res) : k === 'maybeSingle' ? async () => table(name) : () => q }); return q; },
    rpc: async (name: string) => rpc(name),
  } as unknown as SupabaseClient;
}

export async function automationChecks(ok: (s: string) => void) {
  const now = Date.parse('2026-11-09T06:00:00Z');

  assert.equal(weekIndex(new Date(now - 1 * DAY).toISOString(), now, 8), 7);
  assert.equal(weekIndex(new Date(now - 60 * DAY).toISOString(), now, 8), -1);
  assert.equal(weekIndex(new Date(now + DAY).toISOString(), now, 8), -1);
  ok('weekly windows place dates exactly and ignore future or old rows');

  const shifts = activityShifts([
    { key: 'Steady', weeks: [4, 5, 4, 5, 4, 5, 4, 5] },
    { key: 'Fell', weeks: [5, 6, 5, 6, 5, 6, 1, 0] },
    { key: 'Quiet', weeks: [1, 0, 1, 0, 0, 1, 0, 0] },
    { key: 'Jumped', weeks: [1, 1, 2, 1, 1, 1, 7, 9] },
  ]);
  assert.deepEqual(shifts.map((s) => [s.key, s.kind]).sort(), [['Fell', 'drop'], ['Jumped', 'spike']]);
  ok('a drop or spike is flagged only against enough earlier activity; a quiet ward is never a "drop"');

  const series = weeklySeries([{ z: 'A', d: new Date(now - DAY).toISOString() }, { z: 'A', d: new Date(now - 8 * DAY).toISOString() }, { z: null, d: new Date(now).toISOString() }], (r) => r.z, (r) => r.d, now, 8);
  assert.deepEqual(series, [{ key: 'A', weeks: [0, 0, 0, 0, 0, 0, 1, 1] }]);
  ok('rows without a ward are not invented into one');

  const cov = wardCoverage([
    { zone: 'X', sterilisation_status: 'sterilised', vaccination_status: 'vaccinated' },
    { zone: 'X', sterilisation_status: null, vaccination_status: 'unknown' },
    { zone: 'X', sterilisation_status: 'not_sterilised', vaccination_status: 'not_vaccinated' },
    { zone: null, sterilisation_status: 'sterilised', vaccination_status: 'vaccinated' },
  ]);
  assert.deepEqual(cov, [{ zone: 'X', recorded: 3, sterilised: 1, vaccinated: 1, sterilisationUnknown: 1, vaccinationUnknown: 1 }]);
  ok('ward coverage counts unknown status separately and never as "no"');

  const groups = overdueGroups([
    { id: '1', case_id: 'c1', dog_id: null, due_at: new Date(now - 3 * DAY).toISOString(), kind: 'recheck', holder: 'Ravi', label: 'A' },
    { id: '2', case_id: 'c2', dog_id: null, due_at: new Date(now - 9 * DAY).toISOString(), kind: 'recheck', holder: 'Ravi', label: 'B' },
    { id: '3', case_id: 'c3', dog_id: null, due_at: new Date(now + DAY).toISOString(), kind: 'recheck', holder: 'Ravi', label: 'C' },
    { id: '4', case_id: 'c4', dog_id: null, due_at: new Date(now - DAY).toISOString(), kind: null, holder: null, label: 'D' },
  ], now);
  assert.deepEqual(groups.map((g) => [g.holder, g.items.map((i) => i.id)]), [['Ravi', ['2', '1']], ['Not assigned', ['4']]]);
  assert.equal(rescheduleDate(now), '2026-11-11');
  ok('overdue follow-ups group by holder, most overdue first; future ones are left alone');

  const unknown = digestLines({ opened: null, closed: 2, care: null, signoffs: null, packages: null, waiting: null, overdue: null });
  assert.ok(unknown.changed.some((l) => /opened/.test(l) && /unknown/.test(l)));
  assert.ok(!unknown.changed.concat(unknown.needs).some((l) => /\b0\b/.test(l)));
  const zero = digestLines({ opened: 0, closed: 0, care: {}, signoffs: { vet: 0, reviewed: 0 }, packages: { submitted: 0, decided: 0 }, waiting: { vet: 0, review: 0, evidence: 0 }, overdue: 0 });
  assert.deepEqual(zero.needs, []);
  ok('the digest says unknown for unreadable sources and nothing is invented for a quiet week');

  const failed: ToolCtx = { db: store(() => ({ data: null, count: null, error: { message: 'down' } }), () => ({ data: null, error: { message: 'down' } })), orgId: 'org', userId: 'u', userName: 'T', actorRole: 'coordinator' };
  for (const name of ['weekly_digest', 'overdue_followups', 'claim_draft', 'office_brief', 'ward_activity']) {
    const r = await runTool(name, {}, failed);
    assert.equal(r.ok, false, name); assert.deepEqual(r.citations, []);
  }
  ok('every automation reports a failed read as a failure, never as empty data');

  const guest = await runTool('weekly_digest', {}, { ...failed, orgId: null });
  assert.equal(guest.ok, false);
  const noOffice = await runTool('office_brief', {}, { ...failed, orgId: null, actorRole: null, db: store(() => ({ data: [], error: null }), () => ({ data: { offices: [] }, error: null })) });
  assert.equal(noOffice.ok, false);
  ok('NGO automations need an organisation; the office brief needs a reviewing office');

  const due = new Date(Date.now() - 4 * DAY).toISOString();
  const rows = Array.from({ length: 9 }, (_, i) => ({ id: `f${i}`, case_id: `case-${i}`, dog_id: `dog-${i}`, due_at: due, kind: 'recheck', dogs: { name: `Dog ${i}`, straypaw_id: null, code: null } }));
  const fu = await runTool('overdue_followups', {}, { ...failed, db: store((t) => t === 'animal_followups' ? { data: rows, error: null } : { data: rows.map((r) => ({ id: r.case_id, case_code: null, assignee_name: 'Ravi Kumar' })), error: null }) });
  assert.equal(fu.ok, undefined); assert.equal(fu.proposals?.length, 6);
  for (const p of fu.proposals ?? []) { assert.equal(p.kind, 'schedule_followup'); if (p.kind === 'schedule_followup') assert.ok(Date.parse(p.dueAt) > Date.now()); }
  ok('overdue follow-ups come back as at most six reschedules to confirm, never as saved changes');

  const empty = store(() => ({ data: [], count: 0, error: null }), (n) => n === 'abc_verification_queue' ? { data: [], error: null } : { data: null, error: null });
  const digest = await withTools('What changed this week?', { ...failed, db: empty });
  assert.match(digest.text, /Last 7 days/); assert.match(digest.text, /0 opened · 0 closed/); assert.match(digest.text, /Nobody is waiting/);
  const overdue = await withTools('Any overdue follow-ups?', { ...failed, db: empty });
  assert.match(overdue.text, /No follow-up is overdue/);
  const schedule = await withTools('Schedule a follow-up this week on SPC-1', { ...failed, db: empty });
  assert.doesNotMatch(schedule.text, /Last 7 days/);
  ok('the router answers digest and follow-up questions, and leaves scheduling to its own route');

  const office = store(
    (t) => t === 'report_packages' ? { data: [{ id: 'p1', ngo_id: 'n1', title: 'ABC claims · October', status: 'submitted', submitted_at: new Date(Date.now() - 5 * DAY).toISOString(), decided_at: null, summary: null }], error: null } : t === 'ngos' ? { data: [{ id: 'n1', name: 'Care Trust' }], error: null } : { data: [], error: null },
    (n) => n === 'abc_my_context' ? { data: { offices: [{ id: 'o1', name: 'Cell', city: 'Bengaluru' }] }, error: null }
      : n === 'operations_reconciliation' ? { data: { items: [{ key: 'k1', case_id: 'c1', case_code: 'SPC-1', title: 't', procedure: 'sterilisation', animal_id: null, missing: ['release_photo'], unit_rate: '1000.00', claimed_units: 1, claimed_amount: '1000.00', decision: 'pending', signoffs_snapshot: [] }] }, error: null }
      : n === 'abc_package_cases' ? { data: [], error: null } : { data: null, error: null });
  const brief = await withTools('What is waiting for me today?', { db: office, orgId: null, userName: 'L', userId: 'u', actorRole: 'municipal_reviewer' });
  assert.match(brief.text, /1 package waits for a decision/); assert.match(brief.text, /Care Trust/); assert.match(brief.text, /waiting 5 days/); assert.match(brief.text, /exception/);
  assert.ok(brief.citations.some((c) => c.href === '/city/review/p1'));
  assert.doesNotMatch(brief.text, /accepted on your behalf|I accepted|I approved/i);
  ok('the office brief pre-checks waiting packages and links each one; it decides nothing');
}

if (process.argv[1]?.endsWith('test-kaju-automations.ts')) {
  let n = 0;
  automationChecks((s) => console.log(`PASS ${++n} ${s}`)).then(() => console.log(`${n} Kaju automation checks passed`)).catch((e) => { console.error(e); process.exitCode = 1; });
}
