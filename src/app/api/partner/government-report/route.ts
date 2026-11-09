import { NextResponse } from "next/server";
import { partnerActor } from "@/lib/partner-actor";
import { buildBrandPdf, type BrandSection } from "@/lib/files/brand-pdf";

export const runtime = "nodejs";

const actor = partnerActor;

async function paged(load: (from:number,to:number)=>any, max=25000) {
  const rows:any[]=[];
  for(let from=0;from<max;from+=1000){
    const {data,error}=await load(from,Math.min(from+999,max-1));
    if(error) break;
    rows.push(...(data??[]));
    if(!data||data.length<1000) break;
  }
  return rows;
}

const isClosed=(status:unknown)=>["resolved","closed"].includes(String(status??"").toLowerCase());
const careCategory=(kind:unknown)=>{const s=String(kind??"").toLowerCase();if(/vaccin|rabies|arv/.test(s))return"vaccination";if(/sterili|abc|spay|neuter/.test(s))return"sterilisation";return"treatment"};
const within=(value:unknown,from:number|null,to:number|null)=>{if(!from&&!to)return true;const t=Date.parse(String(value??""));return Number.isFinite(t)&&(!from||t>=from)&&(!to||t<=to)};
const contains=(value:unknown,q:string|null)=>!q||String(value??"").toLowerCase().includes(q.toLowerCase());
const clean=(v:unknown)=>String(v??"").replace(/\s+/g," ").trim();

