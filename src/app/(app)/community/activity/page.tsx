import { Activity } from "@/sp/community/Activity";

export const metadata = { title: "My Activity, StrayPaw", robots: { index: false, follow: false } };

export default function ActivityPage() {
  return <Activity />;
}
