import { notFound } from "next/navigation";
import { flagOn } from "@/lib/flags";
import { BiteHelp } from "@/oh/BiteChat";
import "./bite-help.css";

/* Bite or scratch help with Kaju, chat or call: a prototype for the Bengaluru pilot.
   Off unless the citizen_bite_assist flag is on, and never for the public
   until a qualified public-health reviewer has approved the wording and the
   health department has supplied a verified list of anti-rabies vaccine
   centres. It gives first aid and tells people to see a doctor the same day;
   it never assesses risk, diagnoses rabies or suggests a treatment. */

export const dynamic = "force-dynamic";
export const metadata = { title: "Kaju: help after a dog bite, StrayPaw", robots: { index: false, follow: false } };

export default function BiteHelpPage() {
  if (!flagOn("citizen_bite_assist")) notFound();
  return <BiteHelp slug={process.env.NEXT_PUBLIC_OH_PUBLIC_PROGRAMME ?? null} />;
}
