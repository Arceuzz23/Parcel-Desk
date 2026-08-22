import { RingChart } from "@/components/charts/ring-chart";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import type { RingData } from "@/components/charts/ring-context";
import type { HandoverSummary } from "@/lib/types";

export interface HandoverChartProps {
  summary: HandoverSummary;
}

/**
 * The one Bklit visualization this app uses (per docs/PLAN.md: "one
 * meaningful chart max, derived, no independent chart state"). It shows the
 * pending-vs-collected split of the board — how much of what arrived is
 * still waiting versus already handed over.
 *
 * Deliberately excludes `rejected` from the rings: rejected outcomes
 * (PARCEL_ALREADY_SEEN, ACTIVE_CODE_COLLISION, PARCEL_NOT_PENDING,
 * PICKUP_CODE_MISMATCH) never touch the board — they're not parcels in
 * either state, they're events that were refused. Mixing them into a
 * "board split" chart would misrepresent what the rings mean, so rejected
 * count stays a plain number in SummaryPanel instead.
 *
 * No local state here: `data` is recomputed from `summary` on every
 * render, which is itself just `getSummary(lastResult)` — the chart never
 * invents its own copy of pending/collected counts.
 */
export function HandoverChart({ summary }: HandoverChartProps) {
  const total = summary.pending + summary.collected;

  const data: RingData[] = [
    { label: "Pending", value: summary.pending, maxValue: total },
    { label: "Collected", value: summary.collected, maxValue: total },
  ];

  return (
    <div className="flex shrink-0 items-center justify-center" data-testid="handover-chart">
      {/* Sized to sit inline in the typographic summary row, not centered
          in its own wide card (see SummaryPanel.tsx — this used to live
          in a Card; the redesign moved it into the same figure row as
          Pending/Collected/Rejected/Events instead). */}
      <RingChart data={data} size={84} strokeWidth={9} ringGap={3} baseInnerRadius={26}>
        <Ring index={0} />
        <Ring index={1} />
        {/* "On board", not "Total" — this ring-chart center number is
            pending+collected only. Rejected events never reach the board
            (see the comment above), so when a run has rejections, this
            number is smaller than the event log's actual event count and
            a bare "Total" would misleadingly read as "all events
            processed." "On board" scopes it correctly at a glance, and the
            adjacent "06 EVENTS" figure + caption in SummaryPanel remove
            any remaining ambiguity. */}
        <RingCenter defaultLabel="On board" />
      </RingChart>
    </div>
  );
}
