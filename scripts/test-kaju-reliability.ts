/** Isolated engine tests. The model transport and record store are test doubles;
 * these prove control flow, not provider availability or deployed tenant RLS. */
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { answer, withTools } from '../src/sp3/ai/engine';
import { runTool, type ToolCtx } from '../src/sp3/ai/tools';

async function main() {
let checks = 0;
const ok = (label: string) => console.log(`ok ${++checks} - ${label}`);
const calls: string[] = [];
function db(result: Record<string, unknown>) {
  const builder = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve: (r: unknown) => void) => Promise.resolve(result).then(resolve) : () => builder });
  return { from: (name: string) => { calls.push(name); return builder; }, rpc: async (name: string) => { calls.push(name); return result; } } as unknown as SupabaseClient;
}
const fail: ToolCtx = { db: db({ data: null, count: null, error: { message: 'database unavailable' } }), orgId: 'isolated-test-org', userName: 'Test coordinator' };
for (const name of ['search_records', 'work_summary', 'find_missing_evidence', 'programme_report', 'abc_verification_status', 'abc_package_status']) {
  const r = await runTool(name, { query: 'Kaju' }, fail);
  assert.equal(r.ok, false); assert.deepEqual(r.citations, []); ok(`${name}: failed read never becomes successful empty data`);
}
for (const q of ['summary today', 'missing evidence', 'programme report', 'ABC verification queue', 'package status']) {
  const r = await withTools(q, fail);
  assert.ok(r.tools.some(t => !t.ok)); assert.doesNotMatch(r.text, /\*\*0|0 open|No published/); ok(`router reports unknown on failed read: ${q}`);
}
const knowledge = await runTool('search_knowledge', { query: 'unknown status' }, fail);
assert.ok(knowledge.citations.some(c => c.href.includes('unknown-is-not-zero'))); ok('knowledge cites published Academy lessons');
const emptyKnowledge = await runTool('search_knowledge', { query: 'zzzzzzzzzzz' }, fail);
assert.equal(emptyKnowledge.citations.length, 0); ok('unmatched knowledge query invents no citation');
const before = calls.length;
assert.equal((await runTool('abc_verification_status', {}, { ...fail, orgId: null })).ok, false);
assert.equal(calls.length, before); ok('ABC queue requires organisation before reading');
const rows = [{ case_id: 'test-case', case_code: 'TEST-1', missing: ['release_photo'], vet_authorised: false }];
const ctx: ToolCtx = { ...fail, db: db({ data: rows, error: null }) };
const queue = await runTool('abc_verification_status', {}, ctx);
assert.equal(queue.citations[0].href, '/ngo/verification/test-case'); assert.equal((queue.data as { limit: number }).limit, 100); ok('ABC queue uses bounded source results and exact record links');

const reportText = 'Injured dog limping near the bus stop';
const first = await answer([{ role: 'user', text: reportText }], ctx, {});
assert.match(first.text, /Tell me the city/);
const followup = await answer([{ role: 'user', text: reportText }, { role: 'assistant', text: first.text }, { role: 'user', text: 'Delhi' }], ctx, {});
assert.ok(followup.proposals.some(p => p.kind === 'open_case' && p.city === 'Delhi')); ok('city follow-up completes the prior field draft without writing');
const originalFetch = globalThis.fetch;
const originalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = 'isolated-test-key';
let responses = 0;
let fanout = 1;
globalThis.fetch = async () => {
  responses++;
  return new Response(JSON.stringify({ id: `msg_${responses}`, type: 'message', role: 'assistant', model: 'test', stop_reason: 'tool_use', stop_sequence: null,
    content: Array.from({ length: fanout }, (_, i) => ({ type: 'tool_use', id: `tool_${responses}_${i}`, name: 'extract_field_message', input: { text: 'Animal seen in Delhi' } })),
    usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { 'content-type': 'application/json' } });
};
try {
  const r = await answer([{ role: 'user', text: 'Investigate' }], ctx, {});
  assert.equal(responses, 6); assert.equal(r.tools.length, 6); assert.match(r.notice ?? '', /incomplete/i); assert.doesNotMatch(r.text, /^Done/); ok('step exhaustion reports incomplete and preserves tool evidence');
  responses = 0; fanout = 13;
  const capped = await answer([{ role: 'user', text: 'Investigate' }], ctx, {});
  assert.equal(responses, 1); assert.equal(capped.tools.length, 0); assert.match(capped.notice ?? '', /incomplete/i); ok('oversized tool fan-out is refused before execution');
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = originalKey;
}
console.log(`kaju reliability: ${checks} checks passed`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