export async function GET(request:Request){
  const current=await actor(request);
  if(!current)return NextResponse.json({error:"Organisation access required."},{status:401});
  const url=new URL(request.url);
  const year=url.searchParams.get("year");
  const fromText=url.searchParams.get("from")||(year?`${year}-01-01`:null);
  const toText=url.searchParams.get("to")||(year?`${year}-12-31`:null);
  const from=fromText?Date.parse(`${fromText}T00:00:00`):null;
  const to=toText?Date.parse(`${toText}T23:59:59.999`):null;
  const category=url.searchParams.get("category")??"all";
  const status=url.searchParams.get("status")??"all";
  const locality=url.searchParams.get("locality")?.trim()||null;
  const scopeType=url.searchParams.get("scopeType")??"all";
  const scopeId=url.searchParams.get("scopeId")||null;

  const [{data:ngo},rawCases,rawAnimals,rawCare]=await Promise.all([
    current.admin.from("ngos").select("id,name,city,state").eq("id",current.ngoId).maybeSingle(),
    paged((a,b)=>current.admin.from("cases").select("*,dogs(name,code,straypaw_id,species,zone,campaign_id)").eq("ngo_id",current.ngoId).order("last_activity_at",{ascending:false}).range(a,b)),
    paged((a,b)=>current.admin.from("dogs").select("id,name,code,straypaw_id,species,zone,campaign_id").eq("ngo_id",current.ngoId).order("last_seen",{ascending:false}).range(a,b)),
    paged((a,b)=>current.admin.from("medical_events").select("id,dog_id,case_id,kind,event_date,notes,dogs!inner(name,code,straypaw_id,species,zone,campaign_id,ngo_id)").eq("dogs.ngo_id",current.ngoId).order("event_date",{ascending:false}).range(a,b)),
  ]);

  let scope="Organisation-wide report";
  let survey:any=null,responses:any[]=[],areas:any[]=[];
  if(scopeType==="campaign"&&scopeId){const {data}=await current.admin.from("campaigns").select("id,name").eq("id",scopeId).eq("ngo_id",current.ngoId).maybeSingle();if(data)scope=data.name;}
  if(scopeType==="survey"&&scopeId){
    const {data}=await current.admin.from("surveys").select("*").eq("id",scopeId).eq("ngo_id",current.ngoId).maybeSingle();
    if(data){survey=data;scope=data.title;responses=(await paged((a,b)=>current.admin.from("survey_responses").select("*").eq("survey_id",scopeId).order("created_at",{ascending:false}).range(a,b))).filter(r=>within(r.created_at,from,to));const {data:ar}=await current.admin.from("survey_areas").select("*").eq("survey_id",scopeId).order("created_at");areas=ar??[];}
  }

  const campaignOk=(campaignId:unknown,programmeId?:unknown)=>scopeType!=="campaign"||!scopeId||campaignId===scopeId||programmeId===scopeId;
  const cases=survey?[]:rawCases.filter((r:any)=>within(r.source_event_at??r.created_at,from,to)&&campaignOk(r.dogs?.campaign_id,r.programme_id)&&contains(r.zone??r.dogs?.zone,locality)&&(status==="all"||(status==="open"?!isClosed(r.status):status==="completed"?isClosed(r.status):String(r.status).toLowerCase()===status.toLowerCase()))&&(category!=="rescue"||/rescue|intake|injury|medical|treatment/i.test(String(r.category??""))));
  const care=survey?[]:rawCare.filter((r:any)=>within(r.event_date??r.created_at,from,to)&&campaignOk(r.dogs?.campaign_id)&&contains(r.dogs?.zone,locality)&&(category==="all"||category==="rescue"||careCategory(r.kind)===category));
  const animalIds=new Set([...cases.map((r:any)=>r.dog_id),...care.map((r:any)=>r.dog_id)].filter(Boolean));
  const animals=survey?[]:rawAnimals.filter((r:any)=>(animalIds.size?animalIds.has(r.id):campaignOk(r.campaign_id))&&contains(r.zone,locality));

  const periodLabel=fromText||toText?`${fromText??"Start"} to ${toText??"Present"}`:"All time";
  const filters=[category!=="all"?category:null,status!=="all"?status:null,locality].filter(Boolean).join(" · ")||"All work";
  const sections:BrandSection[]=[];
  if(survey){
    const observations=responses.reduce((n:number,r:any)=>n+Number(r.count??1),0);
    const counts=new Map<string,{responses:number;animals:number}>();for(const r of responses)if(r.area_id){const c=counts.get(r.area_id)??{responses:0,animals:0};c.responses++;c.animals+=Number(r.count??1);counts.set(r.area_id,c)}
    sections.push({heading:"Headline record",figures:[{label:"Responses",value:responses.length.toLocaleString("en-IN")},{label:"Animals / observations",value:observations.toLocaleString("en-IN")},{label:"Areas",value:areas.length.toLocaleString("en-IN")}]});
    sections.push({heading:"Area coverage",table:{columns:["Area","Status","Responses","Observations"],rows:areas.slice(0,120).map((a:any)=>{const c=counts.get(a.id)??{responses:0,animals:0};return[clean(a.name),clean(a.status||"pending"),c.responses,c.animals]}),caption:areas.length>120?`First 120 of ${areas.length.toLocaleString("en-IN")} areas.`:undefined}});
  }else{
    const closed=cases.filter((r:any)=>isClosed(r.status)).length;
    const treatment=care.filter((r:any)=>careCategory(r.kind)==="treatment").length;
    const vaccination=care.filter((r:any)=>careCategory(r.kind)==="vaccination").length;
    const sterilisation=care.filter((r:any)=>careCategory(r.kind)==="sterilisation").length;
    sections.push({heading:"Headline record",figures:[{label:"Cases",value:cases.length.toLocaleString("en-IN")},{label:"Closed",value:`${cases.length?Math.round(closed/cases.length*100):0}%`},{label:"Care events",value:care.length.toLocaleString("en-IN")},{label:"Animals in scope",value:animals.length.toLocaleString("en-IN")}]});
    sections.push({heading:"Care delivered",figures:[{label:"ABC / sterilisation",value:sterilisation.toLocaleString("en-IN")},{label:"Rabies / vaccination",value:vaccination.toLocaleString("en-IN")},{label:"Treatment / medical",value:treatment.toLocaleString("en-IN")}]});
    const places=new Map<string,number>();for(const r of [...cases,...care]){const p=clean(r.zone??r.dogs?.zone)||"Not recorded";places.set(p,(places.get(p)??0)+1)}
    sections.push({heading:"Where work concentrated",table:{columns:["Locality","Recorded activities"],rows:[...places.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([place,n])=>[place,n.toLocaleString("en-IN")])}});
    sections.push({heading:"Case register excerpt",table:{columns:["Date","Case","Animal","Locality","Status","Outcome"],rows:cases.slice(0,120).map((r:any)=>[String(r.source_event_at??r.created_at??"").slice(0,10),clean(r.case_code??r.id),clean(r.dogs?.straypaw_id??r.dogs?.name),clean(r.zone??r.dogs?.zone),clean(r.status),clean(r.outcome_note??r.resolution)]),caption:cases.length>120?`First 120 of ${cases.length.toLocaleString("en-IN")} filtered cases. The evidence workbook holds the complete register.`:undefined}});
  }
  const pdf=buildBrandPdf({title:scope,eyebrow:"Operational evidence report",organisation:[clean(ngo?.name??"Organisation"),[ngo?.city,ngo?.state].filter(Boolean).join(", ")].filter(Boolean).join(", "),period:periodLabel,facts:[`Filters: ${filters}`],sections,
    notes:["Prepared from the organisation's StrayPaw records. Aggregate programme totals and individually traceable animal records remain distinct.","Private reporter contact fields are excluded by default.","Source records remain available in the evidence workbook and provenance trail."]});
  const body=Uint8Array.from(pdf);
  const date=new Date().toISOString().slice(0,10);
  return new Response(body,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="straypaw-government-report-${date}.pdf"`,"Cache-Control":"no-store"}});
}
