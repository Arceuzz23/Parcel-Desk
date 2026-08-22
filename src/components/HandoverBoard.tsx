import { AnimatePresence, motion } from "motion/react";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CollectedParcel, HandoverResult, PendingParcel } from "@/lib/types";
import { fadeInUp, pendingParcelItem, popIn } from "@/lib/motion";

export interface HandoverBoardProps {
  /** See EventOutcomes.tsx for the null-vs-empty-result distinction. */
  result: HandoverResult | null;
}

/**
 * The final handover board: two columns, pending parcels awaiting pickup
 * and parcels already collected. This is the operational output of the
 * whole app — per the spec it must never read as secondary to the summary
 * numbers or the optional chart, so it gets the largest, most concrete
 * presentation (full parcel/student/shelf detail, not just counts).
 *
 * Both lists preserve the order processHandover() produced them in —
 * accepted-arrival order for pending, successful-collection order for
 * collected — never alphabetical or parcel-ID sorted (see
 * src/lib/processor.ts). We render them as-is with no client-side sort.
 */
export function HandoverBoard({ result }: HandoverBoardProps) {
  if (result === null) {
    return (
      <section aria-labelledby="board-heading" className="flex flex-col gap-3 border-t border-border pt-6">
        <BoardHeading />
        <EmptyState
          title="No result yet"
          description="Run Handover to see the pending and collected board."
          testId="board-pre-run"
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="board-heading" className="flex flex-col gap-3 border-t border-border pt-6">
      <BoardHeading />
      {/* fadeInUp here (mirroring SummaryPanel/EventOutcomes) plays once
          when this branch first mounts — i.e. right when a run produces a
          result — so the board visibly settles into place as "the answer
          just arrived," reinforcing that this section is the payoff of
          clicking Run Handover, not incidental content below it. */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2">
        <PendingColumn parcels={result.pending} />
        <CollectedColumn parcels={result.collected} />
      </motion.div>
    </section>
  );
}

/**
 * Deliberately larger than every other section heading in the app
 * (text-lg vs. everyone else's text-sm) — the Handover Board is the
 * operational output of the whole screen (docs/PLAN.md: "never secondary
 * to charts"), so it gets the one heading that visually outranks its own
 * column headers (Pending/Collected use the shadcn CardTitle default,
 * text-base) rather than being smaller than them.
 */
function BoardHeading() {
  return (
    <div>
      <h2 id="board-heading" className="text-lg font-semibold text-foreground">
        Handover Board
      </h2>
      <p className="text-sm text-muted-foreground">The final result — who's still on the shelf, who's been collected.</p>
    </div>
  );
}

function PendingColumn({ parcels }: { parcels: PendingParcel[] }) {
  return (
    <Card data-testid="pending-column">
      <CardHeader>
        <CardTitle>Pending ({parcels.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {parcels.length === 0 ? (
          // Exact spec copy — required verbatim.
          <EmptyState title="No pending parcels" description="The desk is clear." testId="pending-empty" />
        ) : (
          <ul className="flex flex-col gap-2">
            {/* AnimatePresence + a key on parcelId (stable across runs,
                unlike array index) is what lets Motion tell "this exact
                parcel is new" apart from "the list just re-rendered" — so
                only genuinely new pending parcels play the enter animation. */}
            <AnimatePresence initial={false}>
              {parcels.map((parcel) => (
                <motion.li
                  key={parcel.parcelId}
                  variants={pendingParcelItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono font-medium text-foreground">{parcel.parcelId}</span>
                    <span className="font-mono text-xs text-muted-foreground">{parcel.pickupCode}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2 text-muted-foreground">
                    <span>{parcel.student}</span>
                    <span>Shelf {parcel.shelf}</span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CollectedColumn({ parcels }: { parcels: CollectedParcel[] }) {
  return (
    <Card data-testid="collected-column">
      <CardHeader>
        <CardTitle>Collected ({parcels.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {parcels.length === 0 ? (
          <EmptyState
            title="No parcels collected"
            description="Nothing has been picked up yet."
            testId="collected-empty"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {parcels.map((parcel) => (
                <motion.li
                  key={parcel.parcelId}
                  variants={popIn}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  // A tinted background here (bg-status-success/5) used to
                  // sit under text-muted-foreground child text; axe-core
                  // flagged that combination as failing WCAG AA contrast
                  // (4.43:1, just under the 4.5:1 minimum) even though the
                  // same gray passes comfortably on the plain card
                  // background used elsewhere. The border alone still
                  // conveys "this row is in the collected column" —
                  // status here is never color-only anyway, since the
                  // column heading and OutcomeBadge already say so in text.
                  className="rounded-md border border-status-success/30 bg-card px-3 py-2 text-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono font-medium text-foreground">{parcel.parcelId}</span>
                    <span className="font-mono text-xs text-muted-foreground">{parcel.pickupCode}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2 text-muted-foreground">
                    <span>{parcel.student}</span>
                    <span>Shelf {parcel.shelf}</span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
