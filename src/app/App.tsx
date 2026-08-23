import { useEffect, useReducer, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { Header } from "@/components/Header";
import { EventTable } from "@/components/EventTable";
import { ValidationBanner } from "@/components/ValidationBanner";
import { EventTimeline } from "@/components/EventTimeline";
import { HandoverBoard } from "@/components/HandoverBoard";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ShelfMap } from "@/components/ShelfMap";
import { Footer } from "@/components/Footer";
import { appReducer, createInitialState } from "@/app/appReducer";
import { prefersReducedMotion } from "@/lib/motion";
import type { HandoverResult } from "@/lib/types";

/** How long the timeline's stagger reveal takes before the footer's status
 *  flips from "Processing…" to "Handover complete." — sized to roughly
 *  match the Event Timeline's own stagger (90ms/event + a spring's settle
 *  time), bounded so it never reads as sluggish on a long event log. Not
 *  derived from Motion's own timing (see the effect below for why). */
function replayDurationMs(outcomeCount: number): number {
  if (prefersReducedMotion()) {
    // Nothing is visually animating for these users — see MotionConfig
    // reducedMotion="user" below — so there's nothing to wait out either.
    return 0;
  }
  return Math.min(1800, 450 + Math.max(0, outcomeCount - 1) * 90);
}

/**
 * Root component. This is the ONLY place *application* state lives (one
 * `useReducer` for rows/lastResult/validationErrors/selectedParcelId — see
 * appReducer.ts). `runStatus` below is deliberately NOT in that reducer:
 * it's a purely cosmetic "is the replay animation currently playing"
 * flag with no bearing on what any other component computes or renders,
 * so it stays local rather than being threaded through the app's one real
 * state machine.
 *
 * Render order mirrors the reference design's hierarchy — the Handover
 * Board is the visual hero, the editable table is a persistent utility
 * column, not the primary focus:
 *
 *   Header
 *     -> Handover Status (figures + Events Over Time chart)
 *     -> [ Handover Board / Shelf Map / Event Timeline ]  |  [ Event Log ]
 *   Footer
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
  // Only the TIMING half of runStatus needs its own state — "is the
  // post-run reveal still playing." The "idle" half is derived straight
  // from state.lastResult during render just below (no effect needed:
  // null is unambiguously idle regardless of this flag), and the
  // "processing" half is set directly from the click handler that causes
  // it (handleRun), not detected after the fact in an effect.
  const [isProcessing, setIsProcessing] = useState(false);
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
      const toComplete = setTimeout(() => setIsProcessing(false), replayDurationMs(state.lastResult.outcomes.length));
      return () => clearTimeout(toComplete);
    }
    previousResultRef.current = state.lastResult;
  }, [state.lastResult]);

  // lastResult === null (fresh load, Reset, or a failed validation) always
  // means "idle" immediately, regardless of `isProcessing` — there is
  // nothing to wait out in that case, so this takes priority over it.
  const runStatus: "idle" | "processing" | "complete" =
    state.lastResult === null ? "idle" : isProcessing ? "processing" : "complete";

  function handleRun() {
    setIsProcessing(true);
    dispatch({ type: "RUN" });
  }

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
      <div className="mx-auto flex min-h-svh w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Header onRun={handleRun} onReset={() => dispatch({ type: "RESET" })} />

        <SummaryPanel result={state.lastResult} />

        <ValidationBanner errors={state.validationErrors} />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <HandoverBoard result={state.lastResult} selectedParcelId={state.selectedParcelId} onSelectParcel={handleSelectParcel} />
            <ShelfMap result={state.lastResult} selectedParcelId={state.selectedParcelId} onSelectParcel={handleSelectParcel} />
            <EventTimeline result={state.lastResult} selectedParcelId={state.selectedParcelId} onSelectParcel={handleSelectParcel} />
          </div>

          <EventTable rows={state.rows} dispatch={dispatch} onRun={handleRun} />
        </div>

        <Footer runStatus={runStatus} />
      </div>
    </MotionConfig>
  );
}

export default App;
