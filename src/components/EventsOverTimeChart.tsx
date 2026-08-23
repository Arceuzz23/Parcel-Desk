import { AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { Area } from "@/components/charts/area";
import { EmptyState } from "@/components/EmptyState";
import type { EventsOverTimePoint } from "@/lib/selectors";

export interface EventsOverTimeChartProps {
  points: EventsOverTimePoint[];
}

const SERIES = [
  { key: "pending", label: "Pending", color: "var(--accent)" },
  { key: "collected", label: "Collected", color: "var(--success)" },
  { key: "rejected", label: "Rejected", color: "var(--rejected)" },
] as const;

// AreaChart's x-scale (src/components/charts/time-series-chart-shell.tsx)
// always coerces its xDataKey field through `new Date(...)`, and its
// built-in <XAxis> formats ticks as calendar dates — it's a genuine
// time-series component, not a categorical one, and there's no prop to
// override that tick formatter. Rather than force real event IDs through
// a date formatter (or fork the vendor file), this feeds it synthetic,
// evenly-spaced Date objects purely as an ordinal x-position — one
// artificial "day" per event — and renders the real E01/E02/... labels
// itself in a plain flex row underneath, using AreaChart's own margin
// values so the two rows land in the same columns. Bklit still does the
// actual meaningful work here: the area/line rendering, gradients, and
// grid.
const SYNTHETIC_DAY_MS = 24 * 60 * 60 * 1000;
const CHART_MARGIN = { top: 16, right: 12, bottom: 8, left: 12 };

/**
 * "Events Over Time (Run)" — a running tally of pending/collected/rejected
 * after each event, in source order. Built from `getEventsOverTime()`
 * (src/lib/selectors.ts), itself a pure aggregation over the already-
 * classified `result.outcomes` — this component invents no data of its
 * own and re-decides nothing about ARRIVE/COLLECT/rejection.
 */
export function EventsOverTimeChart({ points }: EventsOverTimeChartProps) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="No result yet"
        description="Run Handover to see events plotted over the run."
        testId="events-over-time-pre-run"
      />
    );
  }

  const maxValue = Math.max(1, ...points.flatMap((point) => [point.pending, point.collected, point.rejected]));
  const yTicks = buildYTicks(maxValue);
  const data = points.map((point, index) => ({
    date: new Date(index * SYNTHETIC_DAY_MS),
    pending: point.pending,
    collected: point.collected,
    rejected: point.rejected,
  }));

  return (
    <div className="flex flex-col gap-1" data-testid="events-over-time-chart">
      <div className="flex gap-2">
        {/* Y-axis labels: a flex column matching the chart's own top/bottom
            margin via padding, so ticks land roughly level with the Area
            chart's gridlines without reading any internal scale math. */}
        <div
          className="flex flex-col justify-between text-right font-mono text-[10px] text-muted-foreground"
          style={{ paddingTop: CHART_MARGIN.top, paddingBottom: CHART_MARGIN.bottom }}
          aria-hidden="true"
        >
          {yTicks
            .slice()
            .reverse()
            .map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
        </div>
        <AreaChart data={data} xDataKey="date" margin={CHART_MARGIN} aspectRatio="2.6 / 1" animationDuration={700}>
          <Grid horizontal rowTickValues={yTicks} strokeDasharray="3,3" />
          {SERIES.map((series) => (
            <Area key={series.key} dataKey={series.key} stroke={series.color} fill={series.color} fillOpacity={0.18} strokeWidth={2} />
          ))}
        </AreaChart>
      </div>
      {/* X-axis labels — the real event IDs, evenly spaced to match the
          synthetic evenly-spaced dates above. */}
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground" style={{ paddingLeft: CHART_MARGIN.left + 24, paddingRight: CHART_MARGIN.right }}>
        {points.map((point) => (
          <span key={point.eventId}>{point.eventId}</span>
        ))}
      </div>
    </div>
  );
}

/** Y-axis ticks from 0 to the next whole number ≥ maxValue, at most 4
 *  steps — keeps small counts (the common case: a handful of events) from
 *  producing a cramped axis. */
function buildYTicks(maxValue: number): number[] {
  const top = Math.max(1, Math.ceil(maxValue));
  const stepCount = Math.min(top, 4);
  const step = Math.ceil(top / stepCount);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) {
    ticks.push(value);
  }
  if (ticks[ticks.length - 1] !== top) {
    ticks.push(top);
  }
  return ticks;
}
