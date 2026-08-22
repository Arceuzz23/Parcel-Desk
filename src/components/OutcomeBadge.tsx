import { Badge } from "@/components/ui/badge";
import type { OutcomeType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Every outcome the domain layer can produce, and how the UI should present
 * it. Deliberately a closed switch (not a fallback "default: generic
 * error") — the spec requires the UI to show the exact contract term
 * (ARRIVED, PICKUP_CODE_MISMATCH, etc.), never a vague "Something went
 * wrong." If a new OutcomeType is ever added to src/lib/types.ts without
 * updating this map, TypeScript's exhaustiveness check below fails the
 * build rather than silently falling through to a generic label.
 */
const OUTCOME_META: Record<
  OutcomeType,
  { tone: "success" | "pending" | "rejected"; description: string }
> = {
  ARRIVED: { tone: "success", description: "Parcel accepted onto the shelf." },
  COLLECTED: { tone: "success", description: "Parcel handed over to the student." },
  PARCEL_ALREADY_SEEN: {
    tone: "rejected",
    description: "This parcel ID already had an accepted arrival earlier in the log.",
  },
  ACTIVE_CODE_COLLISION: {
    tone: "rejected",
    description: "Another pending parcel is already using this pickup code.",
  },
  PARCEL_NOT_PENDING: {
    tone: "rejected",
    description: "No pending parcel with this ID — nothing to collect.",
  },
  PICKUP_CODE_MISMATCH: {
    tone: "rejected",
    description: "The parcel is pending, but this pickup code doesn't match it.",
  },
};

const TONE_CLASSNAME: Record<(typeof OUTCOME_META)[OutcomeType]["tone"], string> = {
  success: "border-status-success/30 bg-status-success/10 text-status-success",
  pending: "border-status-pending/30 bg-status-pending/10 text-status-pending",
  rejected: "border-status-rejected/30 bg-status-rejected/10 text-status-rejected",
};

export interface OutcomeBadgeProps {
  outcome: OutcomeType;
}

export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  const meta = OUTCOME_META[outcome];
  return (
    <Badge
      variant="outline"
      // `title` gives a plain-language explanation on hover without
      // replacing the exact contract term the spec requires as the
      // visible label.
      title={meta.description}
      className={cn("font-mono tracking-tight", TONE_CLASSNAME[meta.tone])}
    >
      {outcome}
    </Badge>
  );
}
