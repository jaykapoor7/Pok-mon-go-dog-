import { VolunteersClient } from "@/components/partner/VolunteersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Volunteer sign-ups, StrayPaw Partner" };

export default function PartnerVolunteersPage() {
  return <VolunteersClient />;
}
