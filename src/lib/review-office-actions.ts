import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {auditReference} from '@/sp3/ai/validation';
const events:Record<string,string>={create:'review_office_created',rename:'review_office_renamed',addReviewer:'reviewer_added',removeReviewer:'reviewer_removed'};

/** A second read verifies both the permission record and the committed audit. */
export async function verifyOfficeChange(db:SupabaseClient,requestId:string,action:string,expected:{name:string|null;city:string|null},result:unknown){
 if(!result||typeof result!=='object')throw Error('No office receipt');
 const r=result as Record<string,unknown>;
 const auditId=auditReference(r.audit_id);
 if(!auditId||typeof r.office_id!=='string'||r.action!==action)throw Error('Incomplete office receipt');
 const [office,audit]=await Promise.all([
  db.from('review_offices').select('id,name,city').eq('id',r.office_id).maybeSingle(),
  db.from('operational_audit_log').select('id,after_data,created_at').eq('id',auditId).eq('entity_type','review_office').eq('entity_id',r.office_id).eq('action',events[action]).contains('after_data',{request_id:requestId}).maybeSingle(),
 ]);
 if(office.error||audit.error||!office.data||!audit.data)throw Error('Office or audit unavailable');
 if(action==='create'||action==='rename'){
  if(office.data.name!==expected.name||office.data.city!==expected.city)throw Error('Office changed after this request');
 }else{
  if(typeof r.user_id!=='string'||audit.data.after_data?.user_id!==r.user_id)throw Error('Incomplete reviewer receipt');
  const member=await db.from('review_office_members').select('user_id,role').eq('office_id',r.office_id).eq('user_id',r.user_id).maybeSingle();
  if(member.error||action==='addReviewer'&&member.data?.role!=='reviewer'||action==='removeReviewer'&&member.data)throw Error('Reviewer access could not be verified');
 }
 return {at:audit.data.created_at};
}
