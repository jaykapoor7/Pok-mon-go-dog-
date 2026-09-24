import type { ReactNode } from "react";

/* The figure a section is about: set large in the editorial serif, with
   what it counts beneath it and, where it has one, its source. */
export function Figure({ value, label, note, tone = "ink", size = "lg" }: {
  value: ReactNode; label: ReactNode; note?: ReactNode; tone?: "ink" | "flame" | "blue" | "night"; size?: "md" | "lg" | "xl";
}) {
  return (
    <div className={`sys-figure is-${tone} is-${size}`}>
      <b>{value}</b>
      <span>{label}</span>
      {note && <small>{note}</small>}
    </div>
  );
}

export function Eyebrow({ children, tone }: { children: ReactNode; tone?: "night" | "flame" }) {
  return <p className={`sys-eyebrow ${tone ? `is-${tone}` : ""}`}>{children}</p>;
}
