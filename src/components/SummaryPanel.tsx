import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { HandoverChart } from "@/components/HandoverChart";
import type { HandoverResult } from "@/lib/types";
import { getSummary } from "@/lib/selectors";
import { fadeInUp } from "@/lib/motion";

export interface SummaryPanelProps {
  /** See EventTimeline.tsx for why this is `HandoverResult | null`, not a
   *  pre-computed HandoverSummary — keeping the raw result here (rather
   *  than a summary prop) means this component, not its caller, decides
   *  when it's meaningful to call getSummary() at all. */
  result: HandoverResult | null;
  /** Purely cosmetic "is the replay animation currently playing" status —
   *  see App.tsx. Not part of the app's real state model. */
  runStatus: "idle" | "processing" | "complete";
}

const NUMBER_FORMAT = { minimumIntegerDigits: 2 };

/**
 * A typographic operational summary — large zero-padded numbers, small
 * caps labels, no card containers (item 4 of the redesign brief). Four
 * figures, not three: Pending / Collected / Rejected / Events. The fourth
 * one (Events = every outcome this run produced, rejections included) is
 * what keeps the retained Bklit chart honest — that ring only ever shows
 * the pending/collected SPLIT, so without an explicit total sitting right
 * next to it, "4" could misread as "4 events happened" when a run has
 * rejections (the canonical oracle: 6 events, 1 rejected, board total 4).
 * With "06 EVENTS" printed right here, there's no ambiguity left to read
 * into the chart.
 *
 * `result.outcomes.length` (not a new HandoverSummary field) is the event
 * count — no src/lib/ change needed, it's already on HandoverResult.
 *
 * Critical distinction (acceptance test 6, docs/DECISIONS.md): when
 * `result` is `null` (no run yet / just reset), figures show "—" rather
 * than 0 — an actual completed run over an empty table shows real 0s
 * instead. Collapsing those two into the same "0" would make Reset and
 * "ran on an empty table" visually identical, which the spec forbids.
 */
export function SummaryPanel({ result, runStatus }: SummaryPanelProps) {
  const summary = result === null ? null : getSummary(result);
  const totalEvents = result === null ? undefined : result.outcomes.length;
  const boardTotal = summary === null ? 0 : summary.pending + summary.collected;

  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 id="summary-heading" className="font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Handover Status
        </h2>
        {/* "Replay" status — see App.tsx for how this is timed. A live
            region so screen reader users get "processing"/"complete" as an
            announcement, not just a color/text change they'd have to be
            looking at the right moment to see. */}
        <span aria-live="polite" data-testid="run-status" className="font-mono text-[11px] tracking-widest uppercase">
          {runStatus === "processing" && <span className="animate-pulse text-accent">● Processing</span>}
          {runStatus === "complete" && <span className="text-success">✓ Handover Complete</span>}
        </span>
      </div>
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-b border-border-strong pb-6"
      >
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <Figure value={summary?.pending} label="Pending" testId="summary-pending" />
          <Figure value={summary?.collected} label="Collected" testId="summary-collected" />
          <Figure value={summary?.rejected} label="Rejected" tone="rejected" testId="summary-rejected" />
          <Figure value={totalEvents} label="Events" testId="summary-events" />
        </div>

        {/* Chart earns its place only once there's something to compare —
            an empty or pre-run board renders no rings, not a hollow one. */}
        {summary !== null && boardTotal > 0 && (
          <div className="flex items-center gap-3">
            <HandoverChart summary={summary} />
            <p className="max-w-[6rem] text-xs text-muted-foreground">Pending / Collected split of the board</p>
          </div>
        )}
      </motion.div>
    </section>
  );
}

function Figure({
  value,
  label,
  tone = "default",
  testId,
}: {
  value: number | undefined;
  label: string;
  tone?: "default" | "rejected";
  testId: string;
}) {
  return (
    <div data-testid={testId} className="flex flex-col gap-0.5">
      <span
        className={
          "font-mono text-4xl leading-none font-semibold tabular-nums sm:text-5xl " +
          (tone === "rejected" && value ? "text-rejected" : "text-foreground")
        }
      >
        {value === undefined ? <span aria-label={`${label}: not run yet`}>—</span> : <NumberFlow value={value} format={NUMBER_FORMAT} aria-label={`${label}: ${value}`} />}
      </span>
      <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{label}</span>
    </div>
  );
}
