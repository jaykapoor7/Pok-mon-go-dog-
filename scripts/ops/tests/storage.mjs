// Local test: node scripts/ops/tests/storage.mjs
// Mock Supabase Storage API to test scripts/ops/storage-backup.mjs: nested folders,
// >1000 objects (pagination), binary bytes, odd names, bucket recreation, checksum guard.
import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const pexec = promisify(execFile);
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function makeStore(seed) {
  const buckets = new Map(); const objects = new Map(); // "b/path" -> {buf, mimetype}
  if (seed) {
    buckets.set("sightings", { id: "sightings", name: "sightings", public: true, file_size_limit: 5242880, allowed_mime_types: ["image/jpeg"] });
    buckets.set("abc-evidence", { id: "abc-evidence", name: "abc-evidence", public: false, file_size_limit: null, allowed_mime_types: null });
    for (let i = 0; i < 1005; i++) objects.set(`sightings/2026-07-04/${String(i).padStart(4, "0")}.jpeg`, { buf: Buffer.from([0xff, 0xd8, i % 256, 0, 10, 13]), mimetype: "image/jpeg" });
    objects.set("sightings/top level ü.jpeg", { buf: Buffer.from("x"), mimetype: "image/jpeg" });
    objects.set("abc-evidence/org/a/b/deep #1.pdf", { buf: Buffer.from("%PDF-1.4 evidence"), mimetype: "application/pdf" });
  }
  return { buckets, objects };
}
function serve(store, port) {
  return new Promise((ok) => {
    const srv = http.createServer(async (req, res) => {
      const body = await new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
      if (req.headers.apikey !== "svc") { res.writeHead(401); return res.end("no key"); }
      const u = new URL(req.url, "http://x").pathname.split("/").map(decodeURIComponent).join("/").replace(/^\/storage\/v1/, "");
      const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (u === "/bucket" && req.method === "GET") return send(200, [...store.buckets.values()]);
      if (u === "/bucket" && req.method === "POST") { const b = JSON.parse(body); store.buckets.set(b.id, b); return send(200, { name: b.id }); }
      let m;
      if ((m = u.match(/^\/object\/list\/([^/]+)$/))) {
        const { prefix, limit, offset } = JSON.parse(body); const b = m[1];
        const pre = prefix ? `${b}/${prefix}/` : `${b}/`; const seen = new Map();
        for (const [k, v] of [...store.objects].sort()) {
          if (!k.startsWith(pre)) continue; const rest = k.slice(pre.length); const [first, ...more] = rest.split("/");
          if (more.length) seen.set(first, { name: first, id: null, metadata: null });
          else seen.set(first, { name: first, id: "x", metadata: { size: v.buf.length, mimetype: v.mimetype } });
        }
        return send(200, [...seen.values()].slice(offset, offset + limit));
      }
      if ((m = u.match(/^\/object\/([^/]+)\/(.+)$/))) {
        const k = `${m[1]}/${m[2]}`;
        if (req.method === "GET") { const o = store.objects.get(k); if (!o) return send(404, {}); res.writeHead(200); return res.end(o.buf); }
        if (req.method === "POST") { if (!store.buckets.has(m[1])) return send(404, { error: "bucket" }); store.objects.set(k, { buf: body, mimetype: req.headers["content-type"] }); return send(200, {}); }
      }
      send(404, { u });
    });
    srv.listen(port, "127.0.0.1", () => ok(srv));
  });
}
const script = new URL("../storage-backup.mjs", import.meta.url).pathname;
const run = async (mode, dir, port, extra = {}) => (await pexec("node", [script, mode, dir], { env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${port}`, SUPABASE_SERVICE_ROLE_KEY: "svc", ...extra } })).stdout;
let fails = 0; const check = (c, msg) => { console.log(`${c ? "PASS" : "FAIL"}: ${msg}`); if (!c) fails++; };

const src = makeStore(true), dst = makeStore(false);
const s1 = await serve(src, 54501), s2 = await serve(dst, 54502);
const dir = mkdtempSync(join(tmpdir(), "sb-"));
console.log((await run("backup", dir, 54501)).trim());
const man = JSON.parse(readFileSync(join(dir, "manifest.json")));
check(man.objects.length === 1007, `all 1007 objects listed across pagination and folders (got ${man.objects.length})`);
check(man.buckets.find((b) => b.id === "sightings").public === true, "bucket public flag recorded");
let threw = false; try { await run("restore", dir, 54502); } catch { threw = true; }
check(threw, "restore refused without ALLOW_STORAGE_RESTORE");
console.log((await run("restore", dir, 54502, { ALLOW_STORAGE_RESTORE: "local" })).trim());
check(dst.objects.size === 1007 && dst.buckets.size === 2, "restore recreated buckets and objects");
check([...src.objects].every(([k, v]) => dst.objects.get(k)?.buf.equals(v.buf)), "every object byte-identical after restore");
writeFileSync(join(dir, "objects/abc-evidence/org/a/b/deep #1.pdf"), "tampered");
threw = false; try { await run("restore", dir, 54502, { ALLOW_STORAGE_RESTORE: "local" }); } catch (e) { threw = /Checksum mismatch/.test(e.stderr); }
check(threw, "tampered object refused by checksum");
threw = false; try { await pexec("node", [script, "restore", dir], { env: { ...process.env, SUPABASE_URL: "https://toujthlzjmhmoyykmayx.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "x", ALLOW_STORAGE_RESTORE: "toujthlzjmhmoyykmayx" } }); } catch (e) { threw = /production/.test(e.stderr); }
check(threw, "production target refused even with confirmation");
s1.close(); s2.close();
console.log(fails ? `${fails} failed` : "all passed"); process.exit(fails ? 1 : 0);
