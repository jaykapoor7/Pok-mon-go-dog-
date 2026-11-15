import { PubPage } from "@/sp4/pub/kit";
import { Workshops } from "@/sp4/pub/learn/Workshops";

export const metadata = { title: "Workshops, StrayPaw Academy", description: "Session plans built from StrayPaw's lessons, and classroom material by The Kind Hour Foundation, credited and linked." };

export default function WorkshopsPage() {
  return <PubPage><Workshops /></PubPage>;
}
