import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildReport, buildPackageReport } from '../src/lib/files/reports';

async function main() {
 const filters: unknown[][] = [];
 let membership: string | null = 'test-ngo';
 let packageVisible = false;
 let reads = 0;
 const builder = new Proxy({}, { get: (_, key) => {
  if (key === 'then') return (resolve: (r: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve);
  if (key === 'maybeSingle') return async () => ({ data: packageVisible ? { id: 'test-package', title: 'Isolated test', status: 'submitted', period_start: '2026-10-01', period_end: '2026-10-31' } : null, error: null });
  return (...args: unknown[]) => { filters.push([key, ...args]); return builder; };
 } });
 const db = { rpc: async (name: string) => { reads++; return { data: name === 'my_ngo' ? membership : [{ case_id: 'test-case', case_code: 'TEST-1', evidence: [], vet_name: null }], error: null }; }, from: (name: string) => { filters.push(['from', name]); return builder; } } as unknown as SupabaseClient;
 await buildReport('animals', db);
 assert.ok(filters.some(f => f[0] === 'eq' && f[1] === 'ngo_id' && f[2] === 'test-ngo'));
 console.log('PASS animal report explicitly filters by authenticated organisation');
 membership = null;
 await assert.rejects(buildReport('animals', db), /organisation workspace/);
 console.log('PASS report rejects missing membership');
 const before = reads;
 await assert.rejects(buildPackageReport('hidden-package', db), /not available/);
 assert.equal(reads, before);
 console.log('PASS inaccessible package never reads its case RPC');
 packageVisible = true;
 const report = await buildPackageReport('test-package', db);
 assert.equal(report.rows[0][0], 'TEST-1'); assert.ok(report.notes?.some(n => n.includes('test-package')));
 assert.ok(report.notes?.some(n => n.includes('no signed file links')));
 console.log('PASS package export uses scoped RPC results, provenance and no evidence access URLs');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
