import { getFundraisers } from "@/lib/fundraisers";
import { PubPage } from "@/sp4/pub/kit";
import { FundraiserList } from "@/sp4/pub/fundraisers/Fundraisers";

export const metadata = {
  title: "Fundraisers, StrayPaw",
  description: "Back verified street-dog rescues in India: vet bills, sterilisation drives and emergencies. Donations go directly to each NGO.",
};

export const dynamic = "force-dynamic";

export default async function FundraisersPage() {
  const list = await getFundraisers().catch(() => []);
  return <PubPage><FundraiserList list={list} /></PubPage>;
}
