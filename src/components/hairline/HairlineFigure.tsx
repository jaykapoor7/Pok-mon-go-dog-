import { Drawer, Elevator, Terrain } from "@lucasmarkes/hairline/react";
import styles from "./HairlineFigure.module.css";

type FigureKind = "handoff" | "coverage" | "empty";

const FIGURES = {
  handoff: Elevator,
  coverage: Terrain,
  empty: Drawer,
} as const;

const defaults: Record<FigureKind, { intensity: number; label: string }> = {
  handoff: {
    intensity: 0.28,
    label: "Four levels connected by a moving field-work hand-off.",
  },
  coverage: {
    intensity: 0.2,
    label: "A compact field of raised marks representing recorded city coverage.",
  },
  empty: {
    intensity: 0.18,
    label: "An open, empty case drawer ready for the first record.",
  },
};

/**
 * One branded wrapper around Hairline's dependency-free SVG figures. Keeping
 * the visual language and accessibility settings here prevents individual
 * product pages from carrying their own illustration code or colour tokens.
 */
export function HairlineFigure({
  kind,
  className = "",
  label,
}: {
  kind: FigureKind;
  className?: string;
  label?: string;
}) {
  const Figure = FIGURES[kind];
  const figure = defaults[kind];

  return (
    <Figure
      className={`${styles.figure} ${styles[kind]} ${className}`}
      intensity={figure.intensity}
      theme="light"
      label={label ?? figure.label}
    />
  );
}
