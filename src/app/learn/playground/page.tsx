import { PubPage } from "@/sp4/pub/kit";
import { Playground } from "@/sp4/pub/learn/Learn";

export const metadata = { title: "Playground, StrayPaw Academy", description: "Teaching models with invented numbers: a model street and the precision lens. Never a forecast." };

export default function PlaygroundPage() {
  return <PubPage><Playground /></PubPage>;
}
