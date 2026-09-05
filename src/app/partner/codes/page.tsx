import { redirect } from "next/navigation";

/* Team and codes are one page now. Kept as a redirect because this URL is
   in invitation emails already sent. */
export default function PartnerCodesPage() {
  redirect("/partner/team");
}
