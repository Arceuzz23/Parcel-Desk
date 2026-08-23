import { Box, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeaderProps {
  onRun: () => void;
  onReset: () => void;
}

/**
 * The wordmark + the two global actions. Run Handover is duplicated here
 * AND next to the Event Log table (EventTable.tsx) — both dispatch the
 * exact same `{ type: "RUN" }` action via the `onRun` callback threaded
 * down from App.tsx, so there is exactly one RUN code path, just two
 * entry points to it (always-visible in the header vs. contextually next
 * to the table you're editing).
 *
 * Typography here is the app's one deliberately decorative moment — mono,
 * wide tracking, a two-tone wordmark (PARCEL in the neutral foreground,
 * DESK in the accent) — every other heading in the app reuses this same
 * register (mono + tracking-wide) at a smaller scale, so it reads as one
 * consistent identity rather than a one-off logo treatment.
 */
export function Header({ onRun, onReset }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border-strong pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center border border-accent/50 text-accent">
          <Box className="size-5" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight uppercase">
            <span className="text-foreground">Parcel</span> <span className="text-accent">Desk</span>
          </h1>
          <p className="font-mono text-xs font-medium tracking-[0.3em] text-muted-foreground uppercase">
            Hostel Operations Console
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Run the handover to process events and view the final board state.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={onRun} className="font-mono text-xs tracking-widest uppercase">
          <Play className="fill-current" aria-hidden="true" />
          Run Handover
        </Button>
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
      </div>
    </header>
  );
}
