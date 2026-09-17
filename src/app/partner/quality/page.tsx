import { DataQualityClient } from "@/components/partner/DataQualityClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data quality, StrayPaw Partner" };

export default function PartnerQualityPage(){
  return <DataQualityClient />;
}
