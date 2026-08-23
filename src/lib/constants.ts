import type { EventAction, OutcomeType } from "./types";

/** 4 characters, each independently an uppercase letter or digit (mixed alphanumeric valid). */
export const PICKUP_CODE_REGEX = /^[A-Z0-9]{4}$/;

export const EVENT_ACTIONS: readonly EventAction[] = ["ARRIVE", "COLLECT"];

export const REJECTED_OUTCOMES: ReadonlySet<OutcomeType> = new Set<OutcomeType>([
  "PARCEL_ALREADY_SEEN",
  "ACTIVE_CODE_COLLISION",
  "PARCEL_NOT_PENDING",
  "PICKUP_CODE_MISMATCH",
]);

/**
 * Plain-language explanation per outcome — the spec requires the UI to
 * show the exact contract term (ARRIVED, PICKUP_CODE_MISMATCH, etc.) as
 * the primary label, never a vague "Something went wrong," so this is
 * secondary/supporting text only (an OutcomeBadge tooltip, the Event
 * Timeline's rejection-detail panel). Kept here rather than in
 * OutcomeBadge.tsx itself so that component only exports the one React
 * component (Vite's Fast Refresh boundary rule — react/only-export-
 * components — flags a component file that also exports plain data).
 * `satisfies Record<OutcomeType, string>` makes it a compile error to add
 * a new OutcomeType without a description here.
 */
export const OUTCOME_DESCRIPTIONS = {
  ARRIVED: "Parcel accepted onto the shelf.",
  COLLECTED: "Parcel handed over to the student.",
  PARCEL_ALREADY_SEEN: "This parcel ID already had an accepted arrival earlier in the log.",
  ACTIVE_CODE_COLLISION: "Another pending parcel is already using this pickup code.",
  PARCEL_NOT_PENDING: "No pending parcel with this ID — nothing to collect.",
  PICKUP_CODE_MISMATCH: "The parcel is pending, but this pickup code doesn't match it.",
} satisfies Record<OutcomeType, string>;
