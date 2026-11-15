import type { Metadata } from "next";
import { ProgrammeRecord } from "@/nx/pages/gov/Programme";
export const metadata: Metadata = { title: "Programme, StrayPaw" };
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  return <ProgrammeRecord slug={slug} tab={tab} />;
}
