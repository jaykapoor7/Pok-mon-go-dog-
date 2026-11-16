import { Noto_Sans_Kannada } from "next/font/google";
import { OneHealthStory } from "@/sp/demo/onehealth/OneHealthStory";

/* The One Health product demo for grant panels and partners: one dog bite followed from a Kannada call through the
   hospital, the veterinary team and NGO, the municipality and researchers, with Kaju alongside. Illustrative from
   start to finish; it reads no database and needs no sign-in, so it runs the same on every deployment. */

const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], weight: ["400", "500", "600"], variable: "--ohd-kn", display: "swap" });

export const metadata = {
  title: "One Health demo, StrayPaw",
  description: "One dog bite followed through a city One Health programme: a citizen's Kannada report, the hospital's PEP pathway, the veterinary team, the municipality and researchers, with Kaju coordinating. Illustrative data.",
  robots: { index: false, follow: false },
};

export default function OneHealthDemoPage() {
  return <div className={kannada.variable}><OneHealthStory /></div>;
}
