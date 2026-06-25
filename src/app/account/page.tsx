import { AccountClient } from "@/components/account/AccountClient";

export const metadata = {
  title: "Your sightings — StrayPaw Delhi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return <AccountClient />;
}
