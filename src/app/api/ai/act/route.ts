import {NextResponse} from 'next/server';
import {caller} from '@/lib/connections/server';
import {allowUserRequest} from '@/lib/rate-limit';
import {verifyAction} from '@/sp3/ai/verify';
import {confirmExposure,confirmTask} from '@/sp3/ai/confirm';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** Restoring a receipt never replays a write or supplies confirmation. */
export async function GET(req:Request){
 const c=await caller(req);if(!c)return NextResponse.json({error:'Sign in again.'},{status:401});
 const id=new URL(req.url).searchParams.get('request');if(!id||id.length>128)return NextResponse.json({error:'Invalid receipt.'},{status:400});
 try{return NextResponse.json(await verifyAction(c.db,c.userId,id),{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({error:'Receipt verification is unavailable.'},{status:503})}
}
/* A person confirms one proposal Kaju prepared. Everything runs as them (their own session): tasks go to the workspace's
   task list, bite records through the bite form's own database function, and the rest through kaju_confirm_action. Each
   is read back before the reply says it was saved. */
export async function POST(req:Request){
 const c=await caller(req);
 if(!c)return NextResponse.json({error:'Sign in first.'},{status:401});
 if(!await allowUserRequest(c.db,'ai-act'))return NextResponse.json({error:'Actions are temporarily limited. Try again shortly.'},{status:429});
 const b=await req.json().catch(()=>null);
 const p=b?.proposal;
 if(b?.confirmed!==true||!p||typeof p.id!=='string'||!p.id||p.id.length>128)return NextResponse.json({error:'Review and confirm a supported proposal.'},{status:400});
 if(p.kind==='add_task'||p.kind==='register_exposure'){
  try{const r=p.kind==='add_task'?await confirmTask(c.db,c.userId,c.ngoId,p):await confirmExposure(c.db,c.userId,p);return NextResponse.json(r.body,{status:r.status,headers:{'Cache-Control':'no-store'}});}
  catch{return NextResponse.json({error:p.kind==='add_task'?'The task status is unknown. Confirm the same proposal again to check it; it will not be added twice.':'Kaju could not tell whether the bite was saved. Open Bite cases to check before confirming again.'},{status:503});}
 }
 if(!c.ngoId)return NextResponse.json({error:'An organisation workspace is required.'},{status:403});
 if(!['open_case','add_note','schedule_followup','record_care'].includes(p.kind))return NextResponse.json({error:'Review and confirm a supported proposal.'},{status:400});
 const {error}=await c.db.rpc('kaju_confirm_action',{p_request:p.id,p_kind:p.kind,p_payload:p});
 if(error)return NextResponse.json({error:'The action could not be confirmed. Retry the same proposal to check its status.'},{status:400});
 try{
  const verification=await verifyAction(c.db,c.userId,p.id);
  if(!verification.verified)return NextResponse.json({error:'The action was recorded, but independent verification is pending. Retry this proposal to check it.',verification},{status:202});
  return NextResponse.json({ok:true,what:'Record saved and audit verified',...verification});
 }catch{return NextResponse.json({error:'The action may have been recorded. Retry the same proposal to verify it.'},{status:503});}
}
