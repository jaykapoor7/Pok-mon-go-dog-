import { notFound } from "next/navigation";
import { flagOn } from "@/lib/flags";
import { DocPage } from "@/sp4/site/kit";
import { BiteChat } from "@/oh/BiteChat";
import "./bite-help.css";

/* Bite or scratch help: a prototype for the Bengaluru pilot.
   Off unless the citizen_bite_assist flag is on, and never for the public
   until a qualified public-health reviewer has approved the wording and the
   health department has supplied a verified list of anti-rabies vaccine
   centres. It gives first aid and tells people to see a doctor the same day;
   it never assesses risk, diagnoses rabies or suggests a treatment. */

export const dynamic = "force-dynamic";
export const metadata = { title: "Bitten or scratched by an animal, StrayPaw", robots: { index: false, follow: false } };

export default function BiteHelpPage() {
  if (!flagOn("citizen_bite_assist")) notFound();
  return (
    <DocPage title="Bitten or scratched by an animal" eyebrow="Help after a bite">
      <BiteChat slug={process.env.NEXT_PUBLIC_OH_PUBLIC_PROGRAMME ?? null} />
      <p className="bh-src">Prototype, awaiting clinical review. First aid follows WHO rabies guidance and India&apos;s National Rabies Control Programme. These are fixed steps: nothing here is read by an AI, assesses risk or recommends treatment.</p>
    </DocPage>
  );
}
