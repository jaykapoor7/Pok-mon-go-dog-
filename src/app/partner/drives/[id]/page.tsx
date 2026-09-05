import { DriveDetail } from "@/components/partner/DriveDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Drive, StrayPaw Partner" };

export default async function PartnerDrivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DriveDetail id={id} />;
}
