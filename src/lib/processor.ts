
import type { CollectedParcel, Event, EventOutcome, HandoverResult, PendingParcel } from "./types";

/**
 * Processes validated events in source order (never event-ID order, never
 * sorted) into a fresh HandoverResult. Never mutates its input.
 */
export function processHandover(events: Event[]): HandoverResult {
  const outcomes: EventOutcome[] = [];
  const pending: PendingParcel[] = [];
  const collected: CollectedParcel[] = [];

  const seenParcelIds = new Set<string>();
  const pendingByParcelId = new Map<string, PendingParcel>();
  const parcelIdByActiveCode = new Map<string, string>();

  for (const event of events) {
    if (event.action === "ARRIVE") {
      if (seenParcelIds.has(event.parcelId)) {
        outcomes.push({ event, outcome: "PARCEL_ALREADY_SEEN" });
        continue;
      }

      if (parcelIdByActiveCode.has(event.pickupCode)) {
        outcomes.push({ event, outcome: "ACTIVE_CODE_COLLISION" });
        continue;
      }

      const parcel: PendingParcel = {
        parcelId: event.parcelId,
        student: event.student,
        pickupCode: event.pickupCode,
        shelf: event.shelf,
        arrivedAtEventId: event.id,
      };
      pending.push(parcel);
      pendingByParcelId.set(event.parcelId, parcel);
      seenParcelIds.add(event.parcelId);
      parcelIdByActiveCode.set(event.pickupCode, event.parcelId);
      outcomes.push({ event, outcome: "ARRIVED" });
      continue;
    }

    // COLLECT
    const parcel = pendingByParcelId.get(event.parcelId);
    if (!parcel) {
      outcomes.push({ event, outcome: "PARCEL_NOT_PENDING" });
      continue;
    }

    if (parcel.pickupCode !== event.pickupCode) {
      outcomes.push({ event, outcome: "PICKUP_CODE_MISMATCH" });
      continue;
    }

    const pendingIndex = pending.indexOf(parcel);
    pending.splice(pendingIndex, 1);
    pendingByParcelId.delete(event.parcelId);
    parcelIdByActiveCode.delete(parcel.pickupCode);

    const collectedParcel: CollectedParcel = {
      parcelId: parcel.parcelId,
      student: parcel.student,
      pickupCode: parcel.pickupCode,
      shelf: parcel.shelf,
      collectedAtEventId: event.id,
    };
    collected.push(collectedParcel);
    outcomes.push({ event, outcome: "COLLECTED" });
  }

  return { outcomes, pending, collected };
}
