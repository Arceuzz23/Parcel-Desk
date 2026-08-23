/**
 * Generic empty-state block: a bold title line + a muted description line,
 * centered in whatever container it's placed in. Reused across the app for
 * every "there's nothing here" moment — the event table with zero rows, an
 * empty pending column, an empty collected column, and the pre-run
 * placeholder — so the visual language for "empty" stays consistent
 * instead of every section inventing its own wording/spacing.
 *
 * Copy is passed in by the caller rather than hard-coded here, because the
 * spec mandates *exact* wording per context (e.g. "No pending parcels /
 * The desk is clear.") — this component only owns the layout.
 */
export interface EmptyStateProps {
  title: string;
  description: string;
  /** data-testid hook for Playwright — lets E2E tests assert on a specific
   *  empty state (e.g. "pre-run" vs "empty-run") without string-matching
   *  visible text, which is fragile to copy edits. */
  testId?: string;
}

export function EmptyState({ title, description, testId }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 border border-dashed border-border px-6 py-5 text-center"
      data-testid={testId}
    >
      <p className="font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
