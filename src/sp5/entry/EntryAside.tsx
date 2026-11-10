/* The right-hand panel of sign-in, join and access.

   The idea behind the door: a person arriving here should recognise their
   own place on the record before they type anything. So instead of product
   news, the panel shows the record line with the four people who keep it,
   each with the one thing they do. No carousel, nothing to read twice.
   The line draws once; under reduced motion it is simply there. */

import "./entry5.css";

const PEOPLE: [string, string, string][] = [
  ["Field team", "Captures the report, the photo and the place", "Report"],
  ["Veterinarian", "Signs each procedure in their own name", "Sign-off"],
  ["Coordinator", "Approves the evidence and sends the package", "Package"],
  ["Municipal office", "Checks every line and decides", "Decision"],
];

export function EntryAside() {
  return (
    <aside className="s9-aside" aria-label="Who works in StrayPaw">
      <p className="s9-aside-k">One record, kept by four people</p>
      <ol className="s9-line">
        {PEOPLE.map(([who, what, tag], i) => (
          <li key={who} style={{ ["--i" as string]: i }}>
            <span className="s9-node" aria-hidden />
            <span className="s9-who"><b>{who}</b><small>{what}</small></span>
            <em>{tag}</em>
          </li>
        ))}
      </ol>
      <p className="s9-aside-foot">Every step is saved with a name and a time. Nothing is approved by software.</p>
    </aside>
  );
}
