# Engineering Decisions

- Domain logic isolated from React — testable standalone, portable.
- Full-table validation before processing — no partial/stale output on error.
- Event log is source of truth — no derived state duplicated elsewhere.
- No backend/database — P11 explicitly excludes them; production version
  discussed only in SYSTEM-DESIGN.md.
- No global state library — app is small enough for React state + reducer.
- Motion is presentation-only, zero domain coupling.
- Bklit used for at most one chart — visualization must earn its place.
- Playwright MCP is a dev-time tool, not a runtime or CI dependency.
- Pickup code regex is `^[A-Z0-9]{4}$` (mixed alphanumeric per character,
  not "all-letters XOR all-digits") — confirmed against spec examples.
- Reset state and empty-run state are visually distinct: reset = no result
  yet; empty run = a completed run that found zero events.
- Canonical fixture is shallow-cloned into editable state; never mutated directly.
- `HandoverResult` does not carry a `summary` field — `getSummary()` derives
  it from `{ outcomes, pending, collected }` on demand (selectors.ts). Keeps
  `processHandover()`'s output minimal and matches the Phase 4/5 split in
  PLAN.md (processor vs. selectors).
- Rejected count = outcomes whose type is one of the four state-rejection
  types (`PARCEL_ALREADY_SEEN`, `ACTIVE_CODE_COLLISION`, `PARCEL_NOT_PENDING`,
  `PICKUP_CODE_MISMATCH`); `ARRIVED`/`COLLECTED` are never counted as
  rejected. Verified against the canonical oracle (1 rejected = 1
  PICKUP_CODE_MISMATCH).
- Editable table rows carry a UI-only `key` (crypto.randomUUID()) separate
  from the domain `Event.id` field, because the Event ID is free-text the
  user can edit, blank, or duplicate — it can't double as a React
  reconciliation key. `src/lib/` never sees this key; it's stripped at the
  `AppState.rows -> EventInput[]` boundary in appReducer.ts.
- Single `useReducer` (appReducer.ts) is the only React state in the app —
  no separate useState calls scattered across components. RUN is the only
  action that touches `lastResult`; ADD_ROW/UPDATE_FIELD/DELETE_ROW only
  ever touch `rows`, which is what gives the "editing doesn't mutate the
  displayed prior result" behavior the spec requires, for free, from the
  reducer's shape rather than an extra guard.
- shadcn/ui's CLI (v4.19, `style: "base-nova"`) generates components on
  `@base-ui/react` primitives, not Radix — verified via the actual
  generated `button.tsx`/`select.tsx` output rather than assumed from
  older shadcn docs, per the Library Verification Rule in PLAN.md.
- Bklit is not an npm package — it's a shadcn registry
  (`https://ui.bklit.com/r/{name}.json`), installed with
  `npx shadcn add https://ui.bklit.com/r/ring-chart.json`, which copies
  source files into `src/components/charts/` rather than adding a runtime
  dependency. Chosen chart: ring-chart (pending vs. collected split);
  `rejected` is deliberately excluded from it, since rejected events never
  touch the board — see the comment in `HandoverChart.tsx`.
- `@number-flow/react` (a transitive dependency pulled in by the Bklit
  chart) is reused for the summary tiles' count-up transition rather than
  hand-rolling a second number-tweening implementation with Motion.
- ~~Dark mode follows `prefers-color-scheme` only~~ — superseded: the app now
  commits to a single dark "operations console" identity (graphite/ink,
  one amber accent) rather than adapting to the OS light/dark preference at
  all. See the "visual redesign" entries below.
