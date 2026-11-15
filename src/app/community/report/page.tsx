import { PubPage } from "@/sp4/pub/kit";
import { Report } from "@/sp4/pub/community/Report";

export const metadata = {
  title: "Report an animal, StrayPaw",
  description: "Report a street animal you saw, or one that needs help. A receipt records what you sent; it is not a rescue promise.",
};

export default function ReportPage() {
  return <PubPage className="pb-report"><Report /></PubPage>;
}
