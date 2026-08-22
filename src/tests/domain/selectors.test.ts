import { describe, expect, it } from "vitest";
import { processHandover } from "../../lib/processor";
import { validateEvents } from "../../lib/validation";
import { getBuiltInEvents } from "../../lib/sampleData";
import { getCollectedParcels, getPendingParcels, getShelfOccupancy, getSummary } from "../../lib/selectors";

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
});
