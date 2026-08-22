import { useEffect, useReducer, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { Header } from "@/components/Header";
import { EventTable } from "@/components/EventTable";
import { ValidationBanner } from "@/components/ValidationBanner";
import { EventTimeline } from "@/components/EventTimeline";
import { HandoverBoard } from "@/components/HandoverBoard";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ShelfMap } from "@/components/ShelfMap";
import { appReducer, createInitialState } from "@/app/appReducer";
import { prefersReducedMotion } from "@/lib/motion";
import type { HandoverResult } from "@/lib/types";

/** How long the "PROCESSING…" status shows before flipping to "HANDOVER
 *  COMPLETE" — sized to roughly match the Event Timeline's own stagger
 *  reveal (90ms/event + a spring's settle time) so the status line and the
 *  actual on-screen animation finish together. Not derived programmatically
 *  from Motion's own timing (see the comment in the effect below for why),
 *  but bounded so it never reads as sluggish even on a long event log. */
function replayDurationMs(outcomeCount: number): number {
  if (prefersReducedMotion()) {
    // Nothing is visually animating for these users — see MotionConfig
    // reducedMotion="user" below — so there's nothing to wait out either.
    return 0;
  }
  return Math.min(1800, 450 + Math.max(0, outcomeCount - 1) * 90);
}

/** How long "HANDOVER COMPLETE" stays up before the status line clears. */
const COMPLETE_HOLD_MS = 1400;

/**
 * Root component. This is the ONLY place *application* state lives (one
 * `useReducer` for rows/lastResult/validationErrors/selectedParcelId — see
 * appReducer.ts). `runStatus` below is deliberately NOT in that reducer:
 * it's a purely cosmetic "is the replay animation currently playing"
 * flag with no bearing on what any other component computes or renders,
 * so it stays local rather than being threaded through the app's one real
 * state machine.
 *
 * Render order mirrors the redesign's information hierarchy — the
 * Handover Board is the visual hero, the editable table is a utility at
 * the bottom, not the other way around:
 *
 *   Header → Handover Status (Summary) → Handover Board / Shelf Map
 *     → Event Timeline → Validation → Editable Event Log
 *
 * `state.rows` (editable input) and `state.lastResult` (last processed
 * output) are two independent pieces of reducer state on purpose: editing
 * the table dispatches ADD_ROW/UPDATE_FIELD/DELETE_ROW, none of which touch
 * lastResult, so the board/timeline/summary you see stay exactly as they
 * were until you explicitly click "Run Handover" again. See "state
 * separation" in docs/PLAN.md.
 */
function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const [runStatus, setRunStatus] = useState<"idle" | "processing" | "complete">("idle");
  const previousResultRef = useRef<HandoverResult | null>(null);

  // Detects "a run just succeeded" by watching for lastResult becoming a
  // NEW non-null object — processHandover() always returns a fresh object
  // on every call (see its purity test in src/tests/domain/processor.
  // test.ts), so even two runs that produce an identical-looking result
  // are still distinguishable by reference. This intentionally does NOT
  // hook into Motion's onAnimationComplete: the Event Timeline's stagger
  // container only orchestrates ITS CHILDREN's timing via variants (it has
  // no animatable value of its own), and that orchestration-only pattern
  // does not reliably fire a parent onAnimationComplete — a plain,
  // analytically-sized timer is the more predictable choice here.
  useEffect(() => {
    if (state.lastResult !== null && state.lastResult !== previousResultRef.current) {
      previousResultRef.current = state.lastResult;
      setRunStatus("processing");
      const outcomeCount = state.lastResult.outcomes.length;
      const toComplete = setTimeout(() => setRunStatus("complete"), replayDurationMs(outcomeCount));
      const toIdle = setTimeout(() => setRunStatus("idle"), replayDurationMs(outcomeCount) + COMPLETE_HOLD_MS);
      return () => {
        clearTimeout(toComplete);
        clearTimeout(toIdle);
      };
    }
    previousResultRef.current = state.lastResult;
  }, [state.lastResult]);

  function handleSelectParcel(parcelId: string) {
    dispatch({ type: "SELECT_PARCEL", parcelId });
  }

  return (
    // reducedMotion="user" makes every motion.* element in the tree
    // automatically honor the OS-level prefers-reduced-motion setting —
    // transforms/opacity still apply (so state changes are still visible),
    // but the animated transition between states is skipped. This is the
    // single point where that policy is applied; individual components
    // never need their own reduced-motion checks.
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <Header onReset={() => dispatch({ type: "RESET" })} />

        <SummaryPanel result={state.lastResult} runStatus={runStatus} />

        <div className="flex flex-col gap-6">
          <HandoverBoard
            result={state.lastResult}
            selectedParcelId={state.selectedParcelId}
            onSelectParcel={handleSelectParcel}
          />
          <ShelfMap
            result={state.lastResult}
            selectedParcelId={state.selectedParcelId}
            onSelectParcel={handleSelectParcel}
          />
        </div>

        <EventTimeline
          result={state.lastResult}
          selectedParcelId={state.selectedParcelId}
          onSelectParcel={handleSelectParcel}
        />

        <div className="flex flex-col gap-3 border-t border-border-strong pt-8">
          <ValidationBanner errors={state.validationErrors} />
          <EventTable rows={state.rows} dispatch={dispatch} />
        </div>
      </div>
    </MotionConfig>
  );
}

export default App;
