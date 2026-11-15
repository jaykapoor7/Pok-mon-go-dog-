import { notFound } from "next/navigation";
import { cache } from "react";
import { buildLiving } from "@/lib/animal/living";
import { getDogProfile, getDogById } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { dogLabel } from "@/lib/utils";
import { Body, Empty, Head, LinkBtn, PubPage } from "@/sp4/pub/kit";
import { AnimalRecord } from "@/sp4/pub/animal/AnimalRecord";

export const dynamic = "force-dynamic";
const readIdentity = cache(getDogById);
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) notFound();
  const dog = await readIdentity(id).catch(() => undefined);
  if (dog === null) notFound();
  const name = dog ? dogLabel(dog) : "Animal record";
  /* A shared link carries the safe public projection only: no photo that may
     show an injury, no coordinates, no reporter. */
  return {
    title: `${name}, StrayPaw`,
    description: `Recorded sightings, care, follow-ups and outcomes for ${name}${dog?.city ? ` in ${dog.city}` : ""}, with the source of every line.`,
    alternates: { canonical: `/animal/${id}` },
    openGraph: { title: `${name}, StrayPaw`, type: "article", url: `/animal/${id}`, images: [{ url: "/og.png", width: 1200, height: 630, alt: "StrayPaw" }] },
  };
}

function Unreadable({ title }: { title: string }) {
  return (
    <PubPage>
      <Head back="/community" title={title} />
      <Body><Empty alert title="Nothing has changed" action={<LinkBtn href="/community">Open the map</LinkBtn>}>The record could not be read just now. Reload in a moment.</Empty></Body>
    </PubPage>
  );
}

/* One animal, the public depth (decision 019). */
export default async function AnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) notFound();
  const dog = await readIdentity(id).catch(() => undefined);
  if (dog === null) notFound();
  if (dog === undefined) return <Unreadable title="The record service is unavailable" />;
  let living;
  try {
    const [profile, operational, identity] = await Promise.all([getDogProfile(id), getProfileOperationalRecord(id), getPublicAnimalIdentity(id)]);
    if (!profile) notFound();
    living = await buildLiving(profile, operational, identity);
  } catch (e) {
    /* notFound() throws a control-flow error that must reach Next. */
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_")) throw e;
    return <Unreadable title="This record could not be read" />;
  }
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: living.label, ...(living.straypawId ? { identifier: living.straypawId } : {}), ...(living.lastSeen ? { dateModified: new Date(living.lastSeen).toISOString() } : {}), isPartOf: { "@type": "Dataset", name: "The StrayPaw register" } };
  return (
    <PubPage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <AnimalRecord r={living} ngoId={dog?.ngo_id ?? null} />
    </PubPage>
  );
}
