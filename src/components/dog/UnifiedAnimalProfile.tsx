import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import type { Case, DogProfile } from "@/lib/types";
import type { ProfileOperationalRecord, StandardAnimalRecord } from "@/lib/animal-profile-record";
import type { PublicAnimalIdentity } from "@/lib/animal-identity";
import { dogLabel, formatDate } from "@/lib/utils";

const LABELS:Record<string,string>={rescue:"Rescued",treatment:"Treated",follow_up:"Follow-up",sterilisation:"Sterilised",vaccination:"Vaccinated",adoption:"Adopted",foster:"Fostered",observation:"Seen"};
const label=(value:string)=>LABELS[value]??value.replace(/^import:/,"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const date=(value:string|null|undefined)=>value?formatDate(value):"Date not recorded";
function firstValue<T>(rows:StandardAnimalRecord[],pick:(row:StandardAnimalRecord)=>T|null|undefined){for(const row of rows){const value=pick(row);if(value!==null&&value!==undefined&&String(value).trim())return value}return null}
function detail(row:StandardAnimalRecord){return [row.condition,row.caseDetail,row.treatmentUpdate,row.rescuePlan,row.review].filter((v):v is string=>Boolean(v?.trim())).join(" · ")}
function clean(value:unknown){return String(value??"").replace(/_/g," ").trim()}

export function UnifiedAnimalProfile({profile,cases,operational,identity}:{profile:DogProfile;cases:Case[];operational:ProfileOperationalRecord;identity:PublicAnimalIdentity|null}){
 const {dog}=profile;
 const imported=operational.imported;
 const locality=firstValue(imported,row=>row.locality)||dog.zone;
 const sex=firstValue(imported,row=>row.sex);
 const sourceCode=identity?.source_code||firstValue(imported,row=>row.animalCode)||dog.code;
 const straypawId=identity?.straypaw_id||null;
 const state=String(dog.status??"").toLowerCase();
 const complete=["resolved","closed","released","adopted","safe"].includes(state)||cases.some(row=>["resolved","closed"].includes(String(row.status).toLowerCase()));
 const urgent=Boolean(dog.needs_help);
 const tone=urgent?"urgent" as const:complete?"resolved" as const:"active" as const;
 const resolvedCase=cases.find(row=>["resolved","closed"].includes(String(row.status).toLowerCase()));
 const outcome=clean(resolvedCase?.resolution)||null;
 const condition=firstValue(imported,row=>row.condition)||cases[0]?.title||firstValue(imported,row=>row.caseDetail)||null;
 const intro=dog.intake_notes||firstValue(imported,row=>row.caseDetail)||condition||null;
 const sourceName=dog.ngo_name||(dog.ngo_id?"NGO record":"Community record");

 const events=[
  ...cases.map(row=>({id:`case-${row.id}`,date:row.source_event_at||row.created_at,type:"rescue",title:row.title||"Rescue recorded",text:row.description||null,href:`/cases/${row.id}`})),
  ...operational.medical.map(row=>({id:`care-${row.id}`,date:row.eventDate,type:row.kind,title:label(row.kind),text:row.notes||null,href:null as string|null})),
  ...operational.followUps.map(row=>({id:`follow-${row.id}`,date:row.dueAt,type:"follow_up",title:`Follow-up · ${clean((row as any).status)||label(row.kind)}`,text:row.note||null,href:null as string|null})),
  ...operational.timeline.map(row=>({id:`timeline-${row.id}`,date:row.occurredAt,type:row.eventType,title:row.title,text:row.details||null,href:null as string|null})),
 ].filter(item=>item.date).sort((a,b)=>+new Date(a.date||0)-+new Date(b.date||0));
 const sourceEvents=imported.map(row=>({id:`source-${row.id}-${row.classification}`,date:row.eventDate,type:row.classification,title:row.condition||label(row.classification),text:detail(row)||null,href:null as string|null})).filter(item=>item.date).sort((a,b)=>+new Date(a.date||0)-+new Date(b.date||0));
 const journey=events.length?events:sourceEvents;
 const visibleJourney=journey.slice(-7);
 const last=journey[journey.length-1];
 const careCount=operational.medical.length;
 const followCount=operational.followUps.length;

 return <main className="min-h-screen bg-[#f4f1e9] text-[#0b1e3d]">
  <div className="mx-auto max-w-4xl px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
   <Link href="/stories" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold opacity-55 transition hover:opacity-100"><ArrowLeft size={14}/> Stories</Link>

   <article className="overflow-hidden rounded-[26px] bg-white shadow-[0_18px_55px_rgba(11,30,61,.08)] ring-1 ring-black/[.05]">
    <div className="grid md:grid-cols-[42%_58%]">
     <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} tone={tone} className="aspect-[4/3] h-full min-h-[280px] w-full object-cover md:aspect-auto md:min-h-[430px]"/>
     <div className="flex min-w-0 flex-col p-6 sm:p-8 md:p-10">
      <div className="flex items-center justify-between gap-4">
       <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.1em] ${urgent?"bg-[#f05b40]/10 text-[#c84530]":complete?"bg-[#e3eee4] text-[#41664a]":"bg-[#e7eefb] text-[#2457ce]"}`}>{urgent?"Needs help":complete?"Journey completed":"In progress"}</span>
       <span className="truncate text-xs opacity-45">{sourceName}</span>
      </div>

      <div className="mt-7">
       <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[.92] tracking-[-.065em]">{dogLabel(dog)}</h1>
       <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm opacity-65"><MapPin size={14}/><span>{locality||"Location not recorded"}</span><span>·</span><span className="capitalize">{dog.species||"animal"}</span>{sex&&<><span>·</span><span>{sex}</span></>}</p>
      </div>

      {intro&&<p className="mt-7 max-w-xl text-[17px] leading-7 tracking-[-.01em] text-[#263a59]">{intro}</p>}

      <div className="mt-auto grid grid-cols-3 gap-4 border-t border-black/[.08] pt-7">
       <Stat value={cases.length?String(cases.length):"—"} label="Rescue"/>
       <Stat value={careCount?String(careCount):"—"} label="Care"/>
       <Stat value={outcome?"Yes":complete?"Done":"—"} label="Outcome"/>
      </div>
     </div>
    </div>
   </article>

   <section className="mx-auto mt-10 max-w-3xl sm:mt-14">
    <div className="grid gap-8 sm:grid-cols-[180px_1fr]">
     <div>
      <p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-40">The story</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">What happened</h2>
      {last&&<p className="mt-3 text-xs leading-5 opacity-50">Latest: {date(last.date)}</p>}
     </div>

     <div className="relative border-l border-[#0b1e3d]/15 pl-6 sm:pl-8">
      {visibleJourney.length?visibleJourney.map((item,index)=><div key={item.id} className={`${index===visibleJourney.length-1?"pb-1":"pb-8"} relative`}>
       <span className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#f4f1e9] sm:-left-[37px] ${index===visibleJourney.length-1?"bg-[#2457ce]":"bg-[#8c98a8]"}`}/>
       <p className="text-[11px] font-semibold uppercase tracking-[.08em] opacity-40">{date(item.date)} · {label(item.type)}</p>
       <div className="mt-1 flex items-start justify-between gap-3"><h3 className="text-[16px] font-semibold leading-6 tracking-[-.015em]">{item.title}</h3>{item.href&&<Link href={item.href} aria-label="Open case" className="mt-1 opacity-35 hover:opacity-100"><ArrowUpRight size={15}/></Link>}</div>
       {item.text&&item.text!==item.title&&<p className="mt-1.5 max-w-xl text-sm leading-6 opacity-65">{item.text}</p>}
      </div>):<p className="text-sm opacity-55">No journey events have been recorded yet.</p>}
      {journey.length>visibleJourney.length&&<p className="mt-6 text-xs opacity-45">Showing the latest {visibleJourney.length} meaningful events from {journey.length} recorded entries.</p>}
     </div>
    </div>
   </section>

   <section className="mx-auto mt-14 max-w-3xl border-t border-black/[.09] pt-7">
    <div className="flex flex-wrap items-start justify-between gap-5">
     <div><p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-40">Record</p><p className="mt-2 text-sm leading-6 opacity-65">{straypawId&&<><span className="font-mono font-semibold text-[#2457ce]">{straypawId}</span>{sourceCode&&<span> · </span>}</>}{sourceCode&&<span>Source ID {sourceCode}</span>}{!straypawId&&!sourceCode&&"Identity record pending"}</p></div>
     <div className="flex gap-6 text-right text-xs opacity-50"><span>{followCount} follow-up{followCount===1?"":"s"}</span><span>{profile.sightings.length} sighting{profile.sightings.length===1?"":"s"}</span></div>
    </div>
   </section>
  </div>
 </main>
}

function Stat({value,label}:{value:string;label:string}){return <div><strong className="block text-2xl font-semibold tracking-[-.04em]">{value}</strong><span className="mt-1 block text-[11px] font-semibold uppercase tracking-[.08em] opacity-40">{label}</span></div>}
