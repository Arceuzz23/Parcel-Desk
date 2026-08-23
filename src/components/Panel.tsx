import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelProps {
  title: string;
  subtitle?: string;
  /** Right-aligned slot next to the title — a count, a status pill, etc. */
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
  headingId: string;
}

/**
 * The one bordered-panel chrome every major section (Handover Board, Shelf
 * Map, Event Timeline, Event Log) shares in the reference design — a
 * title/subtitle header over a divider, then content. Factored out once
 * both to avoid repeating the same border/padding/heading markup four
 * times and so the visual language (border weight, header type scale,
 * spacing) can only drift in one place if it drifts at all.
 */
export function Panel({ title, subtitle, headerRight, children, className, testId, headingId }: PanelProps) {
  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-3 border border-border bg-surface p-4", className)} data-testid={testId}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5 border-b border-border-strong pb-2">
        <div>
          <h2 id={headingId} className="font-mono text-sm font-semibold tracking-widest text-foreground uppercase">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {headerRight && <div className="font-mono text-xs text-muted-foreground">{headerRight}</div>}
      </div>
      {children}
    </section>
  );
}
