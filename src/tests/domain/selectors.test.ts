import { describe, expect, it } from "vitest";
import { processHandover } from "../../lib/processor";
import { validateEvents } from "../../lib/validation";
import { getBuiltInEvents } from "../../lib/sampleData";
import {
  getCollectedParcels,
  getEventsOverTime,
  getPendingParcels,
  getShelfMap,
  getShelfOccupancy,
  getSummary,
} from "../../lib/selectors";

describe("selectors", () => {
  it("getSummary reflects pending/collected counts and rejected outcomes", () => {
    const validated = validateEvents(getBuiltInEvents());
    if (!validated.valid) throw new Error("fixture must be valid");
    const result = processHandover(validated.events);

    expect(getSummary(result)).toEqual({ pending: 3, collected: 1, rejected: 1 });
    expect(getPendingParcels(result).map((p) => p.parcelId)).toEqual(["P01", "P03", "P04"]);
    expect(getCollectedParcels(result).map((c) => c.parcelId)).toEqual(["P02"]);
  });

  it("getSummary returns 0/0/0 for an empty result", () => {
    expect(getSummary(processHandover([]))).toEqual({ pending: 0, collected: 0, rejected: 0 });
  });

  it("getShelfOccupancy groups pending parcels by shelf, derived from final state only", () => {
    const validated = validateEvents(getBuiltInEvents());
    if (!validated.valid) throw new Error("fixture must be valid");
    const result = processHandover(validated.events);

    expect(getShelfOccupancy(result)).toEqual([
      { shelf: "A1", parcels: [expect.objectContaining({ parcelId: "P01" })] },
      { shelf: "A2", parcels: [expect.objectContaining({ parcelId: "P03" })] },
      { shelf: "B2", parcels: [expect.objectContaining({ parcelId: "P04" })] },
    ]);
  });

  it("getShelfMap includes a shelf that was used and later emptied by a collection", () => {
    const validated = validateEvents(getBuiltInEvents());
    if (!validated.valid) throw new Error("fixture must be valid");
    const result = processHandover(validated.events);

    // B1 held P02, which E05 collects — the shelf should still appear
    // (something arrived there) but with zero occupants.
    expect(getShelfMap(result)).toEqual([
      { shelf: "A1", occupants: [expect.objectContaining({ parcelId: "P01" })] },
      { shelf: "A2", occupants: [expect.objectContaining({ parcelId: "P03" })] },
      { shelf: "B1", occupants: [] },
      { shelf: "B2", occupants: [expect.objectContaining({ parcelId: "P04" })] },
    ]);
  });

  it("getShelfMap returns nothing for an empty result", () => {
    expect(getShelfMap(processHandover([]))).toEqual([]);
  });

  it("getEventsOverTime tracks cumulative pending/collected/rejected across the canonical oracle", () => {
    const validated = validateEvents(getBuiltInEvents());
    if (!validated.valid) throw new Error("fixture must be valid");
    const result = processHandover(validated.events);

    expect(getEventsOverTime(result)).toEqual([
      { eventId: "E01", pending: 1, collected: 0, rejected: 0 }, // P01 arrives
      { eventId: "E02", pending: 2, collected: 0, rejected: 0 }, // P02 arrives
      { eventId: "E03", pending: 2, collected: 0, rejected: 1 }, // mismatch, no state change
      { eventId: "E04", pending: 3, collected: 0, rejected: 1 }, // P03 arrives
      { eventId: "E05", pending: 2, collected: 1, rejected: 1 }, // P02 collected
      { eventId: "E06", pending: 3, collected: 1, rejected: 1 }, // P04 arrives
    ]);
  });

  it("getEventsOverTime returns an empty series for an empty result", () => {
    expect(getEventsOverTime(processHandover([]))).toEqual([]);
  });
});
