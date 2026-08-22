import { motion } from "motion/react";
import { EmptyState } from "@/components/EmptyState";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import type { HandoverResult } from "@/lib/types";
import { popIn, staggerChildren } from "@/lib/motion";

export interface EventOutcomesProps {
  /**
   * `null` = no run yet (pre-run/reset state — see appReducer.ts). A
   * non-null result with an empty `outcomes` array = a completed run that
   * processed zero events. The two render different copy so they're
   * visually and programmatically distinguishable, per the spec's
   * reset-vs-empty-run requirement.
   */
  result: HandoverResult | null;
}

/**
 * Outcomes are always rendered in `result.outcomes` order, which
 * processHandover() guarantees is source order (the order events appeared
 * in the log) — never re-sorted by event ID or outcome type. See
 * src/lib/processor.ts.
 */
export function EventOutcomes({ result }: EventOutcomesProps) {
  return (
    <section aria-labelledby="outcomes-heading" className="flex flex-col gap-3">
      <h2 id="outcomes-heading" className="text-sm font-semibold text-foreground">
        Event Outcomes
      </h2>

      {result === null ? (
        <EmptyState
          title="No result yet"
          description="Run Handover to see how each event resolved."
          testId="outcomes-pre-run"
        />
      ) : result.outcomes.length === 0 ? (
        <EmptyState
          title="Run completed — 0 events"
          description="The event log was empty, so nothing was processed."
          testId="outcomes-empty-run"
        />
      ) : (
        <motion.ol
          variants={staggerChildren(40)}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-1"
          data-testid="outcomes-list"
        >
          {result.outcomes.map((outcome) => (
            <motion.li
              key={outcome.event.id}
              variants={popIn}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="font-mono text-muted-foreground">{outcome.event.id}</span>
              <span className="text-foreground">{outcome.event.action}</span>
              <span className="font-mono text-foreground">{outcome.event.parcelId}</span>
              <OutcomeBadge outcome={outcome.outcome} />
            </motion.li>
          ))}
        </motion.ol>
      )}
    </section>
  );
}
