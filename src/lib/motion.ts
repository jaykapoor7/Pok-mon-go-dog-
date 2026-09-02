import type { Transition, Variants } from 'framer-motion'

export const EASE_OUT = [0.23, 1, 0.32, 1] as const
export const EASE_MORPH = [0.77, 0, 0.175, 1] as const
export const EASE_SPRING = [0.16, 1.36, 0.3, 1] as const
export const EASE_INERTIA = [0.22, 0.61, 0.36, 1] as const

export const transitions = {
  micro: { duration: 0.18, ease: EASE_OUT } satisfies Transition,
  ui: { duration: 0.32, ease: EASE_OUT } satisfies Transition,
  reveal: { duration: 0.56, ease: EASE_OUT } satisfies Transition,
  morph: { duration: 0.9, ease: EASE_MORPH } satisfies Transition,
  portal: { duration: 1.35, ease: EASE_MORPH } satisfies Transition,
  snap: { duration: 0.72, ease: EASE_SPRING } satisfies Transition,
  camera: { duration: 1.4, ease: EASE_INERTIA } satisfies Transition,
} as const

export const reducedMotionTransition: Transition = {
  duration: 0.01,
  ease: 'linear',
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: transitions.reveal,
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(5px)',
    transition: transitions.ui,
  },
}

export const hudLabel: Variants = {
  hidden: { opacity: 0, scale: 0.96, x: -8, filter: 'blur(5px)' },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { ...transitions.reveal, delay: i * 0.06 },
  }),
  exit: { opacity: 0, scale: 0.98, filter: 'blur(4px)', transition: transitions.micro },
}

export const portalVariants: Variants = {
  idle: {
    scale: 1,
    rotateZ: -3,
    filter: 'blur(0px) contrast(1)',
    opacity: 1,
  },
  signalLock: {
    scale: 1.025,
    rotateZ: -2.4,
    filter: 'blur(0px) contrast(1.22)',
    opacity: 1,
    transition: transitions.snap,
  },
  breach: {
    scale: 8.5,
    rotateZ: 0,
    filter: 'blur(4px) contrast(1.35)',
    opacity: 0.16,
    transition: transitions.portal,
  },
}

export const portalScreenVariants: Variants = {
  idle: { scale: 1, filter: 'brightness(.85) saturate(.4)' },
  lock: {
    scale: 1.025,
    filter: 'brightness(1.2) saturate(.9)',
    transition: transitions.snap,
  },
  breach: {
    scale: 1.22,
    filter: 'brightness(1.55) saturate(1.2) blur(1px)',
    transition: transitions.portal,
  },
}

export const drawerVariants: Variants = {
  hidden: { opacity: 0, x: 24, filter: 'blur(8px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: transitions.reveal },
  exit: { opacity: 0, x: 18, filter: 'blur(6px)', transition: transitions.ui },
}

export const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.84 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { ...transitions.snap, delay: i * 0.045 },
  }),
  exit: { opacity: 0, scale: 0.94, transition: transitions.micro },
}

export const routeVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 1.1, ease: EASE_MORPH }, opacity: transitions.ui },
  },
}

export const pageStateVariants: Variants = {
  reality: { opacity: 1, scale: 1, rotateZ: 0 },
  measured: { opacity: 0.92, scale: 1.04, rotateZ: -2 },
  mapped: { opacity: 0.82, scale: 1.1, rotateZ: -8 },
  connected: { opacity: 1, scale: 1.02, rotateZ: 2 },
  resolved: { opacity: 1, scale: 1, rotateZ: 0 },
}

export function withReducedMotion(isReduced: boolean, transition: Transition) {
  return isReduced ? reducedMotionTransition : transition
}

export function stagger(delay = 0.06, start = 0): Transition {
  return {
    ...transitions.reveal,
    delay: start * delay,
  }
}
