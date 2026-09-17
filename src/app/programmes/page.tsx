import { AppShell } from "@/components/app/AppShell";
import { PublicProgrammeBrowser } from "@/components/app/PublicProgrammeBrowser";
import { getPublicProgrammes } from "@/lib/public-programmes";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Programmes and registers, StrayPaw",
  description: "Published rescue, treatment, vaccination, sterilisation and field-programme evidence from animal-welfare organisations.",
};

export default async function ProgrammesPage({searchParams}:{searchParams:Promise<{kind?:string}>}){
 const params=await searchParams;
 const programmes=await getPublicProgrammes(250);
 return <AppShell><main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><header className="max-w-3xl pb-7"><span className="product-kicker">Public evidence</span><h1 className="mt-2 text-3xl font-semibold tracking-tight">Programmes & registers</h1><p className="mt-3 text-sm leading-6 opacity-70">Named field programmes and historical registers published by organisations. Search the work, then open a programme to see the organisation, dates, place, source-backed total and what the number represents.</p></header><PublicProgrammeBrowser programmes={programmes} initialKind={params.kind}/></main></AppShell>
}
