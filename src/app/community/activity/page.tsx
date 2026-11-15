import { PubPage } from "@/sp4/pub/kit";
import { Activity } from "@/sp4/pub/community/Activity";

export const metadata = { title: "My activity, StrayPaw", robots: { index: false, follow: false } };

export default function ActivityPage() {
  return <PubPage><Activity /></PubPage>;
}
