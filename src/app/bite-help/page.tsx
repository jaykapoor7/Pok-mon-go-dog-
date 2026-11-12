import Link from "next/link";
import { notFound } from "next/navigation";
import { flagOn } from "@/lib/flags";
import { DocPage } from "@/sp4/site/kit";
import { BiteFinder } from "@/oh/BiteFinder";
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
      <p className="bh-proto" role="note"><b>Prototype.</b> This page is awaiting clinical review and is not yet public. Do not rely on it in place of medical advice.</p>

      <section className="bh-urgent" aria-labelledby="bh-now">
        <h2 id="bh-now">Get emergency help now if</h2>
        <ul>
          <li>the wound is bleeding heavily or is deep,</li>
          <li>there are several bites, or bites on the face, head, neck or hands,</li>
          <li>the person bitten is a young child, or is unwell or unable to care for themselves.</li>
        </ul>
        <p className="bh-call">Call <a href="tel:108">108</a> for an ambulance, or <a href="tel:112">112</a> for emergencies.</p>
      </section>

      <h2>Right away: wash the wound</h2>
      <ol className="bh-steps">
        <li><b>Wash it with soap and running water for at least 15 minutes.</b> Do this for every bite or scratch, and for a lick on broken skin. Washing straight away matters.</li>
        <li><b>Apply an antiseptic</b> such as povidone-iodine if you have it.</li>
        <li><b>Leave the wound open</b> or cover it loosely. Do not stitch or bandage it tightly.</li>
      </ol>

      <h2>The same day: see a doctor</h2>
      <ol className="bh-steps" start={4}>
        <li><b>Go to a government hospital or anti-rabies clinic today,</b> even if the wound looks small or the animal seemed healthy. A doctor decides whether you need anti-rabies vaccine and, for some wounds, immunoglobulin.</li>
        <li><b>Complete every dose</b> on the dates the doctor gives you, and keep your vaccination card.</li>
        <li><b>Tell the doctor</b> when and where it happened and what the animal looked like.</li>
      </ol>

      <h2>Do not</h2>
      <ul className="bh-dont">
        <li>put chilli, turmeric, oil, lime, herbs or any home remedy on the wound,</li>
        <li>wait to see whether the animal becomes ill before seeing a doctor,</li>
        <li>try to catch, hurt or kill the animal.</li>
      </ul>

      <h2>Where to go</h2>
      {process.env.NEXT_PUBLIC_OH_PUBLIC_PROGRAMME
        ? <BiteFinder slug={process.env.NEXT_PUBLIC_OH_PUBLIC_PROGRAMME} />
        : <p>Verified anti-rabies vaccine centres for Bengaluru will be listed here once the health department confirms them. Until then, go to the nearest government hospital.</p>}

      <h2>About the animal</h2>
      <p>If you know where the animal is, <Link href="/community/report">report it</Link> with the place and a description so a local team can check on it. Do not approach it.</p>

      <p className="bh-src">First-aid steps follow the World Health Organization&apos;s guidance on rabies post-exposure care and India&apos;s National Rabies Control Programme. StrayPaw does not assess risk, diagnose rabies or recommend treatment.</p>
    </DocPage>
  );
}
