import Link from "next/link";
import { ArrowUpRight,MapPin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { getPublishedCaseStories,getPublicCareTimeline,type PublicCaseStory } from "@/lib/community-case-stories";
import { rescueCategory } from "@/lib/rescue-taxonomy";
import { formatDate } from "@/lib/utils";

export const dynamic="force-dynamic";
export const metadata={title:"Animal stories, StrayPaw"};

type Story={dogId:string;latest:PublicCaseStory;cases:PublicCaseStory[];careCount:number;active:boolean;outcome:string|null};
function buildStories(cases:PublicCaseStory[],care:Awaited<ReturnType<typeof getPublicCareTimeline>>){
 const byDog=new Map<string,PublicCaseStory[]>();for(const row of cases){if(!row.dog_id)continue;byDog.set(row.dog_id,[...(byDog.get(row.dog_id)??[]),row])}
 const careByDog=new Map<string,number>();for(const row of care)if(row.dog_id)careByDog.set(row.dog_id,(careByDog.get(row.dog_id)??0)+1);
 return [...byDog.entries()].map(([dogId,rows]):Story=>{const ordered=[...rows].sort((a,b)=>+new Date(b.occurred_at)-+new Date(a.occurred_at)),active=false,outcome=ordered.find(row=>row.outcome)?.outcome??null;return{dogId,latest:ordered[0],cases:ordered,careCount:careByDog.get(dogId)??0,active,outcome}}).sort((a,b)=>Number(b.active)-Number(a.active)||+new Date(b.latest.occurred_at)-+new Date(a.latest.occurred_at));
}
export default async function StoriesPage(){
 const [cases,care]=await Promise.all([getPublishedCaseStories(),getPublicCareTimeline()]),stories=buildStories(cases,care).slice(0,24);
 return <AppShell><main className="min-h-screen bg-[#f4f1e9] text-[#0b1e3d]"><div className="mx-auto max-w-7xl px-4 pb-16 pt-7 sm:px-6 lg:px-8">
  <header className="flex flex-col gap-6 border-b border-[#0b1e3d]/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
   <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#2457ce]">Animal stories</p><h1 className="mt-2 max-w-3xl text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[.91] tracking-[-.065em]">Recent completed rescues.</h1><p className="mt-4 max-w-2xl text-sm leading-6 opacity-55">Each story includes the issue, care, outcome and date.</p></div>
   <Link href="/report" className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-[#f05b40] px-5 text-sm font-semibold text-white sm:self-auto">Report an animal <ArrowUpRight size={14}/></Link>
  </header>

  <div className="border-b border-[#0b1e3d]/10 py-5 text-sm text-[#0b1e3d]/60">{stories.length} recent rescue stories</div>

  <StorySection title="Recent cases" lede="Completed cases with a recorded issue, care, outcome and date." stories={stories} empty="No completed rescue stories are published yet."/>
 </div></main></AppShell>;
}
function StorySection({title,lede,stories,empty}:{title:string;lede:string;stories:Story[];empty:string}){
 return <section className="mt-10"><div className="grid gap-2 border-b border-[#0b1e3d]/10 pb-4 sm:grid-cols-[220px_1fr_auto] sm:items-end"><h2 className="text-2xl font-semibold tracking-[-.035em]">{title}</h2><p className="text-sm opacity-45">{lede}</p><span className="text-xs tabular-nums opacity-35">{stories.length}</span></div>{stories.length?<div>{stories.map((story,i)=><StoryRow key={story.dogId} story={story} index={i}/>)}</div>:<p className="py-9 text-sm opacity-45">{empty}</p>}</section>
}
function StoryRow({story,index}:{story:Story;index:number}){
 const row=story.latest,name=row.animal_name||row.animal_code||"Animal record",category=rescueCategory({subtype:row.category,title:row.title,detail:row.outcome}),status="Completed";
 return <Link href={`/dog/${story.dogId}`} className="group grid gap-5 border-b border-[#0b1e3d]/10 py-6 md:grid-cols-[minmax(220px,34%)_1fr_auto] md:items-center">
  <DogPhoto src={row.cover_photo} alt={name} seed={story.dogId} tone={story.active?"active":"resolved"} className="aspect-[16/9] w-full rounded-xl object-cover"/>
  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em]"><span className={story.active?"text-[#f05b40]":"text-[#46755a]"}>{status}</span><span className="opacity-20">·</span><span className="opacity-45">{category}</span></div><h3 className="mt-2 text-2xl font-semibold tracking-[-.035em]">{name}</h3><p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 opacity-55">{row.title||"Rescue record"}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs opacity-40"><span className="inline-flex items-center gap-1"><MapPin size={11}/>{row.zone||row.ngo_name||"Location recorded"}</span><span>{story.cases.length} rescue record{story.cases.length===1?"":"s"}</span><span>{story.careCount} care event{story.careCount===1?"":"s"}</span><span>{formatDate(row.resolved_at||row.occurred_at)}</span></div>{story.outcome&&<p className="mt-2 line-clamp-1 text-xs opacity-45">Outcome: {story.outcome}</p>}</div>
  <div className="hidden items-center gap-3 md:flex"><span className="text-[10px] tabular-nums opacity-20">0{index+1}</span><ArrowUpRight size={17} className="opacity-20 transition group-hover:opacity-70"/></div>
 </Link>
}
