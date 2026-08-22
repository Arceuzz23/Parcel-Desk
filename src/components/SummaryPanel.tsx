import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { HandoverChart } from "@/components/HandoverChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HandoverResult } from "@/lib/types";
import { getSummary } from "@/lib/selectors";
import { fadeInUp } from "@/lib/motion";

export interface SummaryPanelProps {
  /** See EventOutcomes.tsx for why this is `HandoverResult | null`, not a
   *  pre-computed HandoverSummary — keeping the raw result here (rather
   *  than a summary prop) means this component, not its caller, decides
   *  when it's meaningful to call getSummary() at all. */
  result: HandoverResult | null;
}

/**
 * Pending / Collected / Rejected counts, prominent, with a subtle
 * count-up transition (via @number-flow/react — already a transitive
 * dependency of the Bklit ring chart, reused here rather than
 * hand-rolling a second number-tweening implementation).
 *
 * Critical distinction (acceptance test 6, docs/DECISIONS.md): when
 * `result` is `null` (no run yet / just reset), tiles show "—" rather than
 * 0 — an actual completed run over an empty table shows real 0/0/0
 * instead. Collapsing those two into the same "0" would make Reset and
 * "ran on an empty table" visually identical, which the spec explicitly
 * forbids.
 */
export function SummaryPanel({ result }: SummaryPanelProps) {
  const summary = result === null ? null : getSummary(result);
  const total = summary === null ? 0 : summary.pending + summary.collected;

  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
      <h2 id="summary-heading" className="text-sm font-semibold text-foreground">
        Summary
      </h2>
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="flex flex-col gap-4 sm:flex-row">
        {/* The 3 stat tiles share the available width evenly. The chart
            (below) is a fixed-width sidecar, deliberately NOT a 4th column
            in this grid — giving it an equal 1/4 share squeezed a 128px
            ring chart into ~110px and clipped its center label. */}
        <div className="grid flex-1 grid-cols-3 gap-4">
          <StatTile label="Pending" value={summary?.pending} testId="summary-pending" />
          <StatTile label="Collected" value={summary?.collected} testId="summary-collected" />
          <StatTile label="Rejected" value={summary?.rejected} testId="summary-rejected" />
        </div>

        {/* Chart earns its place only once there's something to compare —
            an empty or pre-run board renders no rings, not a hollow one. */}
        {summary !== null && total > 0 && (
          <Card className="flex w-full shrink-0 items-center justify-center sm:w-44">
            <CardContent className="flex items-center justify-center py-2">
              <HandoverChart summary={summary} />
            </CardContent>
          </Card>
        )}
      </motion.div>
    </section>
  );
}

function StatTile({ label, value, testId }: { label: string; value: number | undefined; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          {value === undefined ? (
            <span aria-label={`${label}: not run yet`}>—</span>
          ) : (
            <NumberFlow value={value} aria-label={`${label}: ${value}`} />
          )}
        </span>
      </CardContent>
    </Card>
  );
}
