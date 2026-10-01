import { notFound } from "next/navigation";
import { getDogProfile } from "@/lib/data";
import { getProfileOperationalRecord } from "@/lib/animal-profile-record";
import { getPublicAnimalIdentity } from "@/lib/animal-identity";
import { buildLiving } from "@/lib/animal/living";
import { PartnerAnimalRecord } from "@/components/animal/PartnerAnimalRecord";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dog record, StrayPaw Partner", robots: { index: false, follow: false } };

export default async function PartnerAnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  let published = null;
  try {
    const profile = await getDogProfile(id);
    if (profile) {
      const [operational, identity] = await Promise.all([getProfileOperationalRecord(id), getPublicAnimalIdentity(id)]);
      published = await buildLiving(profile, operational, identity);
    }
  } catch { /* The private record remains available under its member session. */ }
  return <PartnerAnimalRecord id={id} published={published} />;
}
