import { motion } from "motion/react";
import { EmptyState } from "@/components/EmptyState";
import { OutcomeBadge, OUTCOME_DESCRIPTIONS } from "@/components/OutcomeBadge";
import type { EventOutcome, HandoverResult } from "@/lib/types";
import { REJECTED_OUTCOMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { popIn, staggerChildren } from "@/lib/motion";

export interface EventTimelineProps {
  /**
   * `null` = no run yet (pre-run/reset state — see appReducer.ts). A
   * non-null result with an empty `outcomes` array = a completed run that
   * processed zero events. The two render different copy so they're
   * visually and programmatically distinguishable, per the spec's
   * reset-vs-empty-run requirement.
   */
  result: HandoverResult | null;
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
}

/**
 * Event → Parcel connective tissue (item 8 of the redesign brief): a
 * compact, connected E01 → E02 → ... strip in source order — the same
 * order guarantee processHandover() makes (see src/lib/processor.ts) — so
 * this reads as "replaying the log," not an arbitrary list. Rejected
 * outcomes get an expanded detail block underneath the strip, since
 * "REJECTED — nothing changed" is exactly the moment a desk operator most
 * needs the extra context, and cramming that into the compact strip would
 * bloat every node instead of only the ones that need it.
 */
export function EventTimeline({ result, selectedParcelId, onSelectParcel }: EventTimelineProps) {
  return (
    <section aria-labelledby="timeline-heading" className="flex flex-col gap-3">
      <h3 id="timeline-heading" className="font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Event Timeline
      </h3>

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
        <>
          <motion.ol
            variants={staggerChildren(90)}
            initial="initial"
            animate="animate"
            className="flex flex-wrap items-center gap-y-3"
            data-testid="outcomes-list"
          >
            {result.outcomes.map((outcome, index) => (
              <motion.li key={outcome.event.id} variants={popIn} className="flex items-center">
                <TimelineNode
                  outcome={outcome}
                  selected={selectedParcelId === outcome.event.parcelId}
                  dimmed={selectedParcelId !== null && selectedParcelId !== outcome.event.parcelId}
                  onSelect={onSelectParcel}
                />
                {index < result.outcomes.length - 1 && (
                  <span aria-hidden="true" className="mx-1.5 font-mono text-border-strong select-none">
                    →
                  </span>
                )}
              </motion.li>
            ))}
          </motion.ol>

          <RejectionDetails result={result} />
        </>
      )}
    </section>
  );
}

function TimelineNode({
  outcome,
  selected,
  dimmed,
  onSelect,
}: {
  outcome: EventOutcome;
  selected: boolean;
  dimmed: boolean;
  onSelect: (parcelId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(outcome.event.parcelId)}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1 border bg-surface-raised px-2.5 py-1.5 text-left transition-[opacity,border-color] duration-150",
        selected ? "border-accent" : "border-border hover:border-border-strong",
        dimmed ? "opacity-40" : "opacity-100",
      )}
    >
      <span className="font-mono text-xs text-muted-foreground">
        {outcome.event.id} <span className="text-border-strong">·</span> {outcome.event.parcelId}
      </span>
      <OutcomeBadge outcome={outcome.outcome} />
    </button>
  );
}

/**
 * Expanded context for every rejected outcome in this run. For
 * PICKUP_CODE_MISMATCH specifically, shows the expected vs. received
 * pickup code — derived without touching src/lib/: a parcel's pickupCode
 * never changes once it arrives (see processor.ts), and a parcel that
 * produced a PICKUP_CODE_MISMATCH is, by the processor's own check order,
 * guaranteed to have been pending at that moment — so it's always
 * findable in the FINAL result's pending or collected list (it either
 * stayed pending, or was correctly collected by a later event), and that
 * list already carries its one true pickupCode. No new domain field, no
 * second source of truth — just a lookup into HandoverResult that already
 * exists.
 */
function RejectionDetails({ result }: { result: HandoverResult }) {
  const rejections = result.outcomes.filter((o) => REJECTED_OUTCOMES.has(o.outcome));
  if (rejections.length === 0) {
    return null;
  }

  const knownCodes = new Map(
    [...result.pending, ...result.collected].map((parcel) => [parcel.parcelId, parcel.pickupCode]),
  );

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="font-mono text-xs font-semibold tracking-widest text-rejected uppercase">
        {rejections.length} rejected — state unchanged
      </p>
      <ul className="flex flex-col gap-2">
        {rejections.map((outcome) => {
          const expected = knownCodes.get(outcome.event.parcelId);
          return (
            <li
              key={outcome.event.id}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border border-rejected/25 bg-rejected/5 px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs text-muted-foreground">{outcome.event.id}</span>
              <OutcomeBadge outcome={outcome.outcome} />
              {outcome.outcome === "PICKUP_CODE_MISMATCH" && expected ? (
                <span className="font-mono text-xs text-muted-foreground">
                  expected <span className="text-foreground">{expected}</span> · received{" "}
                  <span className="text-foreground">{outcome.event.pickupCode}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{OUTCOME_DESCRIPTIONS[outcome.outcome]}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
