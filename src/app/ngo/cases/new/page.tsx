import { NewCase } from "@/sp/ngo/NewCase";

export const dynamic = "force-dynamic";
export const metadata = { title: "New case, StrayPaw NGO", robots: { index: false, follow: false } };
export default async function NgoNewCasePage({ searchParams }: { searchParams: Promise<{ dog?: string }> }) {
  const { dog } = await searchParams;
  return <NewCase dogId={dog ?? null} />;
}
