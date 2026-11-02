import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
/** The browser cannot choose its tenant, role or reviewing offices. */
export async function readAiScope(db:SupabaseClient,userId:string){
 const [ngo,abc]=await Promise.all([db.rpc('my_ngo'),db.rpc('abc_my_context')]);
 if(ngo.error||abc.error)throw Error('Workspace permissions could not be checked. Try again.');
 const orgId=typeof ngo.data==='string'?ngo.data:null;
 const offices=Array.isArray(abc.data?.offices)?abc.data.offices.map((o:{id?:string;office_id?:string})=>o.id??o.office_id).filter((id:unknown):id is string=>typeof id==='string').sort():[];
 const actorRole=typeof abc.data?.role==='string'?abc.data.role:offices.length?'municipal_reviewer':null;
 return {orgId,actorRole,scope:JSON.stringify([userId,orgId,actorRole,offices])};
}
