import {NextResponse} from 'next/server';
import {caller} from '@/lib/connections/server';
import {allowUserRequest} from '@/lib/rate-limit';
import {verifyAction} from '@/sp3/ai/verify';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const c=await caller(req);
 if(!c)return NextResponse.json({error:'Sign in first.'},{status:401});
 if(!c.ngoId)return NextResponse.json({error:'An organisation workspace is required.'},{status:403});
 if(!await allowUserRequest(c.db,'ai-act'))return NextResponse.json({error:'Actions are temporarily limited. Try again shortly.'},{status:429});
 const b=await req.json().catch(()=>null);
 const p=b?.proposal;
 if(b?.confirmed!==true||!p||typeof p.id!=='string'||!['open_case','add_note','schedule_followup','record_care'].includes(p.kind))return NextResponse.json({error:'Review and confirm a supported proposal.'},{status:400});
 const {error}=await c.db.rpc('kaju_confirm_action',{p_request:p.id,p_kind:p.kind,p_payload:p});
 if(error)return NextResponse.json({error:'The action could not be confirmed. Retry the same proposal to check its status.'},{status:400});
 try{
  const verification=await verifyAction(c.db,c.userId,p.id);
  if(!verification.verified)return NextResponse.json({error:'The action was recorded, but independent verification is pending. Retry this proposal to check it.',verification},{status:202});
  return NextResponse.json({ok:true,what:'Record saved and audit verified',...verification});
 }catch{return NextResponse.json({error:'The action may have been recorded. Retry the same proposal to verify it.'},{status:503});}
}
