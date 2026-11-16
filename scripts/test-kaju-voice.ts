import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { isLocalVoiceRequest, isVoiceRequest, issueVoiceSession, readVoiceSettings, settingsForVoiceAccess, voiceEnabled } from "../src/lib/kaju-voice/server";
import { PRODUCTION_SUPABASE_URL, STAGING_SUPABASE_URL, voiceMode } from "../src/lib/kaju-voice/deployment";
import { VoiceError, voiceAccess, type VoiceAccess } from "../src/lib/kaju-voice/access";
import { LocalVoiceUsage, usageForVoiceAccess } from "../src/lib/kaju-voice/usage";
import { createVoiceTransport } from "../src/kaju/voice/transport";
import type { VoiceTestConfig } from "../src/lib/kaju-voice/shared";
import { GET as signSession } from "../src/app/api/kaju/voice/orgs/[orgId]/workspaces/[workspaceId]/apps/[appId]/url/route";
import { GET as readPublicConfig } from "../src/app/api/kaju/voice/config/route";

const status = (code: number) => (e: unknown) => e instanceof VoiceError && e.status === code;
const localToken = "local-access-test-only-32-characters-long";
const env = { NODE_ENV: "development", SARVAM_VOICE_ENABLED: "true", SARVAM_VOICE_LOCAL_TOKEN: localToken };
const req = (headers: Record<string, string> = {}, host = "localhost:3300") => new Request(`http://${host}/api/kaju/voice/config`, { headers: { host, "X-StrayPaw-Voice-Test": "1", ...headers } });
const auth = { Authorization: `Bearer ${localToken}` };
const config: VoiceTestConfig = { org_id: "test-org", workspace_id: "test-workspace", app_id: "test-app", version: 3, languages: ["English", "Hindi", "Kannada"], user_identifier: "test-pseudonym" };
const sentinel = "unit-test-credential-never-sent";
const settingsEnv = { ...env, SARVAM_VOICE_API_KEY: sentinel, SARVAM_VOICE_ORG_ID: config.org_id, SARVAM_VOICE_WORKSPACE_ID: config.workspace_id, SARVAM_VOICE_APP_ID: config.app_id, SARVAM_VOICE_VERSION: "3" };

async function accessChecks() {
  for (const v of [{ NODE_ENV: "production", SARVAM_VOICE_ENABLED: "true" }, { ...env, VERCEL: "1" }, { NODE_ENV: "development" }]) assert.equal(voiceEnabled(v), false);
  assert.equal(voiceEnabled(env), true);
  assert.ok("missing" in readVoiceSettings({}));
  assert.ok("missing" in readVoiceSettings({ ...settingsEnv, SARVAM_VOICE_APP_ID: "../other" }));
  assert.ok("missing" in readVoiceSettings({ ...settingsEnv, SARVAM_VOICE_VERSION: "3.1" }));
  assert.equal(isLocalVoiceRequest(req()), true);
  for (const r of [req({}, "straypaw.org"), req({ origin: "https://evil.example" }), req({ "sec-fetch-site": "cross-site" }), req({ host: "evil.example" }), req({ "X-StrayPaw-Voice-Test": "" }), req({}, "localhost.evil.example")]) assert.equal(isLocalVoiceRequest(r), false);
  await assert.rejects(voiceAccess(req(), env), status(401));
  await assert.rejects(voiceAccess(req({ Authorization: "Bearer invalid" }), env), status(401));
  await assert.rejects(voiceAccess(req({ ...auth, "X-StrayPaw-Voice-Organisation": "org-a" }), env), status(403));
  const access = await voiceAccess(req(auth), env);
  assert.equal(access.actorId, "local-operator");
  await assert.rejects(voiceAccess(req(auth), { ...env, NODE_ENV: "production" }), status(401));
  const supaEnv = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon", SARVAM_VOICE_ALLOWED_USER_IDS: "user-a", SARVAM_VOICE_ALLOWED_ORG_IDS: "org-a" };
  let role = "admin";
  const fake: typeof fetch = async (input) => String(input).includes("/auth/v1/user")
    ? Response.json({ id: "user-a", user_metadata: { role: "owner", org_id: "org-forged" } })
    : Response.json([{ org_id: "org-a", role }]);
  assert.equal((await voiceAccess(req(auth), supaEnv, fake)).actorId, "user-a");
  await assert.rejects(voiceAccess(req(auth), { ...supaEnv, SARVAM_VOICE_ALLOWED_USER_IDS: "other" }, fake), status(403));
  const orgReq = req({ ...auth, "X-StrayPaw-Voice-Organisation": "org-a" });
  const orgAccess = await voiceAccess(orgReq, supaEnv, fake);
  assert.equal(orgAccess.scope.id, "org-a");
  role = "viewer"; await assert.rejects(voiceAccess(orgReq, supaEnv, fake), status(403));
  await assert.rejects(voiceAccess(req({ ...auth, "X-StrayPaw-Voice-Organisation": "org-forged" }), supaEnv, fake), status(403));
  assert.ok("missing" in settingsForVoiceAccess(orgAccess, settingsEnv));
  const assigned = settingsForVoiceAccess(orgAccess, { ...settingsEnv, SARVAM_VOICE_ORG_AGENTS: JSON.stringify({ "org-a": { app_id: "org-agent", version: 9 } }) });
  assert.ok("config" in assigned && assigned.config.app_id === "org-agent" && assigned.config.version === 9);
  return access;
}

