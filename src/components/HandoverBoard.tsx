import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { ParcelLabel } from "@/components/ParcelLabel";
import type { CollectedParcel, HandoverResult, PendingParcel } from "@/lib/types";
import { popIn } from "@/lib/motion";

export interface HandoverBoardProps {
  /** See EventTimeline.tsx for the null-vs-empty-result distinction. */
  result: HandoverResult | null;
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
}

/**
 * The final handover board: two columns, pending parcels awaiting pickup
 * and parcels already collected. This is the operational output of the
 * whole app — the visual hero of the screen (see the render order in
 * App.tsx), never secondary to the summary numbers or the chart.
 *
 * Both lists preserve the order processHandover() produced them in —
 * accepted-arrival order for pending, successful-collection order for
 * collected — never alphabetical or parcel-ID sorted (see
 * src/lib/processor.ts). We render them as-is with no client-side sort.
 */
export function HandoverBoard({ result, selectedParcelId, onSelectParcel }: HandoverBoardProps) {
  if (result === null) {
    return (
      <Panel headingId="board-heading" title="Handover Board" subtitle="Who's still on the shelf, who's been collected." testId="board-pre-run">
        <EmptyState title="No result yet" description="Run Handover to see the pending and collected board." testId="board-pre-run-empty" />
      </Panel>
    );
  }

  return (
    <Panel headingId="board-heading" title="Handover Board" subtitle="Who's still on the shelf, who's been collected.">
      {/* LayoutGroup scopes the two columns' ParcelLabel layoutIds together
          so a parcel moving from Pending to Collected (a re-run where it's
          now correctly picked up) animates as one continuous FLIP across
          the column boundary, not an unmount in one place and an
          unrelated mount in the other. */}
      <LayoutGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <BoardColumn
            label="Pending"
            tone="pending"
            parcels={result.pending}
            emptyState={<EmptyState title="No pending parcels" description="The desk is clear." testId="pending-empty" />}
            testId="pending-column"
            selectedParcelId={selectedParcelId}
            onSelectParcel={onSelectParcel}
          />
          <BoardColumn
            label="Collected"
            tone="collected"
            parcels={result.collected}
            emptyState={
              <EmptyState title="No parcels collected" description="Nothing has been picked up yet." testId="collected-empty" />
            }
            testId="collected-column"
            selectedParcelId={selectedParcelId}
            onSelectParcel={onSelectParcel}
          />
        </div>
      </LayoutGroup>
    </Panel>
  );
}

interface BoardColumnProps {
  label: string;
  tone: "pending" | "collected";
  parcels: (PendingParcel | CollectedParcel)[];
  emptyState: React.ReactNode;
  testId: string;
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
}

function BoardColumn({ label, tone, parcels, emptyState, testId, selectedParcelId, onSelectParcel }: BoardColumnProps) {
  const toneClass = tone === "collected" ? "text-success" : "text-accent";
  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      <div className="flex items-baseline justify-between">
        <h3 className={`font-mono text-xs font-semibold tracking-widest uppercase ${toneClass}`}>
          {label} <span className="text-muted-foreground">({String(parcels.length).padStart(2, "0")})</span>
        </h3>
      </div>

      {parcels.length === 0 ? (
        emptyState
      ) : (
        <ul className="flex flex-col gap-2">
          {/* AnimatePresence + a key on parcelId (stable across runs,
              unlike array index) is what lets Motion tell "this exact
              parcel is new" apart from "the list just re-rendered" — so
              only genuinely new parcels play the enter animation, and a
              parcel leaving this column (collected, or a re-run where it's
              no longer pending) plays its exit instead of vanishing.

              layoutId lives on this motion.li, not on ParcelLabel itself:
              it's the list ITEM's identity across the Pending/Collected
              boundary that needs to FLIP, and keeping ParcelLabel a plain,
              non-motion button keeps it trivially reusable in ShelfMap.tsx
              without dragging AnimatePresence/layout semantics along. */}
          <AnimatePresence initial={false}>
            {parcels.map((parcel) => (
              <motion.li
                key={parcel.parcelId}
                layoutId={`parcel-${parcel.parcelId}`}
                variants={popIn}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <ParcelLabel
                  parcelId={parcel.parcelId}
                  student={parcel.student}
                  shelf={parcel.shelf}
                  pickupCode={parcel.pickupCode}
                  tone={tone}
                  selected={selectedParcelId === parcel.parcelId}
                  dimmed={selectedParcelId !== null && selectedParcelId !== parcel.parcelId}
                  onSelect={onSelectParcel}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
