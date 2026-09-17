import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

async function actor(request:Request){
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  const admin=getSupabaseAdmin();
  if(!admin||!token)return null;
  const {data:user}=await admin.auth.getUser(token);
  if(!user.user)return null;
  const {data:member}=await admin.from("ngo_members").select("ngo_id").eq("user_id",user.user.id).maybeSingle();
  return member?.ngo_id?{admin,ngoId:member.ngo_id as string}:null;
}
async function paged(load:(from:number,to:number)=>any,max=25000){
  const rows:any[]=[];
  for(let from=0;from<max;from+=1000){
    const {data,error}=await load(from,Math.min(from+999,max-1));
    if(error)break;
    rows.push(...(data??[]));
    if(!data||data.length<1000)break;
  }
  return rows;
}
const isClosed=(status:unknown)=>["resolved","closed"].includes(String(status??"").toLowerCase());
const careCategory=(kind:unknown)=>{const s=String(kind??"").toLowerCase();if(/vaccin|rabies|arv/.test(s))return"vaccination";if(/sterili|abc|spay|neuter/.test(s))return"sterilisation";return"treatment"};
const within=(value:unknown,from:number|null,to:number|null)=>{if(!from&&!to)return true;const t=Date.parse(String(value??""));return Number.isFinite(t)&&(!from||t>=from)&&(!to||t<=to)};
const contains=(value:unknown,q:string|null)=>!q||String(value??"").toLowerCase().includes(q.toLowerCase());

function append(book:XLSX.WorkBook,name:string,rows:Record<string,unknown>[]){XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(rows),name.slice(0,31));}

