import Link from "next/link";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { DogActions } from "@/components/dog/DogActions";
import { DogStatusEditor } from "@/components/dog/DogStatusEditor";
import { FollowButton } from "@/components/dog/FollowButton";
import { ShareDog } from "@/components/dog/ShareDog";
import { AddComment } from "@/components/dog/AddComment";
import { AnimalDocuments } from "@/components/dog/AnimalDocuments";
import type { Case, DogProfile } from "@/lib/types";
import type { ProfileOperationalRecord, StandardAnimalRecord } from "@/lib/animal-profile-record";
import { dogLabel, formatDate, timeAgo } from "@/lib/utils";

const LABELS:Record<string,string>={rescue:"Rescue",treatment:"Treatment",follow_up:"Follow-up",sterilisation:"Sterilisation",vaccination:"Vaccination",adoption:"Adoption",foster:"Foster",observation:"Observation"};
const recordLabel=(value:string)=>LABELS[value]??value.replace(/^import:/,"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const dateOrUnknown=(value:string|null|undefined)=>value?formatDate(value):"Not recorded";

function firstValue<T>(rows:StandardAnimalRecord[],pick:(row:StandardAnimalRecord)=>T|null|undefined){for(const row of rows){const value=pick(row);if(value!==null&&value!==undefined&&String(value).trim())return value}return null}
function sourceDetail(row:StandardAnimalRecord){return [row.condition,row.caseDetail,row.treatmentUpdate,row.rescuePlan,row.review].filter((v):v is string=>Boolean(v?.trim())).join(" · ")}

export function UnifiedAnimalProfile({profile,cases,operational}:{profile:DogProfile;cases:Case[];operational:ProfileOperationalRecord}){
 const {dog,sightings,comments}=profile;
 const imported=operational.imported;
 const sourceName=dog.ngo_name||(dog.ngo_id?"NGO record":"Community record");
 const sex=firstValue(imported,row=>row.sex);
 const colour=firstValue(imported,row=>row.colour)||dog.color;
 const locality=firstValue(imported,row=>row.locality)||dog.zone;
 const code=firstValue(imported,row=>row.animalCode)||dog.code;
 const communitySightings=sightings.filter(row=>row.source_kind!=="historic_ngo_record");
 const vaccineEvents=operational.medical.filter(row=>row.kind==="vaccination").length||profile.vaccinations.length;
 const sterilisationEvents=operational.medical.filter(row=>row.kind==="sterilisation").length||profile.sterilisations.length;
 const treatmentEvents=operational.medical.filter(row=>!["vaccination","sterilisation"].includes(row.kind)).length;
 const resolvedCase=cases.find(row=>["resolved","closed"].includes(String(row.status).toLowerCase()));
 const outcome=resolvedCase?.resolution?String(resolvedCase.resolution).replace(/_/g," "):resolvedCase?"Completed":"No completed outcome recorded";

 const nativeHistory=[
  ...cases.map(row=>({id:`case-${row.id}`,date:row.created_at,type:row.category,title:row.title,detail:row.description,href:`/cases/${row.id}`})),
  ...operational.timeline.map(row=>({id:`timeline-${row.id}`,date:row.occurredAt,type:row.eventType,title:row.title,detail:row.details,href:null as string|null})),
 ].sort((a,b)=>+new Date(b.date)-+new Date(a.date));
 const sourceHistory=imported.map(row=>({id:`source-${row.id}-${row.classification}`,date:row.eventDate,type:row.classification,title:row.condition||recordLabel(row.classification),detail:sourceDetail(row),href:null as string|null}));
 const history=nativeHistory.length?nativeHistory:sourceHistory;

 return <main className="min-h-screen bg-[#f7f5ef] text-[#0b1e3d]"><div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
  <header className="grid overflow-hidden border-y border-black/[.09] bg-white md:grid-cols-[300px_1fr]">
   <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} className="h-[280px] w-full md:h-full md:min-h-[340px]"/>
   <div className="flex flex-col justify-between p-6 sm:p-8">
    <div><div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] opacity-55"><Building2 size={13}/>{sourceName}</span><FollowButton dogId={dog.id}/></div><h1 className="mt-4 text-4xl font-semibold tracking-[-.05em]">{dogLabel(dog)}</h1><p className="mt-3 flex flex-wrap items-center gap-2 text-sm opacity-70"><MapPin size={14}/>{locality||"Location not recorded"}<span>·</span><span className="capitalize">{dog.species||"animal"}</span>{sex&&<><span>·</span><span>{sex}</span></>}</p><p className="mt-5 max-w-2xl text-sm leading-6 opacity-80">{dog.intake_notes||firstValue(imported,row=>row.caseDetail)||firstValue(imported,row=>row.condition)||"No intake note recorded."}</p></div>
    <div className="mt-7 flex flex-wrap gap-2 border-t border-black/[.08] pt-5"><DogActions dogId={dog.id} name={dogLabel(dog)} needsHelp={dog.needs_help}/><ShareDog dogId={dog.id} label={dogLabel(dog)} zone={dog.zone}/></div>
   </div>
  </header>

  <section className="mt-9"><SectionHead kicker="Record" title="Animal details"/><div className="mt-3 grid border-t border-black/[.1] sm:grid-cols-2"><Field label="Animal ID" value={code||"Not recorded"}/><Field label="Name" value={dog.name||firstValue(imported,row=>row.animalName)||"Not named"}/><Field label="Sex" value={sex||"Not recorded"}/><Field label="Colour / markings" value={colour||"Not recorded"}/><Field label="Locality" value={locality||"Not recorded"}/><Field label="First recorded" value={dateOrUnknown(dog.first_seen)}/><Field label="Last recorded" value={dateOrUnknown(dog.last_seen)}/><Field label="Current state" value={String(dog.status).replace(/_/g," ")}/></div></section>

  <section className="mt-10"><SectionHead kicker="Care" title="What has been done"/><div className="mt-3 border-t border-black/[.1]"><Care label="Cases" value={`${cases.length} recorded`} detail="Open a case below to inspect its full record."/><Care label="Treatment / medical care" value={treatmentEvents?`${treatmentEvents} events`:"No treatment event recorded"}/><Care label="Rabies / vaccination" value={dog.vaccinated||vaccineEvents?"Recorded":"Unknown / not established"} detail={vaccineEvents?`${vaccineEvents} traceable event${vaccineEvents===1?"":"s"}`:undefined}/><Care label="ABC / sterilisation" value={dog.sterilised||sterilisationEvents?"Recorded":"Unknown / not established"} detail={sterilisationEvents?`${sterilisationEvents} traceable event${sterilisationEvents===1?"":"s"}`:undefined}/><Care label="Follow-up / review" value={operational.followUps.length?`${operational.followUps.length} recorded`:"No follow-up recorded"}/><Care label="Outcome" value={outcome}/></div></section>

  <DogStatusEditor dogId={dog.id} contributorIds={Array.from(new Set(sightings.map(s=>s.user_id).filter((id):id is string=>Boolean(id))))} initial={{status:dog.status,needs_help:dog.needs_help,vaccinated:dog.vaccinated,sterilised:dog.sterilised,is_friendly:dog.is_friendly,ear_notch:dog.ear_notch??null}}/>

  <section className="mt-10"><div className="flex items-end justify-between gap-4"><SectionHead kicker="History" title="Chronological record"/><span className="text-xs opacity-55">{history.length} entries</span></div><div className="mt-3 border-t border-black/[.1]">{history.length?history.map(item=><div key={item.id} className="grid gap-2 border-b border-black/[.08] py-4 sm:grid-cols-[120px_150px_minmax(0,1fr)_20px] sm:items-start"><span className="text-xs tabular-nums opacity-55">{dateOrUnknown(item.date)}</span><b className="text-xs">{recordLabel(item.type)}</b><span><strong className="block text-sm font-semibold">{item.title}</strong>{item.detail&&item.detail!==item.title&&<small className="mt-1 block leading-5 opacity-65">{item.detail}</small>}</span>{item.href?<Link href={item.href} aria-label="Open record"><ArrowUpRight size={15}/></Link>:<span/>}</div>):<p className="py-6 text-sm opacity-60">No history recorded yet.</p>}</div></section>

  <section className="mt-10"><div className="flex items-end justify-between gap-4"><SectionHead kicker="Cases" title="Case records"/><Link href={`/cases/new?dog=${dog.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2457ce]">Open a case <ArrowUpRight size={14}/></Link></div><div className="mt-3 border-t border-black/[.1]">{cases.length?cases.map(item=><Link key={item.id} href={`/cases/${item.id}`} className="grid gap-2 border-b border-black/[.08] py-4 hover:bg-black/[.02] sm:grid-cols-[120px_1fr_20px] sm:items-center"><span className="text-xs opacity-55">{dateOrUnknown(item.created_at)}</span><span><b className="block text-sm">{item.title}</b><small className="capitalize opacity-60">{item.category} · {String(item.status).replace(/_/g," ")}</small></span><ArrowUpRight size={15}/></Link>):<p className="py-6 text-sm opacity-60">No cases linked to this animal.</p>}</div></section>

  {communitySightings.length>0&&<section className="mt-10"><SectionHead kicker="Community" title="Recent sightings"/><div className="mt-3 border-t border-black/[.1]">{communitySightings.slice(0,8).map(s=><div key={s.id} className="grid gap-2 border-b border-black/[.08] py-4 sm:grid-cols-[120px_1fr]"><span className="text-xs opacity-55">{dateOrUnknown(s.created_at)}</span><span><b className="block text-sm">{s.zone||"Sighting"}</b>{s.notes&&<small className="mt-1 block leading-5 opacity-65">{s.notes}</small>}</span></div>)}</div></section>}

  {imported.length>0&&<section className="mt-10"><SectionHead kicker="Provenance" title="Source register"/><p className="mt-2 max-w-3xl text-sm leading-6 opacity-70">This animal is backed by {imported.length} historical source record{imported.length===1?"":"s"}. Native cases, care events and follow-ups above are the working record; the source register remains the audit trail.</p><div className="mt-3 border-t border-black/[.1]">{imported.slice(0,12).map(row=><div key={`${row.id}-${row.classification}`} className="grid gap-2 border-b border-black/[.08] py-3 sm:grid-cols-[120px_150px_1fr]"><span className="text-xs opacity-55">{dateOrUnknown(row.eventDate)}</span><span className="text-xs font-semibold">{row.sourceSheet||recordLabel(row.classification)}{row.sourceRow?` · row ${row.sourceRow}`:""}</span><span className="text-xs leading-5 opacity-65">{sourceDetail(row)||"Source record"}</span></div>)}</div></section>}

  <section className="mt-10"><SectionHead kicker="Notes" title="Community notes"/><div className="mt-3"><AddComment dogId={dog.id}/><div className="mt-4 border-t border-black/[.1]">{comments.length?comments.map(comment=><div key={comment.id} className="border-b border-black/[.08] py-4"><p className="text-xs font-semibold opacity-60">{comment.user_name} · {timeAgo(comment.created_at)}</p><p className="mt-1 text-sm leading-6">{comment.body}</p></div>):<p className="py-5 text-sm opacity-60">No community notes yet.</p>}</div></div></section>

  <div className="mt-12 border-t border-black/[.1] pt-8"><AnimalDocuments dogId={dog.id}/></div>
 </div></main>
}

function SectionHead({kicker,title}:{kicker:string;title:string}){return <div><span className="text-[11px] font-semibold uppercase tracking-[.14em] opacity-50">{kicker}</span><h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2></div>}
function Field({label,value}:{label:string;value:string}){return <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-black/[.08] py-3 sm:px-2"><span className="text-xs opacity-55">{label}</span><b className="text-sm font-medium capitalize">{value}</b></div>}
function Care({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="grid gap-1 border-b border-black/[.08] py-4 sm:grid-cols-[220px_180px_1fr]"><b className="text-sm">{label}</b><span className="text-sm">{value}</span>{detail?<small className="leading-5 opacity-60">{detail}</small>:<span/>}</div>}
