import { notFound } from "next/navigation";
import { PageView } from "@/components/analytics/PageView";
import { UnifiedAnimalProfile } from "@/components/dog/UnifiedAnimalProfile";
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
    alternates: { canonical: `/dog/${id}` },
    openGraph: { title, description, images, type: "article", url: `/dog/${id}` },
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

  const { dog } = profile;
  const label = dogLabel(dog);

  /* Structured data so a record is citable rather than merely readable: a
     search engine, a journalist or a municipal officer can see what this
     page is a record of, when it was last updated, and who keeps it.

     Deliberately no coordinates. The site tells people locations are
     approximate and that sensitive detail stays private, so the locality is
     as precise as this gets; publishing a machine-readable pin for a living
     animal would undo that promise in the one format that is trivial to
     scrape. Reporter identity is never included for the same reason. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: label,
    description: `Rescue, care, follow-ups and outcome recorded for ${label}.`,
    ...(dog.cover_photo ? { image: [dog.cover_photo] } : {}),
    ...(identity?.straypaw_id ? { identifier: identity.straypaw_id } : {}),
    ...(dog.last_seen ? { dateModified: new Date(dog.last_seen).toISOString() } : {}),
    about: {
      "@type": "Thing",
      name: label,
      ...(dog.species ? { additionalType: String(dog.species) } : {}),
    },
    ...(dog.zone
      ? { contentLocation: { "@type": "Place", name: dog.zone, address: { "@type": "PostalAddress", addressLocality: dog.zone, addressCountry: "IN" } } }
      : {}),
    isPartOf: {
      "@type": "Dataset",
      name: "The StrayPaw register",
      description: "A shared, public record of India's street animals.",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageView name="animal_viewed" props={{ observations: profile.sightings.length }} />
      <UnifiedAnimalProfile profile={profile} cases={cases} operational={operational} identity={identity} />
    </>
  );
}
