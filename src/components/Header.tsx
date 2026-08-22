import { Button } from "@/components/ui/button";

export interface HeaderProps {
  onReset: () => void;
}

/**
 * App title + the one global action (Reset). Everything else (Add Event,
 * Run Handover) lives next to the table it operates on, since those are
 * scoped to the event log rather than the whole screen.
 */
export function Header({ onReset }: HeaderProps) {
  return (
    <header className="flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Hostel Parcel-Desk Handover Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the event log, run the handover, and review outcomes against the final board state.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        // Restores the exact 6 built-in events and clears any prior
        // outcomes/board/summary — see appReducer.ts RESET.
        aria-label="Reset to the built-in sample events and clear the current result"
      >
        Reset
      </Button>
    </header>
  );
}
