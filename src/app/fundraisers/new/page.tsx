import { PartnerGate } from "@/components/partner/PartnerGate";
import { NewFundraiserForm } from "@/components/fundraisers/NewFundraiserForm";

export const metadata = { title: "Start a fundraiser — StrayPaw" };

export default function NewFundraiserPage() {
  return (
    <PartnerGate title="Start a fundraiser">
      <NewFundraiserForm />
    </PartnerGate>
  );
}
