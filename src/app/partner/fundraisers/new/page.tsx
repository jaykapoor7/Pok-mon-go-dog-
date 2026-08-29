import { NewFundraiserForm } from "@/components/fundraisers/NewFundraiserForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New campaign - StrayPaw Partner" };

export default function PartnerNewFundraiserPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <NewFundraiserForm />
    </div>
  );
}
