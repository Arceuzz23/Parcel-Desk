import { useReducer } from "react";
import { MotionConfig } from "motion/react";
import { Header } from "@/components/Header";
import { EventTable } from "@/components/EventTable";
import { ValidationBanner } from "@/components/ValidationBanner";
import { EventTimeline } from "@/components/EventTimeline";
import { HandoverBoard } from "@/components/HandoverBoard";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ShelfMap } from "@/components/ShelfMap";
import { appReducer, createInitialState } from "@/app/appReducer";

/**
 * Root component. This is the ONLY place *application* state lives (one
 * `useReducer` for rows/lastResult/validationErrors/selectedParcelId — see
 * appReducer.ts). No other component-local state exists here — an earlier
 * pass had a cosmetic "replay status" flag driving a footer message; both
 * the footer and the flag were removed together (nothing else consumed
 * it), so this file is back to being just the reducer plus render.
 *
 * Render order is a dense, single-viewport desktop composition, not a long
 * scrolling page:
 *
 *   Header
 *     -> Handover Status (figures + Events Over Time chart)
 *     -> [ Handover Board / Event Timeline / Rejected Events ]  |  [ Shelf Map / Event Log ]
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
      <div className="mx-auto flex min-h-svh w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Header onRun={() => dispatch({ type: "RUN" })} onReset={() => dispatch({ type: "RESET" })} />

        <SummaryPanel result={state.lastResult} />

        <ValidationBanner errors={state.validationErrors} />

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* LEFT: Handover Board -> Event Timeline (which includes its own
              Rejected Events section — see EventTimeline.tsx) — the
              operational read of "what happened." */}
          <div className="flex flex-col gap-4">
            <HandoverBoard result={state.lastResult} selectedParcelId={state.selectedParcelId} onSelectParcel={handleSelectParcel} />
            <EventTimeline result={state.lastResult} selectedParcelId={state.selectedParcelId} onSelectParcel={handleSelectParcel} />
          </div>

          {/* RIGHT: Shelf Map -> Event Log — the spatial read of "where
              things are," then the editable input that drives the next run. */}
          <div className="flex flex-col gap-4">
            <ShelfMap result={state.lastResult} selectedParcelId={state.selectedParcelId} onSelectParcel={handleSelectParcel} />
            <EventTable rows={state.rows} dispatch={dispatch} />
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

export default App;
