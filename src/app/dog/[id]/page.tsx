import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageView } from "@/components/analytics/PageView";
import { LivingRecord } from "@/components/animal/LivingRecord";
import { buildLiving } from "@/lib/animal/living";
import { getDogProfile } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { dogLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: "Animal record, StrayPaw",
    description: "A StrayPaw animal record: care, follow-ups and outcome in one longitudinal history.",
    alternates: { canonical: `/dog/${id}` },
    openGraph: { title: "Animal record, StrayPaw", type: "article", url: `/dog/${id}` },
  };
}

function ProfileShell() {
  return <main className="min-h-dvh bg-[#f3ede4] px-6 py-10 text-[#0b1e3d]"><a href="/app" className="font-mono text-xs uppercase tracking-[0.16em]">StrayPaw</a><h1 className="mt-10 font-serif text-4xl">Animal record</h1><p className="mt-3 max-w-lg">Loading this individual record and its bounded care history.</p></main>;
}

async function DogProfileContent({ id }: { id: string }) {
  const [profile, operational, identity] = await Promise.all([
    getDogProfile(id),
    getProfileOperationalRecord(id),
    getPublicAnimalIdentity(id),
  ]);
  if (!profile) notFound();
  const record = await buildLiving(profile, operational, identity);

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
      description: "One shared record connecting sightings, field work and outcomes for India's street animals.",
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
      <LivingRecord r={record} scope="public" />
    </>
  );
}
\n\nexport default async function DogProfilePage({ params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  return <Suspense fallback={<ProfileShell />}><DogProfileContent id={id} /></Suspense>;\n}\n