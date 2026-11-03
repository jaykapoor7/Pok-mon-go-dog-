import {locationCell} from '../location-cell';
import {getSupabase} from '../supabase';
import {readSynced,type FieldDraft} from './outbox';
import {operationRpc,type OperationReceipt} from '../operations';
export async function submitFieldDraft(d:FieldDraft,actorId:string,ngoId:string){
 const db=getSupabase();if(!db)throw Error('Session unavailable');const session=await db.auth.getUser();if(session.data.user?.id!==actorId)throw Error('Session changed. Sign in again.');
 let caseId=d.caseId,dogId:string|undefined;
 if(d.intakeRequest){const parent=(await readSynced(d.scope)).find(r=>r.id===d.intakeRequest);if(!parent)throw Error('Synchronise the animal intake first. This record remains on the device.');caseId=parent.caseId;dogId=parent.dogId}
 async function verifyAudit(receipt:{record_id:string;audit_id:number},table:string,fields:string){
  const [source,audit]=await Promise.all([db!.from(table).select(fields).eq('id',receipt.record_id).single(),db!.from('operational_audit_log').select('id,created_at,actor_id,entity_id,after_data').eq('id',receipt.audit_id).eq('actor_id',actorId).single()]);
  if(source.error||audit.error||!source.data||!audit.data||audit.data.entity_id!==receipt.record_id||audit.data.after_data?.request_id!==d.id)throw Error('Source or audit could not be verified. Retry the same draft.');return{record:source.data as unknown as Record<string,unknown>,at:audit.data.created_at};
 }
 let intakeReceipt:OperationReceipt|undefined;
 if(d.intake){intakeReceipt=await operationRpc<OperationReceipt>('operations_intake',{p_request:d.id,p_payload:{...d.intake,h3_r8:await locationCell(d.intake.lat,d.intake.lng)}});const verified=await verifyAudit(intakeReceipt,'animal_operation_events','id,case_id,dog_id,payload');caseId=String(verified.record.case_id);dogId=String(verified.record.dog_id);const [animal,kase]=await Promise.all([db.from('dogs').select('id,ngo_id').eq('id',dogId).single(),db.from('cases').select('id,ngo_id,dog_id').eq('id',caseId).single()]);if(animal.error||kase.error||animal.data.ngo_id!==ngoId||kase.data.ngo_id!==ngoId||kase.data.dog_id!==dogId||JSON.stringify(verified.record.payload)!==JSON.stringify(d.intake)){
   // JSON object key order may differ after jsonb storage; compare values instead.
   if(animal.error||kase.error||animal.data?.ngo_id!==ngoId||kase.data?.ngo_id!==ngoId||kase.data?.dog_id!==dogId||Object.entries(d.intake).some(([key,value])=>(verified.record.payload as Record<string,unknown>)?.[key]!==value))throw Error('Animal intake source differs from this draft.');
  }
  if(!d.file)return{...intakeReceipt,caseId,dogId,confirmedAt:verified.at};
 }
 if(d.lifecycle){const r=await operationRpc<OperationReceipt>('operations_record_event',{p_request:d.id,p_case:caseId,p_kind:d.lifecycle.kind,p_payload:d.lifecycle.data,p_policy:d.lifecycle.policyId});const verified=await verifyAudit(r,'animal_operation_events','id,case_id,dog_id,kind,payload');if(verified.record.case_id!==caseId||verified.record.kind!==d.lifecycle.kind||Object.entries(d.lifecycle.data).some(([k,v])=>(verified.record.payload as Record<string,unknown>)?.[k]!==v))throw Error('Saved operation differs from this draft.');return{...r,caseId,dogId:String(verified.record.dog_id),confirmedAt:verified.at}}
 let url:string|null=null;
 if(d.file){const extension=d.file.type==='application/pdf'?'pdf':d.file.type==='image/png'?'png':d.file.type==='image/webp'?'webp':'jpg';const path=`${ngoId}/${caseId}/${d.id}.${extension}`;const result=await db.storage.from('abc-evidence').upload(path,d.file,{contentType:d.file.type,upsert:false});
  if(result.error){const existing=await db.storage.from('abc-evidence').download(path);if(existing.error||!existing.data)throw Error(result.error.message);const hash=async(b:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer()))).join(',');if(await hash(existing.data)!==await hash(d.file))throw Error('Stored evidence differs from this draft. It was not overwritten.')}url=`storage://abc-evidence/${path}`;
 }
 const kind=d.intake?'capture_photo':d.kind;
 const r=d.vaccination?await db.rpc('field_confirm_vaccination',{p_request:d.id,p_case:caseId,p_payload:d.vaccination}):kind?await db.rpc('field_confirm_evidence',{p_request:d.id,p_case:caseId,p_kind:kind,p_url:url,p_location:d.location??(d.intake?`Observed ${d.intake.lat}, ${d.intake.lng}`:null),p_captured:d.at}):await db.rpc('field_confirm_note',{p_request:d.id,p_case:caseId,p_note:d.note,p_captured:d.at});
 if(r.error)throw Error(r.error.message);if(!r.data?.record_id||!r.data?.audit_id)throw Error('Receipt unavailable. Retry the same draft.');
 const table=d.vaccination?'medical_events':kind?'evidence_items':'case_updates';const verified=await verifyAudit(r.data,table,d.vaccination?'id,notes,dog_id,event_date,performed_by,case_id':kind?'id,url,location_text,case_id':'id,note,case_id');const record=verified.record;
 if(record.case_id!==caseId||(d.vaccination?record.dog_id!==d.vaccination.dogId||record.event_date!==d.vaccination.eventDate||record.performed_by!==d.vaccination.performedBy.trim()||!String(record.notes).includes(d.id):kind?url?record.url!==url:String(record.location_text).trim()!==d.location?.trim():!String(record.note).startsWith(d.note.trim())))throw Error('Saved content differs from this draft. Review the source record.');
 return{...r.data,caseId,dogId,confirmedAt:verified.at};
}
