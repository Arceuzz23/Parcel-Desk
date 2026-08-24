/**
 * Domain types for the hostel parcel-desk handover board.
 * Zero React/DOM/browser dependencies — pure TypeScript.
 */

export type EventAction = "ARRIVE" | "COLLECT";

/** Raw editable table row, as typed by the user — fields are unvalidated strings. */
export interface EventInput {
  id: string;
  action: string;
  parcelId: string;
  student: string;
  pickupCode: string;
  shelf: string;
}

/** A validated, trimmed event — only produced by validateEvents on success. */
export interface Event {
  id: string;
  action: EventAction;
  parcelId: string;
  student: string;
  pickupCode: string;
  shelf: string;
}

export type OutcomeType =
  | "ARRIVED"
  | "COLLECTED"
  | "PARCEL_ALREADY_SEEN"
  | "ACTIVE_CODE_COLLISION"
  | "PARCEL_NOT_PENDING"
  | "PICKUP_CODE_MISMATCH";

export interface EventOutcome {
  event: Event;
  outcome: OutcomeType;
}

export interface PendingParcel {
  parcelId: string;
  student: string;
  pickupCode: string;
  shelf: string;
  arrivedAtEventId: string;
}

export interface CollectedParcel {
  parcelId: string;
  student: string;
  pickupCode: string;
  shelf: string;
  collectedAtEventId: string;
}

export interface HandoverResult {
  outcomes: EventOutcome[];
  pending: PendingParcel[];
  collected: CollectedParcel[];
}

export interface HandoverSummary {
  pending: number;
  collected: number;
  rejected: number;
}

export type ValidationErrorCode =
  | "INVALID_EVENT"
  | "DUPLICATE_EVENT_ID"
  | "INVALID_PICKUP_CODE"
  | "PARCEL_NOT_FOUND";

export interface ValidationError {
  rowIndex: number;
  eventId: string;
  field: string;
  code: ValidationErrorCode;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  events: Event[];
}
