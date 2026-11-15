import type { Metadata } from "next";
import { Submissions } from "@/nx/pages/Submissions";
export const metadata: Metadata = { title: "Submissions & Reports, StrayPaw" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; stage?: string }> }) {
  const { tab, stage } = await searchParams;
  return <Submissions tab={tab ?? null} stage={stage ?? null} />;
}
