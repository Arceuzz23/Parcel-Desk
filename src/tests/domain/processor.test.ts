import { describe, expect, it } from "vitest";
import { processHandover } from "../../lib/processor";
import { validateEvents } from "../../lib/validation";
import { getBuiltInEvents } from "../../lib/sampleData";
import { getSummary } from "../../lib/selectors";
import type { Event, EventInput } from "../../lib/types";

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: "E01",
    action: "ARRIVE",
    parcelId: "P01",
    student: "Asha",
    pickupCode: "K7M2",
    shelf: "A1",
    ...overrides,
  };
}

function toEvents(inputs: EventInput[]): Event[] {
  const result = validateEvents(inputs);
  if (!result.valid) {
    throw new Error("test fixture must be valid");
  }
  return result.events;
}

describe("processHandover — canonical oracle (built-in fixture)", () => {
  it("matches the exact P11 oracle outcomes, board state, and summary", () => {
    const result = processHandover(toEvents(getBuiltInEvents()));

    expect(result.outcomes.map((o) => ({ eventId: o.event.id, outcome: o.outcome }))).toEqual([
      { eventId: "E01", outcome: "ARRIVED" },
      { eventId: "E02", outcome: "ARRIVED" },
      { eventId: "E03", outcome: "PICKUP_CODE_MISMATCH" },
      { eventId: "E04", outcome: "ARRIVED" },
      { eventId: "E05", outcome: "COLLECTED" },
      { eventId: "E06", outcome: "ARRIVED" },
    ]);

    expect(result.pending.map((p) => p.parcelId)).toEqual(["P01", "P03", "P04"]);
    expect(result.collected.map((c) => c.parcelId)).toEqual(["P02"]);
    expect(getSummary(result)).toEqual({ pending: 3, collected: 1, rejected: 1 });
  });
});

describe("processHandover — corrected E03 pickup code", () => {
  it("collects P01 when E03's pickup code is corrected to K7M2", () => {
    const inputs = getBuiltInEvents().map((e) => (e.id === "E03" ? { ...e, pickupCode: "K7M2" } : e));
    const result = processHandover(toEvents(inputs));

    const e03 = result.outcomes.find((o) => o.event.id === "E03");
    expect(e03?.outcome).toBe("COLLECTED");
    expect(result.pending.map((p) => p.parcelId)).toEqual(["P03", "P04"]);
    expect(result.collected.map((c) => c.parcelId)).toEqual(["P01", "P02"]);
    expect(getSummary(result)).toEqual({ pending: 2, collected: 2, rejected: 0 });
  });
});

describe("processHandover — E06 active-code collision", () => {
  it("rejects E06 and excludes P04 when its code collides with P03's active code", () => {
    const inputs = getBuiltInEvents().map((e) => (e.id === "E06" ? { ...e, pickupCode: "T9C4" } : e));
    const result = processHandover(toEvents(inputs));

    const e06 = result.outcomes.find((o) => o.event.id === "E06");
    expect(e06?.outcome).toBe("ACTIVE_CODE_COLLISION");
    expect(result.pending.map((p) => p.parcelId)).not.toContain("P04");
    expect(result.pending.map((p) => p.parcelId)).toEqual(["P01", "P03"]);
    expect(result.collected.map((c) => c.parcelId)).toEqual(["P02"]);
    expect(getSummary(result)).toEqual({ pending: 2, collected: 1, rejected: 2 });
  });
});

describe("processHandover — empty input", () => {
  it("returns zero outcomes, zero board rows, and a 0/0/0 summary", () => {
    const result = processHandover([]);
    expect(result.outcomes).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.collected).toEqual([]);
    expect(getSummary(result)).toEqual({ pending: 0, collected: 0, rejected: 0 });
  });
});

describe("processHandover — source-order processing", () => {
  it("processes events in the order given, never sorted by event ID", () => {
    const events: Event[] = [
      event({ id: "E03", parcelId: "P03", pickupCode: "T9C4" }),
      event({ id: "E01", parcelId: "P01", pickupCode: "K7M2" }),
      event({ id: "E02", parcelId: "P02", pickupCode: "R4Q8" }),
    ];
    const result = processHandover(events);

    expect(result.outcomes.map((o) => o.event.id)).toEqual(["E03", "E01", "E02"]);
    expect(result.pending.map((p) => p.parcelId)).toEqual(["P03", "P01", "P02"]);
  });

  it("preserves accepted-arrival order in pending regardless of parcel ID ordering", () => {
    const events: Event[] = [
      event({ id: "E01", parcelId: "PZZ", pickupCode: "AAAA" }),
      event({ id: "E02", parcelId: "PAA", pickupCode: "BBBB" }),
    ];
    const result = processHandover(events);
    expect(result.pending.map((p) => p.parcelId)).toEqual(["PZZ", "PAA"]);
  });
});

