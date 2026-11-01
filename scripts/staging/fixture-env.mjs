import fs from 'node:fs';
/** Optional isolated QA identities. This file never contains credentials. */
export const fixture = process.env.STAGING_FIXTURE_FILE ? JSON.parse(fs.readFileSync(process.env.STAGING_FIXTURE_FILE, 'utf8')) : null;
if (fixture) {
  if (fixture.ref !== 'ucxfxiddufwqithtdtix') throw new Error('Refusing non-staging fixture');
  process.env.STAGING_URL = `https://${fixture.ref}.supabase.co`;
  process.env.STAGING_ANON = fixture.anon;
  process.env.STAGING_PASSWORD = fixture.password;
}
export const person = (role, fallback) => fixture?.users?.[role]?.email ?? fallback;
export const userId = (role, fallback) => fixture?.users?.[role]?.id ?? fallback;
