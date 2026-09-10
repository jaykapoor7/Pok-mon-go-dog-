import { NewCaseForm } from "@/components/partner/NewCaseForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New case - StrayPaw Partner" };

export default async function PartnerNewCasePage({ searchParams }: { searchParams: Promise<{ dogId?: string }> }) {
  const { dogId } = await searchParams;
  return <NewCaseForm presetDogId={dogId} />;
}
