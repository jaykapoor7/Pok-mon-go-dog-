import { PackageView } from "@/sp/abc/PackageView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Package review, StrayPaw Municipality", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PackageView id={id} side="reviewer" />;
}
