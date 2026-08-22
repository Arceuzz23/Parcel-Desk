import type { OutcomeType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Every outcome the domain layer can produce, and how the UI should present
 * it. Deliberately a closed record (not a fallback "default: generic
 * error") — the spec requires the UI to show the exact contract term
 * (ARRIVED, PICKUP_CODE_MISMATCH, etc.), never a vague "Something went
 * wrong." If a new OutcomeType is ever added to src/lib/types.ts without
 * updating this map, TypeScript's exhaustiveness check fails the build
 * rather than silently falling through to a generic label — see the
 * `satisfies` below.
 */
const OUTCOME_TONE: Record<OutcomeType, "success" | "rejected"> = {
  ARRIVED: "success",
  COLLECTED: "success",
  PARCEL_ALREADY_SEEN: "rejected",
  ACTIVE_CODE_COLLISION: "rejected",
  PARCEL_NOT_PENDING: "rejected",
  PICKUP_CODE_MISMATCH: "rejected",
};

/** Plain-language explanation per outcome — exported so EventTimeline's
 *  rejection-detail panel can reuse the exact same wording rather than
 *  inventing a second copy. */
export const OUTCOME_DESCRIPTIONS = {
  ARRIVED: "Parcel accepted onto the shelf.",
  COLLECTED: "Parcel handed over to the student.",
  PARCEL_ALREADY_SEEN: "This parcel ID already had an accepted arrival earlier in the log.",
  ACTIVE_CODE_COLLISION: "Another pending parcel is already using this pickup code.",
  PARCEL_NOT_PENDING: "No pending parcel with this ID — nothing to collect.",
  PICKUP_CODE_MISMATCH: "The parcel is pending, but this pickup code doesn't match it.",
} satisfies Record<OutcomeType, string>;

const TONE_CLASSNAME: Record<"success" | "rejected", string> = {
  success: "border-success/30 bg-success/10 text-success",
  rejected: "border-rejected/30 bg-rejected/10 text-rejected",
};

export interface OutcomeBadgeProps {
  outcome: OutcomeType;
}

export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  const tone = OUTCOME_TONE[outcome];
  return (
    <span
      // `title` gives a plain-language explanation on hover without
      // replacing the exact contract term the spec requires as the
      // visible label.
      title={OUTCOME_DESCRIPTIONS[outcome]}
      className={cn(
        "inline-flex w-fit items-center rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-tight whitespace-nowrap",
        TONE_CLASSNAME[tone],
      )}
    >
      {outcome}
    </span>
  );
}
