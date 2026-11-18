/* StrayPaw's working-app motion, in one place (docs/rebuild/MOTION.md).
   Every spring and duration the app uses comes from here, so a control feels the same wherever it is. Movement only
   explains a change of state: something saved, something moved, something arrived. Nothing loops or bounces for show. */

/** Springs, by what moves. Stiffness and damping are tuned to settle without a visible overshoot (ink, not rubber). */
export const SPRING = {
  /** A control under the finger: press, a toggle's knob. */
  press: { type: "spring", stiffness: 700, damping: 42, mass: 0.6 },
  /** A control changing into its result: Save → Saved, a pin, a status chip. The one place a little overshoot is allowed. */
  morph: { type: "spring", stiffness: 520, damping: 30, mass: 0.7 },
  /** An indicator gliding to the chosen item: views, tabs. */
  glide: { type: "spring", stiffness: 600, damping: 44, mass: 1 },
  /** A popover or command palette appearing near what opened it. */
  pop: { type: "spring", stiffness: 520, damping: 40, mass: 0.7 },
  /** A panel entering from an edge: the list inspector, a sheet. */
  panel: { type: "spring", stiffness: 480, damping: 40, mass: 0.8 },
  /** A divider let go after a drag: springs back from the rubber band. */
  release: { type: "spring", stiffness: 380, damping: 22, mass: 0.6 },
} as const;

export type SpringName = keyof typeof SPRING;

/** Seconds. touch: a control's own feedback; state: a label or colour changing; enter: something arriving. */
export const DUR = { touch: 0.16, state: 0.22, enter: 0.28 } as const;

/** The settle curve (DESIGN.md "Motion grammar"). */
export const EASE = [0.23, 1, 0.32, 1] as const;

/** How long a result ("Saved ✓") holds before the control returns to rest, so it can be read. */
export const HOLD_RESULT_MS = 1600;

/** How long a "hold to remove" takes. Short enough not to annoy, long enough not to happen by accident. */
export const HOLD_MS = 700;
