import { CaseFile } from "@/components/casefile/CaseFile";

export const dynamic = "force-dynamic";
// The case is read in the browser, under the member's own session: the
// server has none, and cases are only readable by the organisation that
// holds them. So the title cannot name the case.
export const metadata = { title: "Case, StrayPaw Partner" };

export default async function PartnerCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseFile id={id} />;
}
