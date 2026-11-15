import type { Metadata } from "next";
import { Programmes } from "@/nx/pages/ngo/Programmes";
export const metadata: Metadata = { title: "Programmes, StrayPaw" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; title?: string; case?: string }> }) {
  const p = await searchParams;
  return <Programmes tab={p.tab ?? null} title={p.title ?? null} caseId={p.case ?? null} />;
}
