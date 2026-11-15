import type { Metadata } from "next";
import { flagOn } from "@/lib/flags";
import { Training } from "@/nx/pages/ngo/Training";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Training, StrayPaw" };
/* Training ships switched off; the page says so plainly unless this deployment lists training_lms. */
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <Training on={flagOn("training_lms")} tab={tab ?? null} />;
}
