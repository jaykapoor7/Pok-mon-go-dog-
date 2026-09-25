import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PlatformShell } from "@/components/platform/PlatformNav";
import "./learn.css";

export const dynamic = "force-static";
export const metadata = {
  title: "Lessons, StrayPaw",
  description: "Four short lessons on living alongside street dogs: coexistence, Animal Birth Control, what to do after a bite, and what the law says.",
};

/* The educator's home: four lessons short enough to read aloud in a class.
   No statistics here; the published numbers, and why so few exist, are on
   /evidence. Each lesson ends on something a person can do on their own
   street. */
const LESSONS = [
  {
    id: "coexist",
    title: "Living alongside street dogs",
    body: "Most street dogs are community dogs: they live on the same few streets for years and are fed by the people there. A sterilised, vaccinated dog holds its territory and keeps unvaccinated newcomers out.",
    doThis: "If a dog growls or shows teeth, stand still, look away and give it room. Never corner, chase or hit a dog.",
  },
  {
    id: "abc",
    title: "What Animal Birth Control is",
    body: "Dogs are caught, sterilised, vaccinated against rabies and returned to the same street. It is the only method the law allows. Moving or killing dogs does not work: new, unvaccinated dogs fill the space.",
    doThis: "A notched ear means a dog has been sterilised. Report one you see, so the record knows it was reached.",
  },
  {
    id: "rabies",
    title: "After a bite or a scratch",
    body: "Rabies is almost always fatal once symptoms appear, and completely preventable before they do.",
    doThis: "Wash the wound with soap and running water for fifteen minutes, then go to a hospital for anti-rabies vaccination the same day.",
  },
  {
    id: "law",
    title: "What the law says",
    body: "The Prevention of Cruelty to Animals Act, 1960 makes it an offence to beat, torture or kill a street dog. The Animal Birth Control Rules, 2023 require every municipal body to sterilise and vaccinate community dogs. Feeding at reasonable times and places is legal.",
    doThis: "If you see cruelty, report it to your local police station and an animal-welfare organisation near you.",
  },
];

export default function LearnPage() {
  return (
    <PlatformShell>
      <div className="lsn">
        <header className="lsn-head">
          <h1>Four lessons, <em>one street at a time.</em></h1>
          <p>Short enough to read aloud in a class or a residents&rsquo; meeting.</p>
        </header>

        <ol className="lsn-list">
          {LESSONS.map((l, i) => (
            <li key={l.id} id={l.id}>
              <span className="lsn-n sys-mono">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2>{l.title}</h2>
                <p>{l.body}</p>
                <p className="lsn-do"><b>On your street</b>{l.doThis}</p>
              </div>
            </li>
          ))}
        </ol>

        <nav className="lsn-next" aria-label="Take the lesson further">
          <Link href="/map">Show the class their own streets <ArrowUpRight size={15} /></Link>
          <Link href="/evidence">The numbers, and why so few exist <ArrowUpRight size={15} /></Link>
        </nav>
      </div>
    </PlatformShell>
  );
}
