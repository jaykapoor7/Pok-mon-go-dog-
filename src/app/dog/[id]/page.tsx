import { notFound } from "next/navigation";
import { PageView } from "@/components/analytics/PageView";
import { AnimalStoryProfile } from "@/components/dog/AnimalStoryProfile";
import { getDogProfile } from "@/lib/data";
import { getCasesForDog } from "@/lib/cases";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { dogLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getDogProfile(id);
  if (!profile) return { title: "Animal not found, StrayPaw" };
  const { dog } = profile;
  const label = dogLabel(dog);
  const title = `${label}, StrayPaw`;
  const description = `${label}'s StrayPaw story: rescue, care, follow-ups and outcome in one longitudinal record.`;
  const images = dog.cover_photo ? [dog.cover_photo] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, images, type: "article" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function DogProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, cases, operational, identity] = await Promise.all([
    getDogProfile(id),
    getCasesForDog(id),
    getProfileOperationalRecord(id),
    getPublicAnimalIdentity(id),
  ]);
  if (!profile) notFound();

  return (
    <>
      <PageView name="animal_viewed" props={{ observations: profile.sightings.length }} />
      <AnimalStoryProfile profile={profile} cases={cases} operational={operational} identity={identity} />
    </>
  );
}
