import { FeederWorkspace } from "@/components/feeding/FeederWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "My patch, StrayPaw", robots: { index: false, follow: false } };

export default function FeederPage() {
  return <FeederWorkspace />;
}
