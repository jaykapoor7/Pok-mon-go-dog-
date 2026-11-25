#!/usr/bin/env node
/**
 * Copy every Supabase Storage object (all buckets) to a local directory, or
 * put such a copy back into a project. The database backup does not contain
 * file bytes, only their rows in storage.objects, so photos and evidence need
 * this as well.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… \
 *     node scripts/ops/storage-backup.mjs backup <dir>
 *
 *   SUPABASE_URL=https://<new-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… \
 *   ALLOW_STORAGE_RESTORE=<new-ref> node scripts/ops/storage-backup.mjs restore <dir>
 *
 * `verify <dir>` downloads every object back from the target and compares sha256.
 *
 * Logs name buckets and counts, never object paths (file names can be personal
 * and CI logs of this repository are public).
 *
 * <dir>/manifest.json lists buckets (with their public flag and limits) and
 * every object with its size and sha256; restore re-checks each hash before
 * uploading. The directory is plaintext: the workflow tars and age-encrypts
 * it straight away (see .github/workflows/db-backup.yml).
 *
 * Restore never writes into production, and needs ALLOW_STORAGE_RESTORE set
 * to the target's project ref (or "local" for a local stack).
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const PRODUCTION_REF = "toujthlzjmhmoyykmayx";
const [mode, dir] = process.argv.slice(2);
const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!["backup", "restore", "verify"].includes(mode) || !dir || !base || !key) {
  console.error("usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… storage-backup.mjs backup|restore|verify <dir>");
  process.exit(2);
}

const headers = { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) };
const enc = (path) => path.split("/").map(encodeURIComponent).join("/");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function api(path, init = {}, attempt = 1) {
  const res = await fetch(`${base}/storage/v1${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (res.status >= 500 && attempt < 4) {
    await new Promise((r) => setTimeout(r, 1000 * attempt));
    return api(path, init, attempt + 1);
  }
  return res;
}

async function json(path, init) {
  const res = await api(path, init);
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path.split("/").slice(0, 3).join("/")}: HTTP ${res.status}`);
  return res.json();
}

async function listAll(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await json(`/object/list/${encodeURIComponent(bucket)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    for (const item of page) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null || !item.metadata) files.push(...(await listAll(bucket, path)));
      else files.push({ path, size: item.metadata.size ?? null, mimetype: item.metadata.mimetype ?? null, cacheControl: item.metadata.cacheControl ?? null });
    }
    if (page.length < 1000) return files;
  }
}

async function backup() {
  const buckets = await json("/bucket");
  const manifest = { created_utc: new Date().toISOString(), source: base, buckets: [], objects: [] };
  let bytes = 0;
  for (const b of buckets) {
    manifest.buckets.push({ id: b.id, name: b.name, public: b.public, file_size_limit: b.file_size_limit ?? null, allowed_mime_types: b.allowed_mime_types ?? null });
    for (const f of await listAll(b.id)) {
      const res = await api(`/object/${encodeURIComponent(b.id)}/${enc(f.path)}`);
      if (!res.ok) throw new Error(`download from bucket ${b.id} failed: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const out = join(dir, "objects", b.id, f.path);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, buf);
      manifest.objects.push({ bucket: b.id, ...f, size: buf.length, sha256: sha256(buf) });
      bytes += buf.length;
    }
  }
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Backed up ${manifest.objects.length} objects (${(bytes / 1048576).toFixed(1)} MB) from ${manifest.buckets.length} buckets.`);
}

async function restore() {
  const ref = new URL(base).hostname.split(".")[0];
  const local = ["127.0.0.1", "localhost"].includes(new URL(base).hostname);
  if (ref === PRODUCTION_REF) throw new Error("Refusing to restore into production. Restore into a new project.");
  if (process.env.ALLOW_STORAGE_RESTORE !== (local ? "local" : ref)) {
    throw new Error(`Set ALLOW_STORAGE_RESTORE=${local ? "local" : ref} to confirm the target.`);
  }
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  const existing = new Set((await json("/bucket")).map((b) => b.id));
  for (const b of manifest.buckets) {
    if (existing.has(b.id)) continue;
    await json("/bucket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  }
  let n = 0;
  for (const o of manifest.objects) {
    const buf = await readFile(join(dir, "objects", o.bucket, o.path));
    if (sha256(buf) !== o.sha256) throw new Error(`Checksum mismatch in bucket ${o.bucket} (object ${n + 1} of the manifest)`);
    const res = await api(`/object/${encodeURIComponent(o.bucket)}/${enc(o.path)}`, {
      method: "POST",
      headers: { "Content-Type": o.mimetype ?? "application/octet-stream", "x-upsert": "true", ...(o.cacheControl ? { "cache-control": o.cacheControl } : {}) },
      body: buf,
    });
    if (!res.ok) throw new Error(`upload to bucket ${o.bucket} failed: HTTP ${res.status}`);
    n++;
  }
  console.log(`Restored ${n} objects into ${manifest.buckets.length} buckets.`);
}

/* Download every object listed in the manifest from the target and compare
   its sha256: proves the bytes, not just the rows, are back. */
async function verify() {
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  let bad = 0;
  for (const o of manifest.objects) {
    const res = await api(`/object/${encodeURIComponent(o.bucket)}/${enc(o.path)}`);
    const ok = res.ok && sha256(Buffer.from(await res.arrayBuffer())) === o.sha256;
    if (!ok) { bad++; if (bad <= 5) console.error(`Not restored correctly: ${o.bucket}/<object ${manifest.objects.indexOf(o)}> (HTTP ${res.status})`); }
  }
  if (bad) throw new Error(`${bad} of ${manifest.objects.length} objects are missing or differ.`);
  console.log(`OK: all ${manifest.objects.length} objects downloaded from the target match their sha256.`);
}

try {
  if (!["backup", "restore", "verify"].includes(mode)) throw new Error("mode must be backup, restore or verify");
  await mkdir(dir, { recursive: true });
  await (mode === "backup" ? backup() : mode === "restore" ? restore() : verify());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
