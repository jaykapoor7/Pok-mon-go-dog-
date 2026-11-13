import { VerificationCase } from "@/sp/abc/VerificationCase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verification, StrayPaw NGO", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VerificationCase id={id} />;
}