- `--destructive`/`--status-rejected`/`--status-success` were hand-tuned to
  hex literals (not left as shadcn's default oklch values) after
  axe-core's automated sweep (`e2e/accessibility.spec.ts`) caught three
  real WCAG AA contrast failures — see PR history / commit "Add automated
  accessibility sweep..." for the specific ratios. Picked by computing
  contrast directly against each color's actual usage background, not by
  adjusting oklch(L C H) by feel.
- The collected-parcel board rows use a plain card background with only a
  tinted border (not a tinted background) — a `bg-status-success/5` tint
  under `text-muted-foreground` child text was the root cause of one of
  the three contrast failures above; removing the background tint fixed it
  without touching the shared `--muted-foreground` token used everywhere
  else.

## Visual redesign — "Operations Console" (post-functional-polish pass)

- One committed dark identity (graphite/ink background, one amber
  "operational" accent, green/red reserved for success/rejected only),
  not a light/dark toggle — see the superseded entry above. `--accent`
  doubles as the PENDING status color (amber-for-in-progress is a
  standard logistics convention), so the palette stays at exactly 3 hues
  total (accent, success, rejected) plus neutrals.
- Every palette color was picked by computing its actual composited WCAG
  contrast ratio in Node (relative-luminance formula) against its real
  usage background — including alpha-tinted badge backgrounds, which
  compute differently from the solid color alone. `--rejected` in
  particular needed a second, brighter pass: `#f26f6a` passed against
  solid `--surface`/`--background` (6-7:1) but only hit 4.18:1 once
  composited under its own `bg-rejected/10` badge tint — axe-core caught
  it; `#ff8d87` clears the composited case with margin. Lesson carried
  forward from the first contrast pass: verify the *actual rendered*
  background, not just the nearest solid swatch.
- `selectedParcelId: string | null` (appReducer.ts) is the only state
  behind the Event Timeline ↔ Handover Board ↔ Shelf Map cross-highlight.
  No per-view "is this selected" duplication — every view independently
  compares its own parcelId(s) against this one field. Clicking an
  already-selected item deselects it (toggle), so no separate "clear
  selection" control is needed. Reset and a fresh successful Run both
  clear it, since a selection made against a since-replaced board
  wouldn't necessarily mean anything against the new one.
- `ParcelLabel` (src/components/ParcelLabel.tsx) is a single presentational
  component reused by both the Handover Board's two columns and the Shelf
  Map — one visual definition of "what a parcel looks like," not three.
  It's deliberately NOT a Motion component itself: the enter/exit/FLIP
  animation lives on the `motion.li` wrapper each caller owns (layoutId
  for the Board's cross-column FLIP, plain enter/exit for the Shelf Map),
  which is what lets ParcelLabel stay a trivial, reusable button rather
  than entangling every consumer in AnimatePresence/layoutId semantics.
- The "PROCESSING… / HANDOVER COMPLETE" replay-status indicator
  (App.tsx `runStatus`) is local `useState`, not reducer state — it's a
  purely cosmetic "is the entrance animation currently playing" flag with
  zero bearing on what any other component computes, unlike
  `selectedParcelId` above (genuine cross-component state). Its duration
  is an analytically-sized `setTimeout`, not a Motion `onAnimationComplete`
  callback — the Event Timeline's stagger container only orchestrates its
  children's timing via `variants` (it has no animatable value of its
  own), and that orchestration-only pattern doesn't reliably fire a parent
  `onAnimationComplete`.
- The Summary's fourth figure ("EVENTS") is `result.outcomes.length` read
  directly in SummaryPanel — no new `HandoverSummary` field. Domain
  behavior/output shape is unchanged; the UI already had everything it
  needed to show a true, unambiguous total next to the pending/collected-
  only ring chart.
- The rejection-detail panel's "expected {code}" for `PICKUP_CODE_MISMATCH`
  is derived, not stored: a parcel's `pickupCode` never changes after
  ARRIVE (see processor.ts), and the processor's own check order
  guarantees a parcel that produced a mismatch was pending at that moment
  — so it's always findable in the final result's `pending` or `collected`
  list (whichever it ended up in), and that list already carries the one
  true code. No new domain field, no second source of truth.
- Test selectors that referenced ParcelLabel's CSS classes broke on the
  restyle (expected — that's exactly the coupling data-testid exists to
  avoid). Fixed once, in `e2e/handover.spec.ts`, by reading the
  `data-testid="parcel-{id}"` attribute ParcelLabel already exposed
  instead of a class selector; every other test's data-testid contract
  (`outcomes-list`, `pending-column`, `summary-pending`, etc.) was kept
  character-for-character identical through the redesign specifically so
  the rest of the suite wouldn't need touching.
- jsdom has no `window.matchMedia` — added a minimal stub in
  `src/tests/setup.ts` (always reports "no preference") once App.tsx
  started calling `prefersReducedMotion()` outside of Motion's own
  reduced-motion handling. RTL tests exercise non-reduced behavior;
  `e2e/accessibility.spec.ts`'s dedicated reduced-motion test covers the
  real preference in a real browser.

## New structural validation rule — COLLECT with no matching ARRIVE

- Added `PARCEL_NOT_FOUND` (`ValidationErrorCode` in types.ts): a full-table
  structural check in `validateEvents()` that rejects a COLLECT row whose
  Parcel ID has no ARRIVE row anywhere in the table. This is deliberately
  distinct from `PARCEL_NOT_PENDING`, the existing processor-level state
  rejection for a parcel that *did* arrive but isn't currently pending
  (already collected, or the COLLECT precedes its ARRIVE in source order).
  `PARCEL_NOT_FOUND` only fires when the parcel never arrived at all,
  anywhere in the table — order-independent, like the existing
  `DUPLICATE_EVENT_ID` full-table check, not source-order-dependent like
  the processor's checks.
- This keeps the "structural vs. state distinction is mandatory" rule
  (PLAN.md) intact for every other rejection type: `PARCEL_ALREADY_SEEN`,
  `ACTIVE_CODE_COLLISION`, `PARCEL_NOT_PENDING`, and `PICKUP_CODE_MISMATCH`
  are still valid processing outcomes that don't invalidate the run.
  `PARCEL_NOT_FOUND` is the one deliberate carve-out, added on explicit
  user request (confirmed via clarifying question before implementation,
  since it changes documented behavior) rather than inferred from the
  spec.
- Confirmed the built-in canonical fixture and all documented acceptance
  scenarios in PLAN.md still pass unchanged — every COLLECT in those
  fixtures already has a matching ARRIVE.
