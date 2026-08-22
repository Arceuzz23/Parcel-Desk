import { describe, expect, it } from "vitest";
import { validateEvents } from "../../lib/validation";
import { getBuiltInEvents } from "../../lib/sampleData";
import type { EventInput } from "../../lib/types";

function baseArrive(overrides: Partial<EventInput> = {}): EventInput {
  return { id: "E01", action: "ARRIVE", parcelId: "P01", student: "Asha", pickupCode: "K7M2", shelf: "A1", ...overrides };
}

function baseCollect(overrides: Partial<EventInput> = {}): EventInput {
  return { id: "E01", action: "COLLECT", parcelId: "P01", student: "", pickupCode: "K7M2", shelf: "", ...overrides };
}

describe("validateEvents — pickup code regex", () => {
  it("accepts mixed alphanumeric 4-char codes", () => {
    expect(validateEvents([baseArrive({ pickupCode: "K7M2" })]).valid).toBe(true);
  });

  it("accepts all-letter 4-char codes", () => {
    expect(validateEvents([baseArrive({ pickupCode: "ZZZZ" })]).valid).toBe(true);
  });

  it("accepts all-digit 4-char codes", () => {
    expect(validateEvents([baseArrive({ pickupCode: "1234" })]).valid).toBe(true);
  });

  it("rejects codes shorter than 4 characters", () => {
    const result = validateEvents([baseArrive({ pickupCode: "K7M" })]);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: "INVALID_PICKUP_CODE", field: "Pickup Code" }),
    ]);
  });

  it("rejects codes longer than 4 characters", () => {
    const result = validateEvents([baseArrive({ pickupCode: "K7M22" })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_PICKUP_CODE");
  });

  it("rejects lowercase letters", () => {
    const result = validateEvents([baseArrive({ pickupCode: "k7m2" })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_PICKUP_CODE");
  });

  it("rejects non-alphanumeric characters", () => {
    const result = validateEvents([baseArrive({ pickupCode: "K7M!" })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_PICKUP_CODE");
  });

  it("rejects an empty pickup code", () => {
    const result = validateEvents([baseArrive({ pickupCode: "" })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_PICKUP_CODE");
  });
});

describe("validateEvents — structural rules", () => {
  it("passes the built-in fixture as valid", () => {
    const result = validateEvents(getBuiltInEvents());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.events).toHaveLength(6);
  });

  it("returns valid with zero events for empty input", () => {
    const result = validateEvents([]);
    expect(result).toEqual({ valid: true, errors: [], events: [] });
  });

  it("rejects an empty Event ID as INVALID_EVENT", () => {
    const result = validateEvents([baseArrive({ id: "" })]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_EVENT", field: "Event ID" }),
    );
  });

  it("rejects a duplicate Event ID as DUPLICATE_EVENT_ID", () => {
    const result = validateEvents([
      baseArrive({ id: "E01", parcelId: "P01" }),
      baseArrive({ id: "E01", parcelId: "P02" }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_EVENT_ID", eventId: "E01", message: expect.stringContaining("E01") }),
    );
  });

  it("rejects an empty Parcel ID as INVALID_EVENT", () => {
    const result = validateEvents([baseArrive({ parcelId: "" })]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_EVENT", field: "Parcel ID" }),
    );
  });

  it("rejects an action that is neither ARRIVE nor COLLECT", () => {
    const result = validateEvents([baseArrive({ action: "DELIVER" })]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_EVENT", field: "Action" }),
    );
  });

  it("requires a non-empty student for ARRIVE", () => {
    const result = validateEvents([baseArrive({ student: "" })]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_EVENT", field: "Student" }),
    );
  });

  it("requires a non-empty shelf for ARRIVE", () => {
    const result = validateEvents([baseArrive({ shelf: "" })]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_EVENT", field: "Shelf" }),
    );
  });

  it("does not require student or shelf for COLLECT", () => {
    const result = validateEvents([baseCollect({ student: "", shelf: "" })]);
    expect(result.valid).toBe(true);
  });

  it("still requires a valid pickup code for COLLECT", () => {
    const result = validateEvents([baseCollect({ pickupCode: "bad" })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_PICKUP_CODE");
  });

  it("trims whitespace from all fields before validating", () => {
    const result = validateEvents([
      baseArrive({ id: " E01 ", parcelId: " P01 ", student: " Asha ", pickupCode: " K7M2 ", shelf: " A1 " }),
    ]);
    expect(result.valid).toBe(true);
    expect(result.events[0]).toEqual({
      id: "E01",
      action: "ARRIVE",
      parcelId: "P01",
      student: "Asha",
      pickupCode: "K7M2",
      shelf: "A1",
    });
  });

  it("produces zero partial output on structural failure — no events returned", () => {
    const result = validateEvents([baseArrive({ id: "E01" }), baseArrive({ id: "E01" })]);
    expect(result.valid).toBe(false);
    expect(result.events).toEqual([]);
  });

  it("reports all structural errors across the table, not just the first", () => {
    const result = validateEvents([
      baseArrive({ id: "", pickupCode: "bad" }),
      baseArrive({ id: "E02", action: "NOPE" }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
