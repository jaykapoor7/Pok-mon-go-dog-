import Link from "next/link";

/* Where on the map this screen stands: India › State › City › Locality ›
   Cell. Every rung above the current one is a way back out. */
export type Rung = { label: string; href?: string; onClick?: () => void };

export function ScaleLadder({ rungs, night = false, className = "" }: { rungs: Rung[]; night?: boolean; className?: string }) {
  return (
    <nav className={`sys-ladder ${night ? "is-night" : ""} ${className}`} aria-label="Scale">
      <ol>
        {rungs.map((r, i) => {
          const last = i === rungs.length - 1;
          const body = r.href && !last ? <Link href={r.href}>{r.label}</Link>
            : r.onClick && !last ? <button type="button" onClick={r.onClick}>{r.label}</button>
            : <span aria-current={last ? "location" : undefined}>{r.label}</span>;
          return <li key={`${r.label}-${i}`}>{body}</li>;
        })}
      </ol>
    </nav>
  );
}
