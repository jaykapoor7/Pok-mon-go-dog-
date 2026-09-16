type Batch = {
  id: string;
  status: string;
  rows_total: number | null;
  sheet_name: string | null;
  mapping: { master_import_v2?: boolean } | null;
};

export type ExistingStaging = { batchIds: string[]; rowsStaged: number; clearedIncomplete: boolean } | null;

async function rowCount(supa: any, batchId: string) {
  const { count, error } = await supa.from("import_rows").select("id", { count: "exact", head: true }).eq("batch_id", batchId);
  if (error) throw new Error(`Could not inspect staged rows: ${error.message}`);
  return count ?? 0;
}

async function domainRecordCount(supa: any, batchIds: string[]) {
  let total = 0;
  for (const table of ["dogs", "cases", "medical_events", "animal_followups"]) {
    const { count, error } = await supa.from(table).select("id", { count: "exact", head: true }).in("import_batch_id", batchIds);
    if (error) throw new Error(`Could not verify staged import safety in ${table}: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

/**
 * A failed stage can leave a subset of V2 batches/rows behind. It is safe to
 * remove only those incomplete staging batches after proving they have never
 * produced native domain records. A complete same-hash stage is returned for
 * idempotent reuse instead.
 */
export async function resolveExistingStaging(supa: any, ngoId: string, workbookHash: string, expectedSheets: Array<{ name: string; rows: number }>): Promise<ExistingStaging> {
  const { data, error } = await supa.from("import_batches").select("id,status,rows_total,sheet_name,mapping").eq("ngo_id", ngoId).eq("workbook_hash", workbookHash);
  if (error) throw new Error(`Could not inspect existing workbook staging: ${error.message}`);
  const batches = ((data ?? []) as Batch[]).filter((batch) => batch.mapping?.master_import_v2 && batch.status !== "rolled_back");
  if (!batches.length) return null;

  const expected = new Map(expectedSheets.map((sheet) => [sheet.name, sheet.rows]));
  const isSameWorkbookShape = batches.length === expected.size && batches.every((batch) => batch.sheet_name && expected.get(batch.sheet_name) === batch.rows_total);
  const rowsAreComplete = isSameWorkbookShape && (await Promise.all(batches.map(async (batch) => (await rowCount(supa, batch.id)) === batch.rows_total))).every(Boolean);
  const fullyCompleted = isSameWorkbookShape && rowsAreComplete && (batches.every((batch) => batch.status === "imported") || batches.every((batch) => ["staged", "reviewing"].includes(batch.status)));
  if (fullyCompleted) return { batchIds: batches.map((batch) => batch.id), rowsStaged: batches.reduce((total, batch) => total + (batch.rows_total ?? 0), 0), clearedIncomplete: false };

  const staged = batches.filter((batch) => ["staged", "reviewing"].includes(batch.status));
  if (!staged.length) throw new Error("A previous workbook import is incomplete and cannot be safely restaged automatically.");
  const stagedIds = staged.map((batch) => batch.id);
  if (await domainRecordCount(supa, stagedIds)) throw new Error("A previous workbook import has native records, so it cannot be rolled back automatically.");
  const { error: deleteError } = await supa.from("import_batches").delete().in("id", stagedIds);
  if (deleteError) throw new Error(`Could not remove incomplete staged batches: ${deleteError.message}`);
  return { batchIds: [], rowsStaged: 0, clearedIncomplete: true };
}