describe("processHandover — ARRIVE state rules", () => {
  it("rejects a second arrival of an already-seen parcel as PARCEL_ALREADY_SEEN", () => {
    const events: Event[] = [
      event({ id: "E01", parcelId: "P01", pickupCode: "K7M2" }),
      event({ id: "E02", parcelId: "P01", pickupCode: "R4Q8" }),
    ];
    const result = processHandover(events);
    expect(result.outcomes[1].outcome).toBe("PARCEL_ALREADY_SEEN");
    expect(result.pending).toHaveLength(1);
  });

  it("rejects an arrival whose pickup code collides with another pending parcel's active code", () => {
    const events: Event[] = [
      event({ id: "E01", parcelId: "P01", pickupCode: "K7M2" }),
      event({ id: "E02", parcelId: "P02", pickupCode: "K7M2" }),
    ];
    const result = processHandover(events);
    expect(result.outcomes[1].outcome).toBe("ACTIVE_CODE_COLLISION");
    expect(result.pending.map((p) => p.parcelId)).toEqual(["P01"]);
  });

  it("checks PARCEL_ALREADY_SEEN before ACTIVE_CODE_COLLISION", () => {
    // Same parcel ID re-arriving with a code that would also collide — must report
    // PARCEL_ALREADY_SEEN per the mandatory check order, not ACTIVE_CODE_COLLISION.
    const events: Event[] = [
      event({ id: "E01", parcelId: "P01", pickupCode: "K7M2" }),
      event({ id: "E02", parcelId: "P01", pickupCode: "K7M2" }),
    ];
    const result = processHandover(events);
    expect(result.outcomes[1].outcome).toBe("PARCEL_ALREADY_SEEN");
  });

  it("accepts a new arrival once its pickup code has been freed by a prior collection", () => {
    const events: Event[] = [
      event({ id: "E01", action: "ARRIVE", parcelId: "P01", pickupCode: "K7M2" }),
      event({ id: "E02", action: "COLLECT", parcelId: "P01", pickupCode: "K7M2" }),
      event({ id: "E03", action: "ARRIVE", parcelId: "P02", pickupCode: "K7M2" }),
    ];
    const result = processHandover(events);
    expect(result.outcomes.map((o) => o.outcome)).toEqual(["ARRIVED", "COLLECTED", "ARRIVED"]);
    expect(result.pending.map((p) => p.parcelId)).toEqual(["P02"]);
  });
});

describe("processHandover — COLLECT state rules", () => {
  it("rejects collecting a parcel that never arrived as PARCEL_NOT_PENDING", () => {
    const events: Event[] = [event({ id: "E01", action: "COLLECT", parcelId: "P99", pickupCode: "K7M2" })];
    const result = processHandover(events);
    expect(result.outcomes[0].outcome).toBe("PARCEL_NOT_PENDING");
    expect(result.collected).toEqual([]);
  });

  it("rejects collecting a pending parcel with the wrong code as PICKUP_CODE_MISMATCH", () => {
    const events: Event[] = [
      event({ id: "E01", action: "ARRIVE", parcelId: "P01", pickupCode: "K7M2" }),
      event({ id: "E02", action: "COLLECT", parcelId: "P01", pickupCode: "ZZZZ" }),
    ];
    const result = processHandover(events);
    expect(result.outcomes[1].outcome).toBe("PICKUP_CODE_MISMATCH");
    expect(result.pending).toHaveLength(1);
    expect(result.collected).toEqual([]);
  });

  it("collects a pending parcel with the correct code as COLLECTED", () => {
    const events: Event[] = [
      event({ id: "E01", action: "ARRIVE", parcelId: "P01", pickupCode: "K7M2" }),
      event({ id: "E02", action: "COLLECT", parcelId: "P01", pickupCode: "K7M2" }),
    ];
    const result = processHandover(events);
    expect(result.outcomes[1].outcome).toBe("COLLECTED");
    expect(result.pending).toEqual([]);
    expect(result.collected.map((c) => c.parcelId)).toEqual(["P01"]);
  });

  it("succeeds for COLLECT rows with blank student and shelf", () => {
    const events: Event[] = [
      event({ id: "E01", action: "ARRIVE", parcelId: "P01", pickupCode: "K7M2", student: "Asha", shelf: "A1" }),
      event({ id: "E02", action: "COLLECT", parcelId: "P01", pickupCode: "K7M2", student: "", shelf: "" }),
    ];
    const result = processHandover(events);
    expect(result.outcomes[1].outcome).toBe("COLLECTED");
    expect(result.collected[0]).toEqual({
      parcelId: "P01",
      student: "Asha",
      pickupCode: "K7M2",
      shelf: "A1",
      collectedAtEventId: "E02",
    });
  });

  it("checks PARCEL_NOT_PENDING before PICKUP_CODE_MISMATCH", () => {
    const events: Event[] = [event({ id: "E01", action: "COLLECT", parcelId: "P01", pickupCode: "WRNG" })];
    const result = processHandover(events);
    expect(result.outcomes[0].outcome).toBe("PARCEL_NOT_PENDING");
  });
});

describe("processHandover — purity", () => {
  it("does not mutate its input events array", () => {
    const events: Event[] = [event({ id: "E01" })];
    const snapshot = JSON.parse(JSON.stringify(events));
    processHandover(events);
    expect(events).toEqual(snapshot);
  });

  it("returns fresh state on every invocation", () => {
    const events: Event[] = [event({ id: "E01" })];
    const first = processHandover(events);
    const second = processHandover(events);
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});
