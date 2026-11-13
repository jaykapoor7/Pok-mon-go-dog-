import { Report } from "@/sp/community/Report";

export const metadata = {
  title: "Report an animal, StrayPaw",
  description: "Report a street animal you saw, or one that needs help. A receipt records what you sent; it is not a rescue promise.",
};

export default function ReportPage() {
  return <Report />;
}
