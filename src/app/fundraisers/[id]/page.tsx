import { notFound } from "next/navigation";
import { getFundraiserById, getFundraiserUpdates } from "@/lib/fundraisers";
import { getOrgById } from "@/lib/data";
import { PubPage } from "@/sp4/pub/kit";
import { FundraiserView } from "@/sp4/pub/fundraisers/Fundraisers";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await getFundraiserById(id).catch(() => null);
  if (!f || (f.status !== "active" && f.status !== "closed")) return { title: "Fundraiser not found, StrayPaw" };
  return {
    title: `${f.title}, StrayPaw`,
    description: f.story?.slice(0, 150) ?? `Support ${f.created_by_name ?? "a rescue"} on StrayPaw.`,
    ...(f.cover_photo ? { openGraph: { images: [f.cover_photo] } } : {}),
  };
}

export default async function FundraiserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await getFundraiserById(id).catch(() => null);
  if (!f || (f.status !== "active" && f.status !== "closed")) notFound();
  const [org, updates] = await Promise.all([
    f.ngo_id ? getOrgById(f.ngo_id).catch(() => null) : Promise.resolve(null),
    getFundraiserUpdates(f.id).catch(() => []),
  ]);
  return <PubPage><FundraiserView f={f} org={org} updates={updates} /></PubPage>;
}
