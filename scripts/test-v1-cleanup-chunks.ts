import assert from "node:assert/strict";
import { CLEANUP_DELETE_CHUNK_SIZE, deleteIdChunks } from "../src/lib/master-import/cleanup";

const ids = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
const calls: Array<{ table: string; ids: string[] }> = [];

class Query {
  table: string;
  values: string[] = [];
  constructor(table: string) { this.table = table; }
  delete() { return this; }
  in(column: string, values: string[]) { assert.equal(column, "id"); this.values = values; calls.push({ table: this.table, ids: values }); return this; }
  select() { return Promise.resolve({ data: this.values.map((id) => ({ id })), error: null }); }
}

async function main() {
  const supa = { from: (table: string) => new Query(table) };
  const timelines = ids("timeline", 1_000);
  const cases = ids("case", 2_324);
  const dogs = ids("dog", 1_000);

  assert.equal(await deleteIdChunks(supa, "animal_timeline_events", timelines), timelines.length);
  assert.equal(await deleteIdChunks(supa, "cases", cases), cases.length);
  assert.equal(await deleteIdChunks(supa, "dogs", dogs), dogs.length);
  assert.equal(calls.filter((call) => call.table === "animal_timeline_events").length, Math.ceil(1_000 / CLEANUP_DELETE_CHUNK_SIZE));
  assert.equal(calls.filter((call) => call.table === "cases").length, Math.ceil(2_324 / CLEANUP_DELETE_CHUNK_SIZE));
  assert.equal(calls.filter((call) => call.table === "dogs").length, Math.ceil(1_000 / CLEANUP_DELETE_CHUNK_SIZE));
  assert.ok(calls.every((call) => call.ids.length > 0 && call.ids.length <= CLEANUP_DELETE_CHUNK_SIZE), "cleanup must never send an oversized ID filter");

  console.log(`V1 cleanup chunk regression passed: ${calls.length} bounded delete requests for 4,324 target IDs.`);
}

void main();
