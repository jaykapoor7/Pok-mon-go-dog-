import { Casefile } from "@/sp/ngo/Casefile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Casefile, StrayPaw NGO", robots: { index: false, follow: false } };
export default async function NgoCasefilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Casefile id={id} />;
}
