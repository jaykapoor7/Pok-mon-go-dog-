import { PlatformShell } from "@/components/platform/PlatformNav";
import { TakeActionClient } from "@/components/platform/TakeActionClient";

/* Named for what it does rather than what it asks of you. "Take action"
   sat beside "How you can help" and "Volunteer" and none of the three
   said which was which; this one is the data-driven one, by place. */
export const dynamic = "force-static";
export const metadata = {
  title: "What an area needs, StrayPaw",
  description:
    "Pick a place and see what its own data says it needs, which organisations already work there, and what would help most.",
};

export default function TakeActionPage() {
  return <PlatformShell><TakeActionClient /></PlatformShell>;
}
