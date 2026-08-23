import { notFound } from "next/navigation";
import { getCaseById } from "@/lib/cases";
import { CaseWorkspace } from "@/components/cases/CaseWorkspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCaseById(id);
  return { title: data ? `${data.case.title}, StrayPaw Partner` : "Case not found" };
}

export default async function PartnerCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCaseById(id);
  if (!data) notFound();
  return <CaseWorkspace c={data.case} updates={data.updates} backHref="/partner/cases" bare />;
}
