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
- Dark mode follows `prefers-color-scheme` only — no in-app light/dark
  toggle, since the spec's single-screen UI has no chrome for one and
  system-following is enough to satisfy "professional, restrained."
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
