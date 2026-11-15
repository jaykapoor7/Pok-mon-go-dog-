import type { ReactNode } from "react";

/* Honest states for the operator console: what was read, what was not,
   and a write's acknowledgement in the server's own words. */

export function State({ kind = "empty", title, children, action }: { kind?: "empty" | "error"; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`tc-state is-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <h3>{title}</h3>
      {children && <div className="tc-state-b">{children}</div>}
      {action && <div className="tc-row">{action}</div>}
    </section>
  );
}

export type AckState = "draft" | "pending" | "saved" | "failed" | "offline";
export function Ack({ state, children }: { state: AckState; children: ReactNode }) {
  return <span className={`tc-ack is-${state}`} role={state === "failed" ? "alert" : "status"}>{children}</span>;
}
