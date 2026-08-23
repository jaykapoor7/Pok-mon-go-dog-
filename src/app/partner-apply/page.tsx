import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PartnerApplyForm } from "@/components/partner/PartnerApplyForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Apply to partner, StrayPaw",
  description: "Apply for a StrayPaw partnership. Tell us about your organisation, upload your documents, and we'll get in touch. Free for verified animal-welfare organisations.",
};

export default function PartnerApplyPage() {
  return (
    <MarketingShell
      eyebrow="Partnerships"
      title="Apply to partner with StrayPaw."
      intro="Tell us about your organisation and how you'd use StrayPaw, and upload anything that helps us verify you. We review every application and get in touch personally. It's free for verified partners."
    >
      <PartnerApplyForm />
    </MarketingShell>
  );
}
