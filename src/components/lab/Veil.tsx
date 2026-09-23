"use client";

/* Clinical photographs are closed by default.

   A report of an injured animal often carries a photograph of the injury.
   It belongs on the record — it is evidence, and it is how a vet triages
   from a distance — but a resident opening a profile should choose to see
   it. The direction supplies the styling; the behaviour is the same in all
   three. */

import { useState } from "react";

export function Veil({ src, alt, note, action = "Show photograph", className = "", noteClass = "", children }: {
  src: string; alt: string; note: string; action?: string; className?: string; noteClass?: string; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${className}${open ? "" : " shut"}`}>
      <img src={src} alt={open ? alt : ""} aria-hidden={!open} />
      {!open && (
        <div className={noteClass}>
          <p>{note}</p>
          <button type="button" onClick={() => setOpen(true)}>{action}</button>
        </div>
      )}
      {children}
    </div>
  );
}
