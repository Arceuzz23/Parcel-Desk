import { Button } from "@/components/ui/button";

export interface HeaderProps {
  onReset: () => void;
}

/**
 * The wordmark + the one global action (Reset). Everything else (Add
 * Event, Run Handover) lives next to the table it operates on, since
 * those are scoped to the event log rather than the whole screen.
 *
 * Typography here is the app's one deliberately decorative moment (item
 * 12: "distinctive display treatment for PARCELDESK, major counts,
 * section headings") — mono, wide tracking, small accent-colored eyebrow
 * over a larger console-style title. Every other heading in the app reuses
 * this same register (mono + tracking-wide) at a smaller scale, so it
 * reads as one consistent identity rather than a one-off logo treatment.
 */
export function Header({ onReset }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-border-strong pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-xs font-medium tracking-[0.3em] text-accent uppercase">Hostel Parcel Desk</p>
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground uppercase">Operations Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the event log, run the handover, and follow it through to the final board.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        // Restores the exact 6 built-in events and clears any prior
        // outcomes/board/summary — see appReducer.ts RESET.
        aria-label="Reset to the built-in sample events and clear the current result"
        className="font-mono text-xs tracking-widest uppercase"
      >
        Reset
      </Button>
    </header>
  );
}
