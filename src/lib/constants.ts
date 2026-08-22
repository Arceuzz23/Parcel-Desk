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
