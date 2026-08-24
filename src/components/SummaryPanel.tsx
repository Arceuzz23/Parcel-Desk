import { lazy, Suspense } from "react";
import NumberFlow from "@number-flow/react";
import { EmptyState } from "@/components/EmptyState";
import type { HandoverResult } from "@/lib/types";
import { getEventsOverTime, getSummary } from "@/lib/selectors";

/**
 * Lazy, not a static import — see docs/DECISIONS.md's bundle-size entry.
 * EventsOverTimeChart pulls in Bklit's area-chart machinery plus its d3/
 * visx dependency chain (~94 kB minified), and that weight is genuinely
 * unused until a run actually exists: pre-run, this panel renders the
 * static EmptyState below instead of mounting the chart at all, so the
 * chart chunk is never fetched on first load — only once `result` first
 * becomes non-null (i.e. after the user clicks Run Handover). This is a
 * real deferral, not just a cosmetic chunk split: gating render on
 * `result !== null` (below) is what makes it one, since React.lazy() only
 * defers a module's fetch until the component is actually asked to render.
 */
const EventsOverTimeChart = lazy(() =>
  import("@/components/EventsOverTimeChart").then((module) => ({ default: module.EventsOverTimeChart })),
);

export interface SummaryPanelProps {
  /** See EventTimeline.tsx for why this is `HandoverResult | null`, not a
   *  pre-computed HandoverSummary — keeping the raw result here (rather
   *  than a summary prop) means this component, not its caller, decides
   *  when it's meaningful to call getSummary() at all. */
  result: HandoverResult | null;
}

const NUMBER_FORMAT = { minimumIntegerDigits: 2 };

const FIGURES = [
  { key: "pending", label: "Pending", description: "Parcels waiting" },
  { key: "collected", label: "Collected", description: "Successfully collected" },
  { key: "rejected", label: "Rejected", description: "Events rejected" },
  { key: "events", label: "Events", description: "Total processed" },
] as const;

/**
 * The top status strip: four large editorial figures on the left, the
 * Events Over Time chart on the right, sharing one bordered panel. No
 * section heading — the figures speak for themselves, and a label like
 * "Handover Status" above them would just repeat what "Pending/Collected/
 * Rejected/Events" already say directly underneath each number.
 *
 * The fourth figure (Events = every outcome this run produced, rejections
 * included) is what keeps the chart honest — the chart's own pending/
 * collected/rejected lines already show all three series explicitly (see
 * EventsOverTimeChart.tsx), but "06 EVENTS" printed here removes any
 * remaining doubt about how many events this run actually processed.
 * `result.outcomes.length` is read directly — no new HandoverSummary field.
 *
 * Critical distinction (acceptance test 6, docs/DECISIONS.md): when
 * `result` is `null` (no run yet / just reset), figures show "—" rather
 * than 0 — an actual completed run over an empty table shows real 0s
 * instead. Collapsing those two into the same "0" would make Reset and
 * "ran on an empty table" visually identical, which the spec forbids.
 */
export function SummaryPanel({ result }: SummaryPanelProps) {
  const summary = result === null ? null : getSummary(result);
  const totalEvents = result === null ? undefined : result.outcomes.length;
  const eventsOverTime = result === null ? [] : getEventsOverTime(result);

  const values: Record<(typeof FIGURES)[number]["key"], number | undefined> = {
    pending: summary?.pending,
    collected: summary?.collected,
    rejected: summary?.rejected,
    events: totalEvents,
  };

  return (
    // Mount entrance now lives one level up, in App.tsx's entranceContainer/
    // entranceItem stagger — this used to own its own fadeInUp mount
    // animation independently; that would now double-animate against the
    // wrapping entranceItem, so this is a plain div again.
    <div
      className="grid grid-cols-1 gap-4 border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center"
      aria-label="Handover status"
    >
      {/* Always one horizontal row of four — never a 2x2 grid — matching
          the editorial metric strip in reference/final-ui.png. */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-2 sm:gap-x-6">
        {FIGURES.map((figure) => (
          <Figure
            key={figure.key}
            value={values[figure.key]}
            label={figure.label}
            description={figure.description}
            tone={figure.key === "rejected" ? "rejected" : figure.key === "collected" ? "success" : figure.key === "pending" ? "accent" : "default"}
            testId={`summary-${figure.key}`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase">Events Over Time (Run)</h2>
          <ChartLegend />
        </div>
        {result === null ? (
          // Pre-run: a plain EmptyState (already loaded — every panel uses
          // it) instead of mounting the lazy chart, so nothing under
          // EventsOverTimeChart is ever fetched until there's a result to
          // plot. Once `result` exists, an empty-run (0 events) still
          // renders the lazy chart below — its own internal empty-state
          // branch handles that case, same as before this change.
          <EmptyState
            title="No result yet"
            description="Run Handover to see events plotted over the run."
            testId="events-over-time-pre-run"
          />
        ) : (
          <Suspense fallback={<EmptyState title="Loading chart…" description="Just a moment." testId="events-over-time-loading" />}>
            <EventsOverTimeChart points={eventsOverTime} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function ChartLegend() {
  const items = [
    { label: "Pending", color: "bg-accent" },
    { label: "Collected", color: "bg-success" },
    { label: "Rejected", color: "bg-rejected" },
  ];
  return (
    <ul className="flex gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${item.color}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Figure({
  value,
  label,
  description,
  tone,
  testId,
}: {
  value: number | undefined;
  label: string;
  description: string;
  tone: "default" | "accent" | "success" | "rejected";
  testId: string;
}) {
  const toneClass =
    value === undefined
      ? "text-foreground"
      : tone === "accent"
        ? "text-accent"
        : tone === "success"
          ? "text-success"
          : tone === "rejected"
            ? "text-rejected"
            : "text-foreground";

  return (
    <div data-testid={testId} className="flex flex-col gap-0.5">
      <span className={`font-mono text-2xl leading-none font-bold tabular-nums sm:text-3xl lg:text-4xl ${toneClass}`}>
        {value === undefined ? (
          <span aria-label={`${label}: not run yet`}>—</span>
        ) : (
          <NumberFlow value={value} format={NUMBER_FORMAT} aria-label={`${label}: ${value}`} />
        )}
      </span>
      <span className={`font-mono text-xs font-semibold tracking-widest uppercase ${toneClass}`}>{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </div>
  );
}
