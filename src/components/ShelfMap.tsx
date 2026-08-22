import { AnimatePresence, motion } from "motion/react";
import { ParcelLabel } from "@/components/ParcelLabel";
import type { HandoverResult } from "@/lib/types";
import { getShelfOccupancy } from "@/lib/selectors";
import { popIn } from "@/lib/motion";

export interface ShelfMapProps {
  result: HandoverResult | null;
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
}

/**
 * Spatial view of the board: one bay per shelf that currently holds a
 * pending parcel, laid out as a rack rather than a list. Derived entirely
 * from `getShelfOccupancy(result)` (src/lib/selectors.ts) — no independent
 * store, no second copy of pending state; if this component were deleted,
 * nothing else in the app would need to change, and every parcel it shows
 * is the exact same ParcelLabel used in the Handover Board's Pending
 * column, wired to the same `selectedParcelId` cross-highlight.
 *
 * Only occupied shelves are rendered — the domain has no concept of a
 * fixed shelf inventory (shelf IDs are free text entered on ARRIVE, not
 * drawn from an enumerable set), so fabricating "empty" bays for shelf IDs
 * that were never used would be inventing data that doesn't exist. Instead,
 * "occupied" is communicated per-bay: an occupied-count marker and the
 * parcel label(s) inside it — see the comment on BAY below.
 *
 * Renders nothing (rather than an empty "shelf map" section) whenever
 * there's no run yet or no pending parcels — the Handover Board's Pending
 * column already covers that case with its own empty state, and an empty
 * rack here would just be clutter.
 */
export function ShelfMap({ result, selectedParcelId, onSelectParcel }: ShelfMapProps) {
  if (result === null || result.pending.length === 0) {
    return null;
  }

  const shelves = getShelfOccupancy(result);

  return (
    <section aria-labelledby="shelf-map-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="shelf-map-heading" className="font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Shelf Map
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          {shelves.length} {shelves.length === 1 ? "shelf" : "shelves"} occupied
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-4" data-testid="shelf-map">
        <AnimatePresence initial={false}>
          {shelves.map(({ shelf, parcels }) => (
            <motion.div
              key={shelf}
              variants={popIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-2 bg-background p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-semibold tracking-wide text-foreground">{shelf}</span>
                <span
                  aria-hidden="true"
                  className="rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-accent uppercase"
                >
                  {parcels.length > 1 ? `${parcels.length} occupied` : "occupied"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {parcels.map((parcel) => (
                  <ParcelLabel
                    key={parcel.parcelId}
                    parcelId={parcel.parcelId}
                    student={parcel.student}
                    shelf={parcel.shelf}
                    pickupCode={parcel.pickupCode}
                    tone="pending"
                    selected={selectedParcelId === parcel.parcelId}
                    dimmed={selectedParcelId !== null && selectedParcelId !== parcel.parcelId}
                    onSelect={onSelectParcel}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