async function productionChecks() {
  const on = { SARVAM_VOICE_ENABLED: "true", VERCEL: "1", NODE_ENV: "production" };
  const prod = { ...on, VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_SUPABASE_URL };
  const preview = { ...on, VERCEL_ENV: "preview", SARVAM_VOICE_PREVIEW_BRANCH: "feat/voice", VERCEL_GIT_COMMIT_REF: "feat/voice", NEXT_PUBLIC_SUPABASE_URL: STAGING_SUPABASE_URL, VERCEL_URL: "p-1.vercel.app", VERCEL_BRANCH_URL: "p-git.vercel.app" };
  assert.equal(voiceMode(prod), "production");
  assert.equal(voiceMode({ ...prod, NEXT_PUBLIC_SUPABASE_URL: `${PRODUCTION_SUPABASE_URL}/` }), "production");
  // Production never runs on staging data, a preview never on production data, and nothing runs unless enabled.
  for (const v of [{ ...prod, NEXT_PUBLIC_SUPABASE_URL: STAGING_SUPABASE_URL }, { ...prod, SARVAM_VOICE_ENABLED: "false" }, { ...prod, NEXT_PUBLIC_SUPABASE_URL: undefined },
    { ...preview, NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_SUPABASE_URL }, { ...preview, VERCEL_GIT_COMMIT_REF: "main" }, { ...preview, SARVAM_VOICE_PREVIEW_BRANCH: "" }, { ...on, VERCEL_ENV: "development" }]) assert.equal(voiceMode(v), null);
  assert.equal(voiceMode(preview), "preview");
  const hosted = (host: string, headers: Record<string, string> = {}) => new Request(`https://${host}/api/kaju/voice/config`, { headers: { host, "x-forwarded-proto": "https", "X-StrayPaw-Voice-Test": "1", ...headers } });
  for (const host of ["www.straypaw.org", "straypaw.org"]) {
    assert.equal(isVoiceRequest(hosted(host), prod), true);
    assert.equal(isVoiceRequest(hosted(host, { origin: `https://${host}`, "sec-fetch-site": "same-origin" }), prod), true);
  }
  for (const r of [hosted("pok-mon-go-dog.vercel.app"), hosted("p-1.vercel.app"), hosted("www.straypaw.org", { origin: "https://evil.example" }), hosted("www.straypaw.org", { origin: "https://straypaw.org" }),
    hosted("www.straypaw.org", { "sec-fetch-site": "cross-site" }), hosted("www.straypaw.org", { "X-StrayPaw-Voice-Test": "" }), hosted("www.straypaw.org", { "x-forwarded-proto": "http" }), hosted("localhost:3300")]) assert.equal(isVoiceRequest(r, prod), false);
  assert.equal(isVoiceRequest(hosted("p-1.vercel.app"), preview), true);
  assert.equal(isVoiceRequest(hosted("www.straypaw.org"), preview), false);
  assert.equal(isVoiceRequest(hosted("www.straypaw.org"), { ...prod, NEXT_PUBLIC_SUPABASE_URL: STAGING_SUPABASE_URL }), false);
  const live = { ...prod, NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon", SARVAM_VOICE_ALLOWED_USER_IDS: "tester-id", SARVAM_VOICE_LOCAL_TOKEN: localToken };
  const user = (id: string): typeof fetch => async (input) => String(input).includes("/auth/v1/user")
    ? Response.json({ id, email: "tester@example.invalid", email_confirmed_at: "2026-11-01T00:00:00Z", user_metadata: { role: "owner" } }) : Response.json([]);
  const signed = hosted("www.straypaw.org", { Authorization: "Bearer user-session" });
  const access = await voiceAccess(signed, live, user("tester-id"));
  assert.equal(access.actorId, "tester-id"); assert.equal(access.scope.kind, "standalone"); assert.ok(access.db, "production uses the caller-scoped database client");
  await assert.rejects(voiceAccess(signed, live, user("someone-else")), status(403));
  await assert.rejects(voiceAccess(hosted("www.straypaw.org", { Authorization: "Bearer user-session", "X-StrayPaw-Voice-Organisation": "org-a" }), live, user("tester-id")), status(403));
  // The local access code is never an identity on a hosted deployment.
  await assert.rejects(voiceAccess(hosted("www.straypaw.org", { Authorization: `Bearer ${localToken}` }), live, async () => Response.json({ message: "invalid" }, { status: 401 })), status(401));
  // Hosted usage is the shared database or nothing: never the instance filesystem.
  assert.throws(() => usageForVoiceAccess({ ...access, db: undefined }, live), status(503));
  assert.throws(() => usageForVoiceAccess({ ...access, db: undefined }, preview), status(503));
  assert.equal(typeof usageForVoiceAccess(access, live).reserve, "function");
  // The microphone Permissions-Policy follows the same guard at build time.
  const { default: nextConfig } = await import("../next.config.mjs");
  const previous = { ...process.env };
  try {
    for (const [v, expected] of [[prod, true], [{ ...prod, NEXT_PUBLIC_SUPABASE_URL: STAGING_SUPABASE_URL }, false], [preview, true], [{ ...preview, VERCEL_GIT_COMMIT_REF: "main" }, false], [{ NODE_ENV: "production" }, false]] as const) {
      for (const key of ["SARVAM_VOICE_ENABLED", "VERCEL", "VERCEL_ENV", "NEXT_PUBLIC_SUPABASE_URL", "SARVAM_VOICE_PREVIEW_BRANCH", "VERCEL_GIT_COMMIT_REF"]) delete process.env[key];
      Object.assign(process.env, v);
      const rules = (await nextConfig.headers!()).filter((rule: { source: string }) => rule.source === "/kaju/voice");
      assert.equal(rules.length === 1 && JSON.stringify(rules[0]).includes("microphone=(self)"), expected);
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
}

async function usageChecks(access: VoiceAccess) {
  const root = await mkdtemp(join(tmpdir(), "kaju-voice-"));
  try {
    const ledger = new LocalVoiceUsage(root), now = Date.UTC(2026, 10, 15, 12);
    const grants = await Promise.allSettled(Array.from({ length: 6 }, () => ledger.reserve(access, 3, now)));
    assert.equal(grants.filter((r) => r.status === "fulfilled").length, 5);
    assert.equal(grants.filter((r) => r.status === "rejected" && status(429)(r.reason)).length, 1);
    const first = grants.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<string>;
    await ledger.issued(access, first.value, "reference", now);
    const flags = { audioSent: true, audioReceived: true, interrupted: true };
    await ledger.report(access, "reference", "client_connected", flags, now);
    await ledger.report(access, "reference", "client_connected", flags, now);
    await assert.rejects(ledger.report({ ...access, actorId: "someone-else" }, "reference", "client_ended", flags, now), status(403));
    await assert.rejects(ledger.report(access, "forged", "client_ended", flags, now), status(403));
    const file = join(root, "2026-11-15.jsonl");
    const raw = await readFile(file, "utf8");
    assert.equal(raw.split("\n").filter((r) => r.includes('"event":"client_connected"')).length, 1);
    assert.ok(!raw.includes(sentinel) && !raw.includes(localToken));
    for (let i = 0; i < 15; i++) await ledger.reserve(access, 3, now + (i + 1) * 61_000);
    await assert.rejects(ledger.reserve(access, 3, now + 2_000_000), status(429));
    await ledger.reserve({ ...access, actorId: "another" }, 3, now);
    await writeFile(file, "corrupt ledger");
    await assert.rejects(ledger.reserve(access, 3, now), status(503));
    const midnight = new LocalVoiceUsage(join(root, "midnight")), nextDay = Date.UTC(2026, 10, 16);
    for (let i = 0; i < 5; i++) await midnight.reserve(access, 3, nextDay - 1000);
    await assert.rejects(midnight.reserve(access, 3, nextDay + 1000), status(429));
    const scopeLedger = new LocalVoiceUsage(join(root, "scope"));
    for (let i = 0; i < 100; i++) await scopeLedger.reserve({ ...access, actorId: `actor-${i}` }, 3, now);
    await assert.rejects(scopeLedger.reserve({ ...access, actorId: "actor-101" }, 3, now), status(429));
    await scopeLedger.reserve({ ...access, scope: { kind: "organisation", id: "other-org" } }, 3, now);
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function proxyChecks() {
  const fakeFetch: typeof fetch = async (input, init) => {
    assert.equal(String(input), "https://apps.sarvam.ai/api/app-runtime/orgs/test-org/workspaces/test-workspace/apps/test-app/url?interaction_type=call&version=3");
    assert.equal(new Headers(init?.headers).get("X-API-Key"), sentinel);
    assert.equal(init?.redirect, "error");
    return Response.json({ url: "wss://apps.sarvam.ai/test?token=ephemeral", reference_id: "test-ref", unexpected_key: sentinel });
  };
  const result = await issueVoiceSession(config, sentinel, fakeFetch);
  assert.deepEqual(Object.keys(result).sort(), ["reference_id", "url"]);
  assert.ok(!JSON.stringify(result).includes(sentinel));
  await assert.rejects(issueVoiceSession(config, sentinel, async () => new Response(sentinel, { status: 401 })), (e: Error) => !e.message.includes(sentinel));
  for (const url of ["wss://evil.example/test", "ws://apps.sarvam.ai/test", "wss://sarvam.ai.evil.example/test", "wss://user:password@apps.sarvam.ai/test"]) await assert.rejects(issueVoiceSession(config, sentinel, async () => Response.json({ url, reference_id: "ref" })));
  const previous = { ...process.env }, realFetch = globalThis.fetch;
  let networkCalls = 0;
  try {
    Object.assign(process.env, settingsEnv); delete process.env.VERCEL;
    globalThis.fetch = async () => { networkCalls++; throw Error("Unexpected network call"); };
    assert.equal((await readPublicConfig(req())).status, 401);
    const response = await readPublicConfig(req(auth));
    const publicConfig = await response.json();
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.ok(!JSON.stringify(publicConfig).includes(sentinel) && !JSON.stringify(publicConfig).includes(localToken));
    assert.deepEqual(publicConfig.languages, config.languages);
    const params = Promise.resolve({ orgId: config.org_id, workspaceId: config.workspace_id, appId: config.app_id });
    const signingRequest = (query: string) => new Request(`http://localhost:3300/api/kaju/voice/orgs/test-org/workspaces/test-workspace/apps/test-app/url?${query}`, { headers: { host: "localhost:3300", "X-StrayPaw-Voice-Test": "1", ...auth } });
    for (const query of ["interaction_type=chat&version=3", "interaction_type=call&version=2", "interaction_type=call&version=3&url=https://evil.example", "interaction_type=call&version=3&version=2"]) assert.equal((await signSession(signingRequest(query), { params })).status, 403);
    assert.equal((await signSession(signingRequest("interaction_type=call&version=3"), { params: Promise.resolve({ ...await params, appId: "other-tenant" }) })).status, 403);
    delete process.env.SARVAM_VOICE_API_KEY;
    assert.equal((await signSession(signingRequest("interaction_type=call&version=3"), { params })).status, 503);
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = realFetch;
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
}

async function transportChecks() {
  type Options = ConstructorParameters<typeof import("sarvam-conv-ai-sdk/browser").ConversationAgent>[0];
  let opts!: Options, capturing = false, stopped = 0, muted = false, ended = 0;
  let hold: (() => Promise<void>) | null = null, holdAudio: (() => Promise<void>) | null = null;
  const replies: string[] = [], errors: string[] = [], evidence: unknown[] = [];
  class Audio {
    async start() { if (holdAudio) await holdAudio(); capturing = true; }
    async stop() { capturing = false; stopped++; }
    async output() {} interrupt() {}
  }
  class Agent {
    reference_id = "test-reference";
    constructor(o: Options) { opts = o; }
    async start() { if (hold) await hold(); await opts.audioInterface!.start(async () => {}); }
    async stop() { await opts.audioInterface!.stop(); await opts.endCallback?.(); }
    async waitForConnect() { return true; } isConnected() { return capturing; }
    getInteractionId() { return "test-interaction"; } mute() { muted = true; } unmute() { muted = false; } isMuted() { return muted; }
  }
  const sdk = { BrowserAudioInterface: Audio, ConversationAgent: Agent, InteractionType: { CALL: "call" } } as unknown as typeof import("sarvam-conv-ai-sdk/browser");
  const make = () => createVoiceTransport({ config, language: "Kannada", headers: auth, status: () => {}, transcript: (role, text) => replies.push(`${role}:${text}`), evidence: (v) => evidence.push(v), ended: () => { ended++; }, failed: (kind) => errors.push(kind) }, async () => sdk);
  const voice = await make(); await voice.start(); assert.equal(capturing, true);
  assert.equal(opts.apiKey, ""); assert.equal(opts.baseUrl, "/api/kaju/voice/"); assert.equal(opts.config.version, 3); assert.equal(opts.config.initial_language_name, "Kannada");
  voice.mute(); assert.equal(voice.isMuted(), true); voice.unmute(); assert.equal(voice.isMuted(), false);
  await opts.transcriptCallback?.({ role: "user", content: "Hello" } as never);
  assert.deepEqual(replies, ["You:Hello"]);
  for (const name of ["first_audio_packet_sent", "first_audio_packet_received", "user_interrupted"]) opts.telemetryCallback?.({ name } as never);
  assert.deepEqual(evidence.at(-1), { sent: true, received: true, interrupted: true });
  await voice.stop(); assert.equal(capturing, false); assert.equal(ended, 1);
  await opts.transcriptCallback?.({ role: "user", content: "late" } as never); assert.equal(replies.length, 1);
  // Signed-URL response arrives after Stop.
  let release!: () => void; hold = () => new Promise<void>((resolve) => { release = resolve; });
  const late = await make(); const pending = late.start(); await late.stop(); release(); await pending; assert.equal(capturing, false); hold = null;
  // Microphone permission resolves after Stop.
  holdAudio = () => new Promise<void>((resolve) => { release = resolve; });
  const mic = await make(); const pendingMic = mic.start(); await mic.stop(); release(); await pendingMic; assert.equal(capturing, false); holdAudio = null;
  const disconnected = await make(); await disconnected.start(); opts.telemetryCallback?.({ name: "ws_disconnected" } as never);
  await new Promise((resolve) => setImmediate(resolve)); assert.equal(capturing, false);
  holdAudio = async () => { const e = new Error("permission"); e.name = "NotAllowedError"; throw e; };
  const denied = await make(); await assert.rejects(denied.start()); assert.equal(capturing, false); assert.ok(errors.includes("NotAllowedError"));
  assert.ok(stopped > 0);
}

async function privacyChecks() {
  const require = createRequire(import.meta.url);
  const root = join(require.resolve("sarvam-conv-ai-sdk/browser"), "..");
  async function scan(dir: string) {
    for (const file of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, file.name); if (file.isDirectory()) { await scan(path); continue; }
      if (!file.name.endsWith(".js")) continue;
      const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.ES2022, true);
      const visit = (node: ts.Node) => {
        assert.ok(!(ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "console"), "SDK must not log session data");
        ts.forEachChild(node, visit);
      }; visit(source);
    }
  }
  await scan(root);
  for (const file of ["VoiceTest.tsx", "transport.ts", "VoiceEntry.tsx"]) assert.ok(!(await readFile(join("src/kaju/voice", file), "utf8")).includes("process.env.SARVAM_VOICE_API_KEY"));
}

async function main() {
  const access = await accessChecks(); await productionChecks(); await usageChecks(access); await proxyChecks(); await transportChecks(); await privacyChecks();
  console.log("Kaju voice security and lifecycle checks passed. All provider/audio transports were simulated; no live calls.");
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
