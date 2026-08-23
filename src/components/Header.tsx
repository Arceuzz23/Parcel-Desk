import { Box, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeaderProps {
  onRun: () => void;
  onReset: () => void;
}

/**
 * The wordmark + the two global actions. Run Handover lives ONLY here —
 * one primary action, one place to find it (the Event Log used to have
 * its own duplicate button; removed so there's exactly one Run Handover
 * control in the app, not two doing the same thing).
 *
 * Typography here is the app's one deliberately decorative moment — mono,
 * wide tracking, a two-tone wordmark (PARCEL in the neutral foreground,
 * DESK in the accent) — every other heading in the app reuses this same
 * register (mono + tracking-wide) at a smaller scale, so it reads as one
 * consistent identity rather than a one-off logo treatment.
 */
export function Header({ onRun, onReset }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-border-strong pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center border border-accent/50 text-accent">
          <Box className="size-4" strokeWidth={1.5} />
        </span>
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-mono text-xl leading-none font-bold tracking-tight uppercase">
              <span className="text-foreground">Parcel</span> <span className="text-accent">Desk</span>
            </h1>
            <p className="font-mono text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
              Hostel Operations Console
            </p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Run the handover to process events and view the final board state.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={onRun} data-testid="run-handover" className="font-mono text-xs tracking-widest uppercase">
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
