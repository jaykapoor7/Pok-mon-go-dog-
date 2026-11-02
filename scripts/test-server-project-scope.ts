import assert from 'node:assert/strict';
import {allowedServerProject,STAGING_SUPABASE_REF} from '../src/lib/supabase-server-scope';
const stage=`https://${STAGING_SUPABASE_REF}.supabase.co`,prod='https://toujthlzjmhmoyykmayx.supabase.co';
const jwt=(ref:string,role='service_role')=>`header.${Buffer.from(JSON.stringify({ref,role})).toString('base64url')}.signature`;
const checks:[string,boolean,boolean][]=[
 ['staging service JWT accepted',allowedServerProject(stage,jwt(STAGING_SUPABASE_REF),'preview'),true],
 ['production endpoint refused in Preview',allowedServerProject(prod,jwt('toujthlzjmhmoyykmayx'),'preview'),false],
 ['production JWT refused at staging',allowedServerProject(stage,jwt('toujthlzjmhmoyykmayx'),'preview'),false],
 ['anonymous JWT cannot become admin',allowedServerProject(stage,jwt(STAGING_SUPABASE_REF,'anon'),'preview'),false],
 ['malformed JWT refused',allowedServerProject(stage,'bad.%%%.jwt','preview'),false],
 ['opaque staging secret accepted',allowedServerProject(stage,'sb_secret_isolated-test','preview'),true],
 ['opaque production endpoint refused',allowedServerProject(prod,'sb_secret_isolated-test','preview'),false],
 ['publishable key refused',allowedServerProject(stage,'sb_publishable_test','preview'),false],
 ['HTTP staging endpoint refused',allowedServerProject(stage.replace('https:','http:'),'sb_secret_test','preview'),false],
 ['production service JWT preserved',allowedServerProject(prod,jwt('toujthlzjmhmoyykmayx'),'production'),true],
 ['mismatched production JWT refused',allowedServerProject(prod,jwt(STAGING_SUPABASE_REF),'production'),false],
];
for(const [label,actual,expected] of checks){assert.equal(actual,expected,label);console.log(`PASS ${label}`)}
console.log(`${checks.length} server-project isolation checks passed`);
