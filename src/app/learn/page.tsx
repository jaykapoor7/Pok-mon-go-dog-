import { PubPage } from "@/sp4/pub/kit";
import { Academy } from "@/sp4/pub/learn/Learn";

export const metadata = {
  title: "Learning Academy, StrayPaw",
  description: "Short, free lessons with an exercise in each: reading a map of street animals, staying safe, how populations change, and reporting well.",
};

export default function LearnPage() {
  return <PubPage><Academy /></PubPage>;
}
