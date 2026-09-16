export const CLEANUP_DELETE_CHUNK_SIZE = 150;

/**
 * Delete a pre-selected list in bounded PostgREST requests. Selection happens
 * before this helper is called; this function deliberately has no filters of
 * its own, so it cannot widen a cleanup target.
 */
export async function deleteIdChunks(supa: any, table: string, ids: string[], chunkSize = CLEANUP_DELETE_CHUNK_SIZE) {
  let deleted = 0;
  const chunks = Math.ceil(ids.length / chunkSize);
  for (let index = 0; index < ids.length; index += chunkSize) {
    const values = ids.slice(index, index + chunkSize);
    const chunk = Math.floor(index / chunkSize) + 1;
    const { data, error } = await supa.from(table).delete().in("id", values).select("id");
    if (error) throw new Error(`${table} cleanup chunk ${chunk}/${chunks} failed: ${error.message}`);
    deleted += data?.length ?? 0;
  }
  return deleted;
}

export async function updateBatchChunks(supa: any, batchIds: string[], values: Record<string, unknown>, chunkSize = CLEANUP_DELETE_CHUNK_SIZE) {
  let updated = 0;
  const chunks = Math.ceil(batchIds.length / chunkSize);
  for (let index = 0; index < batchIds.length; index += chunkSize) {
    const ids = batchIds.slice(index, index + chunkSize);
    const chunk = Math.floor(index / chunkSize) + 1;
    const { data, error } = await supa.from("import_batches").update(values).in("id", ids).select("id");
    if (error) throw new Error(`import_batches cleanup chunk ${chunk}/${chunks} failed: ${error.message}`);
    updated += data?.length ?? 0;
  }
  return updated;
}
