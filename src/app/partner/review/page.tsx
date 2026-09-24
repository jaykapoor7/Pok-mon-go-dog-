import { CaseReview } from "@/components/partner/CaseReview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Case review, StrayPaw Partner" };

export default async function CaseReviewPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <CaseReview initialTab={tab === "reasons" ? "reasons" : "stale"} />;
}
