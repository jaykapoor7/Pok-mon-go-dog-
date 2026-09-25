import { notFound } from "next/navigation";
import { getDogProfile } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { buildLiving } from "@/lib/animal/living";
import { LivingRecord } from "@/components/animal/LivingRecord";
import { OrgTools } from "@/components/animal/OrgTools";
import { WorkTrail, type TrailStep } from "@/components/partner/WorkTrail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getDogProfile(id);
  return { title: p ? `${p.dog.code ?? p.dog.name ?? "Animal"}, StrayPaw Partner` : "Animal not found" };
}

/* The organisation's view of an animal: the same living record the public
   sees, with the organisation's cases, care logging, notes and edits as
   their own island, read under the member's session. */
export default async function PartnerAnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, operational, identity] = await Promise.all([getDogProfile(id), getProfileOperationalRecord(id), getPublicAnimalIdentity(id)]);
  if (!profile) notFound();
  const r = await buildLiving(profile, operational, identity);
  const openCase = r.cases.find((c) => c.statusClass === "open" || c.statusClass === "in_progress");
  const lastCase = openCase ?? r.cases[r.cases.length - 1];
  const cared = r.events.some((e) => e.lane === "care");
  const done: TrailStep[] = ["dashboard", ...(lastCase ? ["case" as const] : []), ...(cared ? ["care" as const] : []), ...(lastCase && !openCase ? ["outcome" as const] : [])];
  const trail = (
    <WorkTrail at="animal" done={done}
      links={{ dashboard: "/partner", case: lastCase ? `/partner/cases/${lastCase.id}` : `/partner/cases/new?dogId=${id}`, care: "#org-care", outcome: openCase ? `/partner/cases/${openCase.id}#cf-next` : undefined }}
      next={openCase ? (cared ? { label: "Decide the case outcome", href: `/partner/cases/${openCase.id}#cf-next` } : { label: "Record care", href: "#org-care" }) : { label: "Open a case", href: `/partner/cases/new?dogId=${id}` }} />
  );
  return <LivingRecord r={r} scope="org" trail={trail} org={<OrgTools dog={profile.dog} photos={r.photos} />} />;
}
