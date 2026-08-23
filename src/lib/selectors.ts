import type { CollectedParcel, HandoverResult, HandoverSummary, PendingParcel } from "./types";
import { REJECTED_OUTCOMES } from "./constants";

export function getSummary(result: HandoverResult): HandoverSummary {
  const rejected = result.outcomes.filter((outcome) => REJECTED_OUTCOMES.has(outcome.outcome)).length;
  return {
    pending: result.pending.length,
    collected: result.collected.length,
    rejected,
  };
}

export function getPendingParcels(result: HandoverResult): PendingParcel[] {
  return result.pending;
}

export function getCollectedParcels(result: HandoverResult): CollectedParcel[] {
  return result.collected;
}

export interface ShelfOccupancy {
  shelf: string;
  parcels: PendingParcel[];
}

/** Derived entirely from the final pending state — no independent store. */
export function getShelfOccupancy(result: HandoverResult): ShelfOccupancy[] {
  const byShelf = new Map<string, PendingParcel[]>();
  for (const parcel of result.pending) {
    const list = byShelf.get(parcel.shelf) ?? [];
    list.push(parcel);
    byShelf.set(parcel.shelf, list);
  }
  return Array.from(byShelf.entries())
    .map(([shelf, parcels]) => ({ shelf, parcels }))
    .sort((a, b) => a.shelf.localeCompare(b.shelf));
}

export interface ShelfSlot {
  shelf: string;
  /** Pending parcels currently on this shelf — empty array means the shelf
   *  has been used (something arrived there at some point) but is
   *  currently empty (either never occupied by anything still pending, or
   *  its occupant has since been collected). */
  occupants: PendingParcel[];
}

/**
 * Every shelf that has EVER been referenced by an arrival in this run —
 * including ones that are currently empty because their parcel was
 * collected — not just the currently-occupied ones (contrast with
 * `getShelfOccupancy` above, which only returns occupied shelves).
 *
 * There is no fixed shelf inventory in this domain (shelf IDs are free
 * text entered on ARRIVE, not drawn from an enumerable set), so this
 * deliberately does NOT invent shelf IDs that were never mentioned in the
 * event log — it only shows shelves the log actually put a parcel on at
 * some point, derived from `result.pending` + `result.collected` (both
 * carry `.shelf`), never a second, independently-tracked store.
 */
export function getShelfMap(result: HandoverResult): ShelfSlot[] {
  const shelves = new Set([...result.pending, ...result.collected].map((parcel) => parcel.shelf));
  const pendingByShelf = new Map<string, PendingParcel[]>();
  for (const parcel of result.pending) {
    const list = pendingByShelf.get(parcel.shelf) ?? [];
    list.push(parcel);
    pendingByShelf.set(parcel.shelf, list);
  }
  return Array.from(shelves)
    .sort((a, b) => a.localeCompare(b))
    .map((shelf) => ({ shelf, occupants: pendingByShelf.get(shelf) ?? [] }));
}

export interface EventsOverTimePoint {
  eventId: string;
  pending: number;
  collected: number;
  rejected: number;
}

/**
 * Running (cumulative) pending/collected/rejected counts after each event
 * in source order — the series the "Events Over Time" chart plots.
 *
 * This aggregates `result.outcomes`, which processHandover() has already
 * fully classified; it does not re-decide what ARRIVED/COLLECTED/rejected
 * mean, it only tallies which of those four buckets each already-decided
 * outcome falls into, exactly the same bucketing getSummary() does for
 * the final totals — this is that same aggregation computed at every
 * step along the way, not new business logic.
 */
export function getEventsOverTime(result: HandoverResult): EventsOverTimePoint[] {
  let pending = 0;
  let collected = 0;
  let rejected = 0;
  return result.outcomes.map((outcome) => {
    if (outcome.outcome === "ARRIVED") pending += 1;
    else if (outcome.outcome === "COLLECTED") {
      pending -= 1;
      collected += 1;
    } else if (REJECTED_OUTCOMES.has(outcome.outcome)) rejected += 1;
    return { eventId: outcome.event.id, pending, collected, rejected };
  });
}
