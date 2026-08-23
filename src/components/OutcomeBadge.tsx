import type { OutcomeType } from "@/lib/types";
import { OUTCOME_DESCRIPTIONS, REJECTED_OUTCOMES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TONE_CLASSNAME: Record<"success" | "rejected", string> = {
  success: "border-success/30 bg-success/10 text-success",
  rejected: "border-rejected/30 bg-rejected/10 text-rejected",
};

export interface OutcomeBadgeProps {
  outcome: OutcomeType;
}

/**
 * Every outcome the domain layer can produce, rendered with the exact
 * contract term as its label (never a generic "Error") and a tone driven
 * by `REJECTED_OUTCOMES` (src/lib/constants.ts) — the same set
 * getSummary()'s rejected count and getEventsOverTime()'s rejected series
 * both read from, so "which outcomes count as rejected" has exactly one
 * definition in the app, not one per consumer.
 */
export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  const tone = REJECTED_OUTCOMES.has(outcome) ? "rejected" : "success";
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
