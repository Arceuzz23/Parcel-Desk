import { Package, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParcelLabelProps {
  parcelId: string;
  student: string;
  shelf: string;
  pickupCode: string;
  /** Collected parcels get a checked-box icon in the success color; pending get a plain box in the accent color. */
  tone: "pending" | "collected";
  /** Cross-highlight wiring — see appReducer.ts `selectedParcelId`. Clicking
   *  toggles selection; the same parcelId drives the matching highlight in
   *  the Event Timeline and Shelf Map, since all three views key off the
   *  one shared ID rather than duplicating "is this the selected thing"
   *  state per view. */
  selected: boolean;
  /** true when something else is selected and this parcel isn't it — fades
   *  this label back so the selected one reads as the focal point. Plain
   *  CSS transition (not Motion) — this is a two-state opacity toggle with
   *  no layout/enter/exit involved, and the caller (HandoverBoard/
   *  ShelfMap) already owns a motion.li for the enter/exit/FLIP animation
   *  one level up, so this component stays a plain, easily-reused button. */
  dimmed: boolean;
  onSelect: (parcelId: string) => void;
  /** Omits the "Shelf X" line — used inside ShelfMap.tsx, where the shelf
   *  ID is already the cell's own heading, so repeating it here was both
   *  redundant and, in that narrower grid cell, squeezing the student
   *  name into a premature truncation it didn't need. */
  hideShelf?: boolean;
}

/**
 * A single parcel, rendered like a physical shipping/pickup label rather
 * than a generic list row: a parcel-box icon (lucide `Package`/
 * `PackageCheck`, tone-colored) for at-a-glance status, the parcel ID as
 * the dominant (monospace) element, and student/shelf/code as secondary
 * fields underneath — the same four fields the spec calls out, the same
 * visual object reused everywhere a parcel appears (Handover Board's two
 * columns, the Shelf Map) so "this is a parcel" reads identically across
 * the whole screen.
 */
export function ParcelLabel({ parcelId, student, shelf, pickupCode, tone, selected, dimmed, onSelect, hideShelf }: ParcelLabelProps) {
  const Icon = tone === "collected" ? PackageCheck : Package;
  return (
    <button
      type="button"
      onClick={() => onSelect(parcelId)}
      aria-pressed={selected}
      data-testid={`parcel-${parcelId}`}
      className={cn(
        "group flex w-full items-center gap-3 border bg-surface-raised px-3 py-2 text-left transition-[opacity,border-color] duration-150",
        selected ? "border-accent" : "border-border hover:border-border-strong",
        dimmed ? "opacity-40" : "opacity-100",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-6 shrink-0", tone === "collected" ? "text-success" : "text-accent")}
        strokeWidth={1.5}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">{parcelId}</span>
          <span className="font-mono text-xs text-muted-foreground">{pickupCode}</span>
        </span>
        <span className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{student || "—"}</span>
          {!hideShelf && <span className="font-mono whitespace-nowrap uppercase">Shelf {shelf}</span>}
        </span>
      </span>
    </button>
  );
}
