import {NextResponse} from 'next/server';
import {getSupabaseAdmin} from '@/lib/supabase';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Not authorised'},{status:401});
 const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:'Check store unavailable'},{status:503});
 const due=await db.rpc('kaju_due_checks',{p_limit:10});
 if(due.error)return NextResponse.json({error:'Could not read due checks'},{status:503});
 let checked=0,failed=0;
 for(const {ngo_id} of due.data??[]){const r=await db.rpc('kaju_refresh_checks',{p_ngo:ngo_id});if(r.error)failed++;else checked++;}
 return NextResponse.json({checked,failed,limit:10},{status:failed?503:200,headers:{'Cache-Control':'no-store'}});
}
