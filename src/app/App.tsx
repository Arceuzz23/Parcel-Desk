import { useReducer } from "react";
import { MotionConfig } from "motion/react";
import { Header } from "@/components/Header";
import { EventTable } from "@/components/EventTable";
import { ValidationBanner } from "@/components/ValidationBanner";
import { EventOutcomes } from "@/components/EventOutcomes";
import { HandoverBoard } from "@/components/HandoverBoard";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ShelfMap } from "@/components/ShelfMap";
import { appReducer, createInitialState } from "@/app/appReducer";

/**
 * Root component. This is the ONLY place React state lives for the whole
 * app (one `useReducer`, no other top-level useState) — see appReducer.ts
 * for why a single reducer was chosen over a global state library.
 *
 * Render order mirrors the architecture diagram in docs/PLAN.md:
 *
 *   EVENT TABLE → VALIDATION → EVENT PROCESSOR → HANDOVER RESULT
 *     → OUTCOMES / BOARD / SUMMARY → UI
 *
 * `state.rows` (editable input) and `state.lastResult` (last processed
 * output) are two independent pieces of state on purpose: editing the
 * table dispatches ADD_ROW/UPDATE_FIELD/DELETE_ROW, none of which touch
 * lastResult, so the board/outcomes/summary you see stay exactly as they
 * were until you explicitly click "Run Handover" again. See "state
 * separation" in docs/PLAN.md.
 */
function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);

  return (
    // reducedMotion="user" makes every motion.* element in the tree
    // automatically honor the OS-level prefers-reduced-motion setting —
    // transforms/opacity still apply (so state changes are still visible),
    // but the animated transition between states is skipped. This is the
    // single point where that policy is applied; individual components
    // never need their own reduced-motion checks.
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Header onReset={() => dispatch({ type: "RESET" })} />

        <EventTable rows={state.rows} dispatch={dispatch} />

        <ValidationBanner errors={state.validationErrors} />

        <SummaryPanel result={state.lastResult} />

        <EventOutcomes result={state.lastResult} />

        <HandoverBoard result={state.lastResult} />

        <ShelfMap result={state.lastResult} />
      </div>
    </MotionConfig>
  );
}

export default App;
