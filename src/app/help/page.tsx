import { HelpClient } from "@/components/help/HelpClient";
import { getAllDogs } from "@/lib/data";

export const metadata = {
  title: "Help a dog — StrayPaw",
  description:
    "Dogs near you who need help. Volunteer to feed, foster, transport or get them vet care — or register your NGO.",
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const dogs = await getAllDogs();
  return <HelpClient dogs={dogs} />;
}
