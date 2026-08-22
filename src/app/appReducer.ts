/**
 * App-level state machine for the handover board screen.
 *
 * This is intentionally the ONLY place that touches React state shape for
 * the whole app (a single `useReducer` in App.tsx dispatches into this
 * file) — no separate useState calls scattered across components, and no
 * global state library. The app is small enough that a single reducer next
 * to its root component is the right amount of structure; see
 * docs/DECISIONS.md.
 *
 * This file is UI-state glue, not domain logic — it's allowed to use
 * browser APIs (crypto.randomUUID) that src/lib/ may not. It calls into
 * src/lib/validation.ts and src/lib/processor.ts but contains no business
 * rules of its own; every ARRIVE/COLLECT/validation decision still lives in
 * src/lib/.
 */

import type { EventInput, HandoverResult, ValidationError } from "@/lib/types";
import { validateEvents } from "@/lib/validation";
import { processHandover } from "@/lib/processor";
import { getBuiltInEvents } from "@/lib/sampleData";

/**
 * One editable table row. `key` is a UI-only stable identity for React
 * reconciliation (drag-free reordering, correct focus retention while
 * typing) — it is deliberately NOT the same thing as `data.id` (the Event
 * ID field), which is free-text the user can edit, leave blank, or
 * duplicate. Domain code (src/lib/) never sees `key`; only `data` crosses
 * that boundary.
 */
export interface EditableEventRow {
  key: string;
  data: EventInput;
}

export interface AppState {
  /** The live, editable event table. Source of truth for the next Run. */
  rows: EditableEventRow[];
  /**
   * Result of the most recent successful Run Handover.
   * `null` has a specific meaning: "no completed run to show yet" — either
   * the app just loaded, the user just clicked Reset, or the last Run
   * attempt failed validation. This is deliberately distinct from an empty
   * HandoverResult ({ outcomes: [], pending: [], collected: [] }), which
   * means "a run completed and processed zero events." See
   * docs/DECISIONS.md — "Reset state and empty-run state are visually
   * distinct."
   */
  lastResult: HandoverResult | null;
  /**
   * Structural validation errors from the most recent Run attempt.
   * Empty array = no errors (either never run, or the last run passed).
   */
  validationErrors: ValidationError[];
  /**
   * Cross-highlight selection: a parcel ID, or null for "nothing selected."
   * This is the ONLY thing that ties the Event Timeline, Handover Board,
   * and Shelf Map together interactively — each of those views independently
   * looks up whether a given event/parcel/shelf's parcel ID matches this
   * field and renders itself highlighted if so. There is no duplicate
   * "selected event" or "selected shelf" state: an event is identified by
   * its parcelId, a shelf's occupants are identified by their parcelId
   * (via getShelfOccupancy, src/lib/selectors.ts), so one ID is enough to
   * cross-reference all three views against the same `lastResult`.
   */
  selectedParcelId: string | null;
}

export type AppAction =
  | { type: "ADD_ROW" }
  | { type: "UPDATE_FIELD"; key: string; field: keyof EventInput; value: string }
  | { type: "DELETE_ROW"; key: string }
  | { type: "RUN" }
  | { type: "RESET" }
  | { type: "SELECT_PARCEL"; parcelId: string };

function createRowKey(): string {
  // crypto.randomUUID is available in all supported browsers and in jsdom
  // (Vitest's test environment) — no polyfill needed.
  return crypto.randomUUID();
}

function createEmptyRowInput(): EventInput {
  return { id: "", action: "ARRIVE", parcelId: "", student: "", pickupCode: "", shelf: "" };
}

function toRows(inputs: EventInput[]): EditableEventRow[] {
  return inputs.map((data) => ({ key: createRowKey(), data }));
}

/** Fresh app state: the canonical 6-event fixture, no result yet. */
export function createInitialState(): AppState {
  return {
    rows: toRows(getBuiltInEvents()),
    lastResult: null,
    validationErrors: [],
    selectedParcelId: null,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ADD_ROW": {
      // Adding/editing/deleting rows never touches lastResult or
      // validationErrors — the previously displayed result stays exactly
      // as it was until the user explicitly clicks "Run Handover" again.
      // This is the "editable input state ≠ last processed result"
      // separation required by the spec.
      return { ...state, rows: [...state.rows, { key: createRowKey(), data: createEmptyRowInput() }] };
    }

    case "UPDATE_FIELD": {
      return {
        ...state,
        rows: state.rows.map((row) =>
          row.key === action.key ? { ...row, data: { ...row.data, [action.field]: action.value } } : row,
        ),
      };
    }

    case "DELETE_ROW": {
      return { ...state, rows: state.rows.filter((row) => row.key !== action.key) };
    }

    case "RUN": {
      const inputs = state.rows.map((row) => row.data);
      const validation = validateEvents(inputs);

      if (!validation.valid) {
        // Structural failure: per the validation contract, this must
        // produce zero partial output. We explicitly null out lastResult
        // here (rather than leaving a stale prior result on screen) so the
        // board/outcomes/summary all clear immediately, and surface the
        // full list of validation errors instead.
        return { ...state, lastResult: null, validationErrors: validation.errors, selectedParcelId: null };
      }

      // Valid: process fresh (processHandover always starts from empty
      // internal state — see src/lib/processor.ts) and clear any stale
      // validation errors/selection from a previous attempt — a selection
      // made against the old board wouldn't necessarily mean anything
      // against the new one.
      const result: HandoverResult = processHandover(validation.events);
      return { ...state, lastResult: result, validationErrors: [], selectedParcelId: null };
    }

    case "RESET": {
      return createInitialState();
    }

    case "SELECT_PARCEL": {
      // Toggle: clicking an already-selected parcel/event/shelf deselects
      // it, rather than requiring a separate "clear selection" control.
      const selectedParcelId = state.selectedParcelId === action.parcelId ? null : action.parcelId;
      return { ...state, selectedParcelId };
    }

    default: {
      // Exhaustiveness guard: if a new AppAction variant is ever added
      // without a matching case above, TypeScript flags `action` as
      // non-`never` here at compile time.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

