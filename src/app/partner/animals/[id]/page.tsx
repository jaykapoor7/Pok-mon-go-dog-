import { notFound } from "next/navigation";
import { getDogProfile } from "@/lib/data";
import { getCasesForDog } from "@/lib/cases";
import { AnimalRecord } from "@/components/partner/AnimalRecord";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getDogProfile(id);
  return { title: p ? `${p.dog.code ?? p.dog.name ?? "Animal"} — StrayPaw Partner` : "Animal not found" };
}

export default async function PartnerAnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, cases] = await Promise.all([getDogProfile(id), getCasesForDog(id)]);
  if (!profile) notFound();
  return <AnimalRecord dog={profile.dog} sightings={profile.sightings} cases={cases} />;
}
