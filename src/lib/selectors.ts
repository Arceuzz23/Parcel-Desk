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
