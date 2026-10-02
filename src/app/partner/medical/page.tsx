import { MedicalClient } from "@/components/partner/MedicalClient";
import { DeskHeader } from "@/components/app/DeskHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Medical, StrayPaw Partner" };

export default function PartnerMedicalPage() {
  return (
    <div>
      <DeskHeader
        kicker="Records · care"
        title="Care records"
        lede="Treatment, vaccination and field care in date order, always attached to the animal it was given to."
      />
      <MedicalClient />
    </div>
  );
}
