import { describe, expect, it } from "vitest";
import { validateEvents } from "../../lib/validation";
import { processHandover } from "../../lib/processor";
import { getBuiltInEvents } from "../../lib/sampleData";

describe("validation + processing pipeline — structural failure yields zero partial output", () => {
  it("a duplicate event ID (E06 -> E05) invalidates the whole run before any processing", () => {
    const inputs = getBuiltInEvents().map((e) => (e.id === "E06" ? { ...e, id: "E05" } : e));
    const result = validateEvents(inputs);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_EVENT_ID", eventId: "E05" }),
    );
    expect(result.events).toEqual([]);
    // A caller must never invoke processHandover on an invalid ValidationResult;
    // this asserts there is nothing to process in that case.
  });
});

describe("validation + processing pipeline — full built-in run", () => {
  it("produces the canonical oracle end to end", () => {
    const validated = validateEvents(getBuiltInEvents());
    expect(validated.valid).toBe(true);

    const result = processHandover(validated.events);
    expect(result.outcomes.map((o) => o.outcome)).toEqual([
      "ARRIVED",
      "ARRIVED",
      "PICKUP_CODE_MISMATCH",
      "ARRIVED",
      "COLLECTED",
      "ARRIVED",
    ]);
  });
});
