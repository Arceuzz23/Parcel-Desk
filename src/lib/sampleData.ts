import type { EventInput } from "./types";

/** Canonical built-in fixture — never mutated directly, only cloned. */
const BUILT_IN_EVENTS: readonly EventInput[] = [
  { id: "E01", action: "ARRIVE", parcelId: "P01", student: "Asha", pickupCode: "K7M2", shelf: "A1" },
  { id: "E02", action: "ARRIVE", parcelId: "P02", student: "Bilal", pickupCode: "R4Q8", shelf: "B1" },
  { id: "E03", action: "COLLECT", parcelId: "P01", student: "", pickupCode: "ZZZZ", shelf: "" },
  { id: "E04", action: "ARRIVE", parcelId: "P03", student: "Chen", pickupCode: "T9C4", shelf: "A2" },
  { id: "E05", action: "COLLECT", parcelId: "P02", student: "", pickupCode: "R4Q8", shelf: "" },
  { id: "E06", action: "ARRIVE", parcelId: "P04", student: "Divya", pickupCode: "H2N6", shelf: "B2" },
];

/** Returns a fresh clone of the canonical fixture — the source array is never mutated. */
export function getBuiltInEvents(): EventInput[] {
  return BUILT_IN_EVENTS.map((event) => ({ ...event }));
}
