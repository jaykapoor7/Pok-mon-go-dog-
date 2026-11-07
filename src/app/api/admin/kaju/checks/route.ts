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
 let retried=0;
 /* One retry after a short pause; a check that still fails is reported, and kaju_due_checks offers it again next run. */
 for(const {ngo_id} of due.data??[]){let r=await db.rpc('kaju_refresh_checks',{p_ngo:ngo_id});if(r.error){retried++;await new Promise(res=>setTimeout(res,1500));r=await db.rpc('kaju_refresh_checks',{p_ngo:ngo_id});}if(r.error){failed++;console.error('Kaju check failed after retry',{ngo:ngo_id})}else checked++;}
 return NextResponse.json({checked,failed,retried,limit:10},{status:failed?503:200,headers:{'Cache-Control':'no-store'}});
}
