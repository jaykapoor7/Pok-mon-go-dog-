import { notFound } from "next/navigation";
import { getDogProfile } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { buildLiving } from "@/lib/animal/living";
import { LivingRecord } from "@/components/animal/LivingRecord";
import { OrgTools } from "@/components/animal/OrgTools";

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
  return <LivingRecord r={r} scope="org" org={<OrgTools dog={profile.dog} photos={r.photos} />} />;
}
