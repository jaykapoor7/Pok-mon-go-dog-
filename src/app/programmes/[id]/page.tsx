import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { getPublicProgramme, programmeCategory, programmeCompletedTotal, programmePrimaryTotal } from "@/lib/public-programmes";

export const dynamic = "force-dynamic";

function date(value:string|null){return value?new Date(`${value}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"Not recorded"}

export default async function ProgrammePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const programme=await getPublicProgramme(id);
 if(!programme)notFound();
 const category=programmeCategory(programme),total=programmePrimaryTotal(programme),completed=programmeCompletedTotal(programme);
 return <AppShell><main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/programmes" className="inline-flex items-center gap-2 text-sm font-semibold opacity-70"><ArrowLeft size={15}/>Programmes</Link><header className="mt-6 border-b border-black/[.1] pb-7"><span className="product-kicker">{category.replace(/_/g," ")}</span><h1 className="mt-2 text-3xl font-semibold tracking-tight">{programme.name}</h1><p className="mt-2 text-sm opacity-65">{programme.ngo_name}{programme.city?` · ${programme.city}`:""}{programme.state?`, ${programme.state}`:""}</p>{programme.public_summary&&<p className="mt-5 max-w-3xl text-base leading-7">{programme.public_summary}</p>}</header><section className="grid border-b border-black/[.1] sm:grid-cols-2"><Field label="Published record total" value={total.toLocaleString()}/><Field label="Completed / resolved" value={completed?completed.toLocaleString():"Not separately reported"}/><Field label="Start" value={date(programme.starts_on)}/><Field label="End" value={date(programme.ends_on)}/><Field label="Area" value={programme.zone||programme.city||"Not recorded"}/><Field label="Organisation" value={programme.ngo_name}/></section><section className="mt-9"><span className="product-kicker">How to read this</span><h2 className="mt-1 text-xl font-semibold">A programme total is not automatically an animal-level verification count.</h2><p className="mt-3 max-w-3xl text-sm leading-6 opacity-70">This page shows the published programme or historical-register total. Where StrayPaw has individually traceable animal records, those remain separate from aggregate programme coverage so the two are not silently treated as the same measurement.</p></section><div className="mt-8 flex flex-wrap gap-4"><Link href={programme.ngo_slug?`/org/${programme.ngo_slug}`:"/orgs"} className="inline-flex items-center gap-2 text-sm font-semibold text-[#2457ce]">View organisation <ArrowUpRight size={15}/></Link><Link href="/evidence" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2457ce]">Evidence standards <ArrowUpRight size={15}/></Link></div></main></AppShell>
}
function Field({label,value}:{label:string;value:string}){return <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-black/[.08] py-4 sm:px-2"><span className="text-xs opacity-55">{label}</span><b className="text-sm font-medium">{value}</b></div>}
