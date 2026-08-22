import { Badge } from "@/components/ui/badge";
import type { HandoverResult } from "@/lib/types";
import { getShelfOccupancy } from "@/lib/selectors";

export interface ShelfMapProps {
  result: HandoverResult | null;
}

/**
 * Optional, secondary view (docs/PLAN.md Phase 11): which shelves currently
 * hold a pending parcel. Derived entirely from `getShelfOccupancy(result)`
 * — no independent store, no second copy of pending state; if this
 * component were deleted, nothing else in the app would need to change.
 *
 * Renders nothing (rather than an empty "shelf map" card) whenever there's
 * no run yet or no pending parcels, per PLAN's "omit if it clutters the
 * primary screen" — the Handover Board's Pending column already covers
 * that case with its own empty state.
 */
export function ShelfMap({ result }: ShelfMapProps) {
  if (result === null || result.pending.length === 0) {
    return null;
  }

  const shelves = getShelfOccupancy(result);

  return (
    <section aria-labelledby="shelf-map-heading" className="flex flex-col gap-3">
      <h2 id="shelf-map-heading" className="text-sm font-semibold text-foreground">
        Shelf Map
      </h2>
      <div className="flex flex-wrap gap-3" data-testid="shelf-map">
        {shelves.map(({ shelf, parcels }) => (
          <div key={shelf} className="rounded-lg border border-border px-3 py-2 text-sm">
            <p className="font-mono font-medium text-foreground">Shelf {shelf}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {parcels.map((parcel) => (
                <Badge key={parcel.parcelId} variant="secondary" className="font-mono">
                  {parcel.parcelId}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
