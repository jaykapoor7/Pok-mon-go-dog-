/* A short, calm loading indicator. The reader sees that work is happening,
   not just a sentence that looks like a dead state. Three dots that bounce
   in place: no spinner, no revolving arc, nothing that competes with the
   paper ground. Uses currentColor so it matches the text it sits beside. */

import type { ReactNode } from "react";
import "./reading.css";

export function Reading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`sp-reading ${className}`.trim()}>
      <span>{children}</span>
      <i className="sp-reading-dots" aria-hidden><em /><em /><em /></i>
    </span>
  );
}
