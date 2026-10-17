import { Help } from "@/sp/community/more/Help";
import { getNeedsHelpDogs } from "@/lib/data";

export const revalidate = 300;
export const metadata = { title: "If an animal needs help, StrayPaw", description: "What to do now for an injured or distressed street animal: four steps, rescue helplines, and what to do after a bite." };
export default async function HelpPage() {
  const dogs = await getNeedsHelpDogs(12).catch(() => []);
  return <Help flagged={dogs} />;
}
