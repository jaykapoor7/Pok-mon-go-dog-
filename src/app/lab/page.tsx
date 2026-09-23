import Link from "next/link";
import { DIRECTIONS, SCREENS } from "@/components/lab/screens";
import { LAB, fmt } from "@/components/lab/data";

export default function LabIndex() {
  const t = LAB.totals;
  return (
    <main className="lab-index">
      <header>
        <p>StrayPaw · design lab · not production</p>
        <h1>Three directions for the living record.</h1>
        <p className="sub">Each is built against the same snapshot of the public record ({fmt(t.animals)} animals, {fmt(t.fieldEvents)} field records, {fmt(t.cases)} cases, {fmt(t.sightingPhotos)} real photographs, 23 Sep 2026). Nothing in them is invented.</p>
      </header>
      <ol>
        {DIRECTIONS.map((d) => (
          <li key={d.id}>
            <div className="lab-dir"><b>{d.letter}</b><h2>{d.name}</h2><p>{d.line}</p></div>
            <nav>{SCREENS.map((s) => <Link key={s.id} href={`/lab/${d.id}/${s.id}`}>{s.name} →</Link>)}</nav>
          </li>
        ))}
      </ol>
    </main>
  );
}
