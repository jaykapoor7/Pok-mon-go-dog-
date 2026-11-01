#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   STAGING ONLY. Roles and evidence photos, with real sessions:

     · a lead makes a member a veterinarian, then a coordinator, then back;
       a non-lead cannot change roles; the last lead cannot be demoted
     · evidence photos: a member uploads into their own organisation's case
       folder; uploads into another organisation, an unknown case or a
       public path are refused; the file cannot be overwritten or deleted;
       another organisation, a person with no organisation and an
       anonymous visitor cannot read it; the organisation can

   Usage: STAGING_URL=… STAGING_ANON=… STAGING_PASSWORD=… node scripts/staging/roles-evidence-check.mjs
   ════════════════════════════════════════════════════════════════════ */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.STAGING_URL, ANON = process.env.STAGING_ANON, PW = process.env.STAGING_PASSWORD;
if (!URL || !ANON || !PW) { console.error("Set STAGING_URL, STAGING_ANON and STAGING_PASSWORD."); process.exit(2); }
if (!URL.includes("ucxfxiddufwqithtdtix")) { console.error("Refusing: this check only runs against staging."); process.exit(2); }

const NGO = "20000000-0000-4000-8000-000000000001", OTHER_NGO = "20000000-0000-4000-8000-000000000002";
const people = {
  admin: "ngo.demo@straypaw.invalid", vet: "vet.demo@straypaw.invalid", coord: "coordinator.demo@straypaw.invalid",
  other: "other.demo@straypaw.invalid", community: "noorg.demo@straypaw.invalid", reviewer: "reviewer.demo@straypaw.invalid",
};
const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const client = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const c = {};
for (const k of Object.keys(people)) {
  c[k] = client();
  const { error } = await c[k].auth.signInWithPassword({ email: people[k], password: PW });
  if (error) throw new Error(`${k}: ${error.message}`);
}
const anon = client();
const uid = async (k) => (await c[k].auth.getUser()).data.user.id;

// ── roles ─────────────────────────────────────────────────────────────
const coordId = await uid("coord"), adminId = await uid("admin");
{
  const { data: members } = await c.admin.rpc("my_org_members");
  ok("lead lists the team", Array.isArray(members) && members.length >= 3, `${members?.length} people`);
  let r = await c.admin.rpc("set_member_role", { p_user_id: coordId, p_role: "veterinarian" });
  ok("lead makes a member a veterinarian", !r.error && r.data === true, r.error?.message);
  let ctx = await c.coord.rpc("abc_my_context");
  ok("the change is what the workflow sees", ctx.data?.role === "veterinarian", ctx.data?.role);
  r = await c.admin.rpc("set_member_role", { p_user_id: coordId, p_role: "coordinator" });
  ok("lead makes them a coordinator again", !r.error && r.data === true, r.error?.message);
  r = await c.vet.rpc("set_member_role", { p_user_id: coordId, p_role: "admin" });
  ok("a non-lead cannot change roles", !!r.error, r.error?.message);
  r = await c.admin.rpc("set_member_role", { p_user_id: coordId, p_role: "owner" });
  ok("an unknown role is refused", !!r.error, r.error?.message);
  r = await c.admin.rpc("set_member_role", { p_user_id: adminId, p_role: "member" });
  ok("the last lead cannot be demoted", !!r.error, r.error?.message);
  r = await c.other.rpc("set_member_role", { p_user_id: coordId, p_role: "member" });
  ok("another organisation's lead cannot touch this team", !r.error ? r.data === false : true, r.error?.message ?? `returned ${r.data}`);
  ctx = await c.coord.rpc("abc_my_context");
  ok("role restored", ctx.data?.role === "coordinator", ctx.data?.role);
}

// ── evidence photos ───────────────────────────────────────────────────
const { data: kase } = await c.coord.from("cases").select("id").eq("ngo_id", NGO).limit(1).single();
const { data: otherCase } = await c.other.from("cases").select("id").eq("ngo_id", OTHER_NGO).limit(1).maybeSingle();
const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==", "base64");
const path = `${NGO}/${kase.id}/check-${Date.now()}.jpg`;
const b = (k) => c[k].storage.from("abc-evidence");
{
  let r = await b("coord").upload(path, jpeg, { contentType: "image/jpeg" });
  ok("member uploads a photo into their own case", !r.error, r.error?.message);
  r = await b("coord").upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
  ok("the photo cannot be overwritten", !!r.error, r.error?.message);
  r = await b("coord").remove([path]);
  ok("the photo cannot be deleted by a client", !r.error && (r.data ?? []).length === 0, r.error?.message ?? `removed ${r.data?.length}`);
  r = await b("coord").upload(`${NGO}/00000000-0000-4000-8000-000000000000/x.jpg`, jpeg, { contentType: "image/jpeg" });
  ok("upload into an unknown case is refused", !!r.error, r.error?.message);
  if (otherCase) {
    r = await b("coord").upload(`${OTHER_NGO}/${otherCase.id}/x.jpg`, jpeg, { contentType: "image/jpeg" });
    ok("upload into another organisation is refused", !!r.error, r.error?.message);
  }
  r = await b("coord").upload(`public/x.jpg`, jpeg, { contentType: "image/jpeg" });
  ok("upload outside a case folder is refused", !!r.error, r.error?.message);
  r = await b("community").upload(`${NGO}/${kase.id}/y.jpg`, jpeg, { contentType: "image/jpeg" });
  ok("a person with no organisation cannot upload", !!r.error, r.error?.message);
  r = await anon.storage.from("abc-evidence").upload(`${NGO}/${kase.id}/z.jpg`, jpeg, { contentType: "image/jpeg" });
  ok("an anonymous visitor cannot upload", !!r.error, r.error?.message);

  const s = await b("vet").createSignedUrl(path, 60);
  ok("the organisation reads it through a signed link", !s.error && !!s.data?.signedUrl, s.error?.message);
  if (s.data?.signedUrl) { const res = await fetch(s.data.signedUrl); ok("the signed link serves the file", res.ok, `${res.status}`); }
  for (const k of ["other", "community", "reviewer"]) {
    const x = await b(k).createSignedUrl(path, 60);
    ok(`${k} cannot read it`, !!x.error, x.error?.message ?? "signed");
  }
  const a = await anon.storage.from("abc-evidence").createSignedUrl(path, 60);
  ok("an anonymous visitor cannot read it", !!a.error, a.error?.message ?? "signed");
  const pub = await fetch(`${URL}/storage/v1/object/public/abc-evidence/${path}`);
  ok("there is no public link", !pub.ok, `${pub.status}`);

  const e = await c.coord.rpc("abc_add_evidence", { p_case_id: kase.id, p_kind: "capture_photo", p_url: `storage://abc-evidence/${path}`, p_location: null, p_title: "Upload check" });
  ok("the upload is linked to the case as evidence", !e.error, e.error?.message);
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
