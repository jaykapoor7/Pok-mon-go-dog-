import { CasePage } from "@/sp/ngo/CasePage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Case file, StrayPaw NGO", robots: { index: false, follow: false } };
export default async function NgoCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CasePage id={id} />;
}
