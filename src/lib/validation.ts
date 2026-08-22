import type { Event, EventAction, EventInput, ValidationError, ValidationResult } from "./types";
import { PICKUP_CODE_REGEX } from "./constants";

/**
 * Full-table validation, pre-processing. On any structural failure, callers
 * must discard the whole run (no partial output) — see ValidationResult.valid.
 */
export function validateEvents(inputs: EventInput[]): ValidationResult {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  inputs.forEach((input, index) => {
    const rowIndex = index + 1;
    const id = input.id.trim();
    const action = input.action.trim();
    const parcelId = input.parcelId.trim();
    const student = input.student.trim();
    const pickupCode = input.pickupCode.trim();
    const shelf = input.shelf.trim();
    const label = id || `Row ${rowIndex}`;

    if (id === "") {
      errors.push({
        rowIndex,
        eventId: id,
        field: "Event ID",
        code: "INVALID_EVENT",
        message: `${label} · Event ID · Event ID is required`,
      });
    } else if (seenIds.has(id)) {
      errors.push({
        rowIndex,
        eventId: id,
        field: "Event ID",
        code: "DUPLICATE_EVENT_ID",
        message: `${label} · Event ID · Duplicate event ID: ${id}`,
      });
    } else {
      seenIds.add(id);
    }

    if (parcelId === "") {
      errors.push({
        rowIndex,
        eventId: id,
        field: "Parcel ID",
        code: "INVALID_EVENT",
        message: `${label} · Parcel ID · Parcel ID is required`,
      });
    }

    if (action !== "ARRIVE" && action !== "COLLECT") {
      errors.push({
        rowIndex,
        eventId: id,
        field: "Action",
        code: "INVALID_EVENT",
        message: `${label} · Action · Action must be ARRIVE or COLLECT`,
      });
    }

    if (!PICKUP_CODE_REGEX.test(pickupCode)) {
      errors.push({
        rowIndex,
        eventId: id,
        field: "Pickup Code",
        code: "INVALID_PICKUP_CODE",
        message: `${label} · Pickup Code · Invalid pickup code: must be 4 characters, uppercase letters or digits only`,
      });
    }

    if (action === "ARRIVE") {
      if (student === "") {
        errors.push({
          rowIndex,
          eventId: id,
          field: "Student",
          code: "INVALID_EVENT",
          message: `${label} · Student · Student is required for ARRIVE`,
        });
      }
      if (shelf === "") {
        errors.push({
          rowIndex,
          eventId: id,
          field: "Shelf",
          code: "INVALID_EVENT",
          message: `${label} · Shelf · Shelf is required for ARRIVE`,
        });
      }
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors, events: [] };
  }

  const events: Event[] = inputs.map((input) => ({
    id: input.id.trim(),
    // Safe: the loop above already confirmed action is exactly "ARRIVE" or "COLLECT".
    action: input.action.trim() as EventAction,
    parcelId: input.parcelId.trim(),
    student: input.student.trim(),
    pickupCode: input.pickupCode.trim(),
    shelf: input.shelf.trim(),
  }));

  return { valid: true, errors: [], events };
}
