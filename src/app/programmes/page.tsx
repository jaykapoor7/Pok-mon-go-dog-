import { AppShell } from "@/components/app/AppShell";
import { DeskHeader } from "@/components/app/DeskHeader";
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
 return (
  <AppShell>
   <div className="dk-page">
    <DeskHeader
     kicker="Public evidence · programmes"
     title={<>Programmes &amp; registers</>}
     lede="Named field programmes and historical registers published by organisations. Open one to see who ran it, when, where, the source-backed total and what that number represents."
     figures={[{ label: programmes.length === 1 ? "programme published" : "programmes published", value: programmes.length }]}
    />
    <PublicProgrammeBrowser programmes={programmes} initialKind={params.kind}/>
   </div>
  </AppShell>
 );
}
