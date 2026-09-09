import { redirect } from "next/navigation";

/**
 * Adoption is currently surfaced through the verified organisation directory.
 * Keep the public search destination alive while there is no separate listing
 * surface to send people to.
 */
export default function AdoptPage() {
  redirect("/orgs");
}
