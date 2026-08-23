export interface FooterProps {
  runStatus: "idle" | "processing" | "complete";
}

/**
 * Three-part footer strip. The center slot is the same replay-status
 * signal SummaryPanel used to show as a small pill (see App.tsx's
 * `runStatus` — a local, non-reducer flag with no bearing on any other
 * component's data) — relocated here to match the reference layout,
 * where it reads as a settled, persistent status line rather than a
 * transient badge.
 */
export function Footer({ runStatus }: FooterProps) {
  return (
    <footer className="flex flex-col items-center gap-1 border-t border-border-strong pt-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
      <p>All changes are in-memory only. No data is persisted.</p>
      <p aria-live="polite" data-testid="run-status" className="font-mono tracking-wide text-foreground">
        {runStatus === "processing" && <span className="animate-pulse text-accent">Processing…</span>}
        {runStatus === "complete" && <span>Handover complete.</span>}
      </p>
      <p>Built for hostel operations, by students.</p>
    </footer>
  );
}