export async function GET(request:Request){
  const current=await actor(request);if(!current)return NextResponse.json({error:"Organisation access required."},{status:401});
  const url=new URL(request.url),year=url.searchParams.get("year"),fromText=url.searchParams.get("from")||(year?`${year}-01-01`:null),toText=url.searchParams.get("to")||(year?`${year}-12-31`:null),from=fromText?Date.parse(`${fromText}T00:00:00`):null,to=toText?Date.parse(`${toText}T23:59:59.999`):null,category=url.searchParams.get("category")??"all",status=url.searchParams.get("status")??"all",locality=url.searchParams.get("locality")?.trim()||null,scopeType=url.searchParams.get("scopeType")??"all",scopeId=url.searchParams.get("scopeId")||null;
  const {data:ngo}=await current.admin.from("ngos").select("id,name,city,state").eq("id",current.ngoId).maybeSingle();
  let scope="Organisation-wide report";
  const book=XLSX.utils.book_new();

  if(scopeType==="survey"&&scopeId){
    const {data:survey}=await current.admin.from("surveys").select("*").eq("id",scopeId).eq("ngo_id",current.ngoId).maybeSingle();
    if(!survey)return NextResponse.json({error:"Project or survey not found."},{status:404});
    scope=survey.title;
    const responses=(await paged((a,b)=>current.admin.from("survey_responses").select("*").eq("survey_id",scopeId).order("created_at",{ascending:false}).range(a,b))).filter(r=>within(r.created_at,from,to));
    const {data:areas}=await current.admin.from("survey_areas").select("*").eq("survey_id",scopeId).order("created_at");
    const counts=new Map<string,{responses:number;animals:number}>();
    for(const r of responses)if(r.area_id){const c=counts.get(r.area_id)??{responses:0,animals:0};c.responses++;c.animals+=Number(r.count??1);counts.set(r.area_id,c)}
    append(book,"Summary",[{Organisation:ngo?.name??"Organisation",Scope:scope,Period:fromText||toText?`${fromText??"Start"} to ${toText??"Present"}`:"All time",Responses:responses.length,"Animals / observations":responses.reduce((n:number,r:any)=>n+Number(r.count??1),0),Generated:new Date().toISOString()}]);
    append(book,"Project responses",responses.map((r:any)=>({Date:r.created_at,Species:r.species??survey.species??"",Count:r.count??1,Notes:r.notes??"",...Object.fromEntries(Object.entries(r.attributes??{}).map(([k,v])=>[k,typeof v==="object"?JSON.stringify(v):v]))})));
    append(book,"Areas",(areas??[]).map((a:any)=>({Area:a.name,Code:a.code??"",Status:a.status??"",Target:a.target_count??"",Responses:counts.get(a.id)?.responses??0,"Animals / observations":counts.get(a.id)?.animals??0})));
  }else{
    const [rawCases,rawAnimals,rawCare]=await Promise.all([
      paged((a,b)=>current.admin.from("cases").select("*,dogs(name,code,straypaw_id,species,zone,cover_photo,campaign_id)").eq("ngo_id",current.ngoId).order("last_activity_at",{ascending:false}).range(a,b)),
      paged((a,b)=>current.admin.from("dogs").select("*").eq("ngo_id",current.ngoId).order("last_seen",{ascending:false}).range(a,b)),
      paged((a,b)=>current.admin.from("medical_events").select("id,dog_id,case_id,kind,event_date,notes,performed_by,created_at,dogs!inner(name,code,straypaw_id,species,zone,cover_photo,campaign_id,ngo_id)").eq("dogs.ngo_id",current.ngoId).order("event_date",{ascending:false}).range(a,b)),
    ]);
    if(scopeType==="campaign"&&scopeId){const {data}=await current.admin.from("campaigns").select("name").eq("id",scopeId).eq("ngo_id",current.ngoId).maybeSingle();if(data)scope=data.name;}
    const campaignOk=(campaignId:unknown,programmeId?:unknown)=>scopeType!=="campaign"||!scopeId||campaignId===scopeId||programmeId===scopeId;
    const cases=rawCases.filter((r:any)=>within(r.source_event_at??r.created_at,from,to)&&campaignOk(r.dogs?.campaign_id,r.programme_id)&&contains(r.zone??r.dogs?.zone,locality)&&(status==="all"||(status==="open"?!isClosed(r.status):status==="completed"?isClosed(r.status):String(r.status).toLowerCase()===status.toLowerCase()))&&(category!=="rescue"||/rescue|intake|injury|medical|treatment/i.test(String(r.category??""))));
    const care=rawCare.filter((r:any)=>within(r.event_date??r.created_at,from,to)&&campaignOk(r.dogs?.campaign_id)&&contains(r.dogs?.zone,locality)&&(category==="all"||category==="rescue"||careCategory(r.kind)===category));
    const animalIds=new Set([...cases.map((r:any)=>r.dog_id),...care.map((r:any)=>r.dog_id)].filter(Boolean));
    const animals=rawAnimals.filter((r:any)=>(animalIds.size?animalIds.has(r.id):campaignOk(r.campaign_id))&&contains(r.zone,locality));
    append(book,"Summary",[{Organisation:ngo?.name??"Organisation",Scope:scope,Period:fromText||toText?`${fromText??"Start"} to ${toText??"Present"}`:"All time",Category:category,Status:status,Locality:locality??"all",Cases:cases.length,Animals:animals.length,"Care events":care.length,Generated:new Date().toISOString()}]);
    append(book,"Cases",cases.map((r:any)=>({"Case ID":r.case_code??r.id,"StrayPaw ID":r.dogs?.straypaw_id??"","Source / organisation ID":r.dogs?.code??"",Animal:r.dogs?.name??"",Species:r.species??r.dogs?.species??"animal",Condition:r.condition_text??r.category,Status:r.status,Stage:r.stage??"",Severity:r.severity??"",Locality:r.zone??r.dogs?.zone??"",Assignee:r.assignee_name??"","Next action":r.next_action??"","Follow-up":r.follow_up_at??"",Outcome:r.outcome_note??r.resolution??"","Evidence status":r.proof_verified?"Verified":r.verification_state??"Submitted",Opened:r.source_event_at??r.created_at??"","Last updated":r.last_activity_at??""})));
    append(book,"Animals",animals.map((r:any)=>({"StrayPaw ID":r.straypaw_id??r.id,"Source / organisation ID":r.code??"",Name:r.name??"",Species:r.species??"animal",Sex:r.sex??"Unknown",Colour:r.color??"Unknown",Identifiers:r.identifiers??"",Locality:r.zone??"",Status:r.status??"",Sterilisation:r.sterilisation_status??"Unknown",Rabies:r.vaccination_status??"Unknown","First recorded":r.first_seen??r.created_at??"","Last seen":r.last_seen??"",Provenance:r.provenance??""})));
    append(book,"Care history",care.map((r:any)=>({"StrayPaw ID":r.dogs?.straypaw_id??r.dog_id,"Source / organisation ID":r.dogs?.code??"",Animal:r.dogs?.name??"","Case ID":r.case_id??"",Event:r.kind,Date:r.event_date,Locality:r.dogs?.zone??"","Performed by":r.performed_by??"",Notes:r.notes??""})));
  }
  const date=new Date().toISOString().slice(0,10);
  return new Response(XLSX.write(book,{type:"buffer",bookType:"xlsx"}),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="straypaw-evidence-workbook-${date}.xlsx"`,"Cache-Control":"no-store"}});
}
