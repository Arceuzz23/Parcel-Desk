/**
 * Shared Motion (motion/react — the rebranded Framer Motion) presentation
 * constants.
 *
 * IMPORTANT — architectural boundary: this file is UI presentation only.
 * It has zero knowledge of Event/HandoverResult/etc. Components pass their
 * own domain data in; this file only decides *how things move*, never
 * *what the data means*. That split is what keeps src/lib/{processor,
 * validation,selectors}.ts importable in a Node test runner with no DOM.
 *
 * Reduced motion: rather than sprinkling `prefers-reduced-motion` checks
 * through every component, the app root wraps everything in
 * `<MotionConfig reducedMotion="user">` (see src/app/App.tsx). That single
 * flag makes every `motion.*` element automatically skip transform/layout
 * animation for users who have the OS-level "reduce motion" setting on,
 * while still applying instant style changes — so the app stays fully
 * functional, just without the animated transitions.
 */

import type { Transition, Variants } from "motion/react";

/** Snappy, physical-feeling spring used for most enter/exit transitions. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.9,
};

/** A gentler spring for larger layout shifts (e.g. cards resizing). */
export const SOFT_SPRING: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

/**
 * Fade + slight rise. Used for: validation banner appearing, outcome rows
 * appearing after Run Handover, summary panel appearing after a run.
 */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: SPRING },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/**
 * Used for rows/cards that need to visibly "pop" into place — a pending
 * parcel arriving on the board, a new event outcome resolving.
 */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: SPRING },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

/**
 * Stagger container — apply to a parent `motion.ul`/`motion.div` wrapping a
 * list of `popIn`/`fadeInUp` children so they cascade in one after another
 * instead of all appearing simultaneously.
 */
export const staggerChildren = (staggerMs = 40): Variants => ({
  animate: {
    transition: { staggerChildren: staggerMs / 1000 },
  },
});

/**
 * Initial-load entrance, adapted from Motion.dev's "OSS Hero" staggered
 * spring-entrance example (motion.dev/examples/react-hero-stagger): a
 * stagger container plus per-item spring variants is the same mechanic,
 * re-tuned from a marketing hero down to an operations console — smaller
 * vertical travel, an overdamped (no-overshoot) spring, and a short
 * stagger, so it reads as "fast and polished," not "landing page."
 *
 * Used exactly once, in src/app/App.tsx, around the handful of dashboard
 * sections present at first paint (Header, Summary, Handover Board, Event
 * Timeline, Event Log). App.tsx's root element never unmounts during the
 * session, so this only ever plays on true initial load — a Run, an edit,
 * or a Reset re-renders those sections in place without re-triggering it.
 * Every other visible state change (a parcel arriving, an outcome
 * resolving, a validation error) continues to use `popIn`/`fadeInUp`/
 * `staggerChildren` above, not this.
 */
export const ENTRANCE_SPRING: Transition = {
  type: "spring",
  stiffness: 360,
  damping: 40,
  mass: 0.8,
};

/** Orchestrates entranceItem children ~80ms apart (60-100ms band) — short
 *  enough that the whole sequence completes in well under a second. */
export const entranceContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.02 },
  },
};

/** One dashboard section's entrance: fade + a 10px rise, settling via an
 *  overdamped spring — no exit variant, since nothing using this ever
 *  unmounts as part of entrance choreography. */
export const entranceItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: ENTRANCE_SPRING },
};
