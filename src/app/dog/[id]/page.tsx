import { AppShell } from "@/components/app/AppShell";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cache } from "react";
import { PageView } from "@/components/analytics/PageView";
import { LivingRecord } from "@/components/animal/LivingRecord";
import { buildLiving } from "@/lib/animal/living";
import { getDogProfile, getDogById } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { dogLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";
const readIdentity = cache(getDogById);
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) notFound();
  const dog = await readIdentity(id).catch(() => undefined);
  if (dog === null) notFound();
  const name = dog ? dogLabel(dog) : "Dog record";
  return {
    title: `${name}, StrayPaw`,
    description: `Recorded sightings, care, follow-ups and documented outcomes for ${name}${dog?.city ? ` in ${dog.city}` : ""}. Individual dog record ${id}.`,
    alternates: { canonical: `/dog/${id}` },
    openGraph: { title: "Animal record, StrayPaw", type: "article", url: `/dog/${id}` },
  };
}

function ProfileShell({ unavailable = false, id }: { unavailable?: boolean; id?: string }) {
  return <main className="min-h-dvh bg-[#f3ede4] px-6 py-10 text-[#0b1e3d]"><a href="/app" className="font-mono text-xs uppercase tracking-[0.16em]">StrayPaw</a><h1 className="mt-10 font-serif text-4xl">Animal record</h1><p className="mt-3 max-w-lg">{unavailable ? "This record service is temporarily unavailable. No data has been changed." : "Loading this individual record and its bounded care history."}</p>{unavailable && id ? <a href={`/dog/${id}`} className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.16em] underline">Try again</a> : null}</main>;
}

async function DogProfileContent({ id }: { id: string }) {
  let profile;
  let operational;
  let identity;
  try {
    [profile, operational, identity] = await Promise.all([
      getDogProfile(id),
      getProfileOperationalRecord(id),
      getPublicAnimalIdentity(id),
    ]);
  } catch {
    return <ProfileShell unavailable id={id} />;
  }
  if (!profile) notFound();
  const record = await buildLiving(profile, operational, identity);

  const { dog } = profile;
  const label = record.label;

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PageView name="animal_viewed" props={{ observations: profile.sightings.length }} />
      <AppShell><LivingRecord r={record} scope="public" /></AppShell>
    </>
  );
}


export default async function DogProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) notFound();
  // Resolve existence before streaming a 200 response. A missing record is
  // a real 404; an unavailable database remains a separate recovery state.
  const dog = await readIdentity(id).catch(() => undefined);
  if (dog === null) notFound();
  if (dog === undefined) return <ProfileShell unavailable id={id} />;
  return <Suspense fallback={<ProfileShell />}><DogProfileContent id={id} /></Suspense>;
}
