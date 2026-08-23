import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { Panel } from "@/components/Panel";
import { ParcelLabel } from "@/components/ParcelLabel";
import type { HandoverResult } from "@/lib/types";
import { getShelfMap } from "@/lib/selectors";
import { popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface ShelfMapProps {
  result: HandoverResult | null;
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
}

/**
 * Spatial view of the board: one cell per shelf the event log has ever put
 * a parcel on, laid out as a rack rather than a list — including shelves
 * that are now EMPTY because their parcel was collected (see
 * `getShelfMap`, src/lib/selectors.ts), not just the currently-occupied
 * ones. Derived entirely from that one selector — no independent store,
 * no second copy of pending state; if this component were deleted,
 * nothing else in the app would need to change, and every parcel it shows
 * is the exact same ParcelLabel used in the Handover Board's Pending
 * column, wired to the same `selectedParcelId` cross-highlight.
 *
 * There is no fixed shelf inventory in this domain (shelf IDs are free
 * text entered on ARRIVE, not drawn from an enumerable set), so this
 * never fabricates a shelf ID that was never mentioned in the event log —
 * see the selector's own doc comment.
 */
export function ShelfMap({ result, selectedParcelId, onSelectParcel }: ShelfMapProps) {
  if (result === null || result.pending.length + result.collected.length === 0) {
    return null;
  }

  const slots = getShelfMap(result);
  const occupiedCount = slots.filter((slot) => slot.occupants.length > 0).length;

  return (
    <Panel
      headingId="shelf-map-heading"
      title="Shelf Map"
      subtitle="Live view of where pending parcels are kept."
      headerRight={`${occupiedCount} ${occupiedCount === 1 ? "shelf" : "shelves"} occupied`}
    >
      {/* grid-cols-2 sm:grid-cols-4 (not a staggered 2/3/4 ramp) — the brief
          asks for a horizontal A1 A2 B1 B2 row on desktop, and 4 compact
          cells fit comfortably in this column's width from the sm
          breakpoint up. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="shelf-map">
        <AnimatePresence initial={false}>
          {slots.map(({ shelf, occupants }) => {
            const occupied = occupants.length > 0;
            return (
              <motion.div
                key={shelf}
                variants={popIn}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn("flex flex-col gap-1.5 border p-2", occupied ? "border-border" : "border-dashed border-border")}
                data-testid={`shelf-${shelf}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold tracking-wide text-foreground">{shelf}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-mono text-[9px] tracking-wide uppercase",
                      occupied ? "bg-accent/15 text-accent" : "bg-surface-raised text-muted-foreground",
                    )}
                  >
                    {occupied ? (occupants.length > 1 ? `${occupants.length} occupied` : "occupied") : "empty"}
                  </span>
                </div>
                {occupied ? (
                  <div className="flex flex-col gap-1.5">
                    {occupants.map((parcel) => (
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
                        hideShelf
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex flex-1 items-center justify-center border border-dashed border-border-strong py-1.5 text-muted-foreground"
                  >
                    <Plus className="size-3.5" strokeWidth={1.5} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Panel>
  );
}
