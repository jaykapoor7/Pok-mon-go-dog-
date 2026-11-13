import { Review } from "@/sp/ngo/Review";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review, StrayPaw NGO", robots: { index: false, follow: false } };
export default async function NgoReviewPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const { cohort } = await searchParams;
  return <Review initial={cohort === "history" || cohort === "reason" ? cohort : "decide"} />;
}
