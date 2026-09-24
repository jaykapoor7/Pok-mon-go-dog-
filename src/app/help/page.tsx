import { HelpClient } from "@/components/help/HelpClient";
import { getNeedsHelpDogs } from "@/lib/data";

export const metadata = {
  title: "Help a dog, StrayPaw",
  description:
    "Dogs near you who need help. Volunteer to feed, foster, transport or get them vet care, or register your NGO.",
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  /* Only the animals flagged as needing help: the page lists nothing else. */
  const dogs = await getNeedsHelpDogs();
  return <HelpClient dogs={dogs} />;
}
