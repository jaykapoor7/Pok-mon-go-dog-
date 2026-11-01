import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/** A second session-scoped read, independent of the write RPC's response. */
export async function verifyAction(db: SupabaseClient, actorId: string, requestId: string) {
 const {data:r,error}=await db.from('kaju_action_receipts').select('request_id,kind,record_id,record_table,audit_id,confirmed_at').eq('actor_id',actorId).eq('request_id',requestId).maybeSingle();
 if(error)throw Error('Could not read the confirmation receipt');
 if(!r)return {verified:false as const,reason:'Confirmation receipt not found'};
 const columns:Record<string,string>={cases:'id',case_updates:'id,case_id',animal_followups:'id,case_id',medical_events:'id,dog_id'};
 if(!columns[r.record_table])throw Error('Unsupported confirmation record');
 const [record,audit]=await Promise.all([
  db.from(r.record_table).select(columns[r.record_table]).eq('id',r.record_id).maybeSingle(),
  db.from('operational_audit_log').select('id').eq('id',r.audit_id).eq('entity_id',r.record_id).eq('actor_id',actorId).eq('action','ai_assisted_insert').maybeSingle(),
 ]);
 if(record.error||audit.error||!record.data||!audit.data)return {verified:false as const,reason:'The record or its audit could not be read back'};
 const source=record.data as unknown as {id:string;case_id?:string;dog_id?:string};
 const href=r.record_table==='medical_events'?`/ngo/animals/${source.dog_id}`:`/ngo/cases/${source.case_id??source.id}`;
 return {verified:true as const,id:r.record_id,auditId:r.audit_id,at:r.confirmed_at,kind:r.kind,href};
}
