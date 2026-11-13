import { Programme } from "@/sp/ngo/Programme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Programme, StrayPaw NGO", robots: { index: false, follow: false } };
export default async function NgoProgrammePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Programme id={id} />;
}
