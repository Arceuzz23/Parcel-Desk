# Engineering Decision Log

Scope note: this document describes the **current state of the repository**
as of commit `d381d06` ("icon updated"), verified by reading source, tests,
and config directly — not by summarizing prior documentation. Where the
existing `docs/DECISIONS.md` (written earlier in the project) describes
something that no longer matches the code, that is called out explicitly
under "Superseded by this audit" at the end of each relevant section, per
the rule: code and tests are the source of truth for *what was built*.

There is no `docs/P11-SPEC.md` in this repository. `docs/PLAN.md` is used
throughout this document as the de facto functional specification, per
`docs/PROMPTS.md`'s own session log (the project's first action was to
flag the missing P11 spec and get the user's explicit instruction to treat
PLAN.md as authoritative). Every "P11 requirement" claim below cites
PLAN.md, not an assumed external document.

---

## Decision: Frontend-only, in-memory, zero network calls at runtime

### Context

`CLAUDE.md`'s Hard Constraints and `docs/PLAN.md`'s Hard Constraints both
explicitly prohibit backend, database, API route, Redis, Docker, network
service, authentication, notifications, bookings, and delivery routing,
and require "Browser-only, in-memory, zero network calls at runtime."

### Decision

The entire app is a single Vite-built static bundle. There is no server
code anywhere in the repository — no `server/`, no API routes, no
`fetch`/`axios`/`XMLHttpRequest` call in `src/`. All state (`AppState` in
`src/app/appReducer.ts`) lives in a single `useReducer` in memory; a page
refresh returns to the built-in 6-event fixture.

### Alternatives

- A thin Node/Express backend persisting events to a file or SQLite —
  explicitly excluded by the Hard Constraints.
- A CLI or notebook implementation — `docs/PLAN.md` notes the spec
  "permits CLI/notebook/desktop too" but the browser was chosen because
  the required deliverable is an *editable table + interactive Run
  Handover action*, which a browser UI serves directly.

### Why

The constraint isn't a technical limitation of this domain — it's an
explicit instruction. A parcel desk's real production form (see
`docs/SYSTEM-DESIGN.md`) clearly *would* have a backend and a database;
this project draws a hard line between "what P11 asks to be built" and
"what a production system would look like," and documents the latter only
as a conceptual, unimplemented design.

### Trade-off

No persistence across reloads, no multi-device/multi-user sharing, no
audit durability. All accepted deliberately — see
`docs/SYSTEM-DESIGN.md`'s Event Sourcing Trade-off section for how that
would be addressed in a hypothetical production version.

### Consequence

`src/lib/` (the domain layer) has zero React/DOM/browser imports and is
directly unit-testable in Node via Vitest with no server, no mocks, no
test containers.

### Evidence

- `CLAUDE.md` — Hard Constraints
- `docs/PLAN.md` — Hard Constraints, Chosen Implementation
- `src/app/appReducer.ts` — all state is a plain in-memory object
- `src/lib/*.ts` — no `fetch`, no browser API imports
- `docs/SYSTEM-DESIGN.md` — explicitly marked "not implemented"

---

## Decision: The ordered event log is the source of truth; the board is derived, not stored

### Context

`docs/PLAN.md`: "Event log is source of truth" (Hard Constraints); the
architecture diagram is `EVENT TABLE → INPUT VALIDATION → EVENT PROCESSOR
→ HANDOVER RESULT → ... UI`.

### Decision

`AppState.rows` (the editable table) is the only thing the user directly
edits. `AppState.lastResult: HandoverResult | null` is never edited
directly — it is only ever *replaced wholesale* by `processHandover()`'s
return value, triggered by the `RUN` action. Every other view in the app
(`HandoverBoard`, `EventTimeline`, `ShelfMap`, `SummaryPanel`,
`EventsOverTimeChart`) reads from `lastResult` (or derives from it via
`src/lib/selectors.ts`) — none of them own independent state.

### Alternatives

- A separate "pending parcels" store updated incrementally as ARRIVE/
  COLLECT events are added (closer to how a real production system with
  a `parcels` projection table would work — see
  `docs/SYSTEM-DESIGN.md`'s Data Model section). Rejected for this app:
  PLAN.md requires the whole table to be validated and processed together
  on each Run, not streamed incrementally.

### Why

If the board were its own mutable store, editing the table could
desynchronize it from what a fresh `processHandover()` run would actually
produce — exactly the "duplicated state" bug class this design avoids.
Deriving everything from one `HandoverResult` means there is only one
place that can be wrong.

### Trade-off

Every Run re-processes the entire event table from scratch (`for (const
event of events)` in `processHandover`, `O(n)` over all events) rather
than incrementally applying just the newly added rows. At the scale this
app targets (a handful to a few dozen events on one screen), this is
irrelevant; see the Complexity section in `questions.md` for how this
would need to change at production scale.

### Consequence

- `getShelfMap`, `getShelfOccupancy`, `getEventsOverTime`,
  `getSummary` (`src/lib/selectors.ts`) all take a `HandoverResult` and
  derive their output freshly — none of them cache or mutate.
- The Shelf Map, in particular, is explicitly documented as having "no
  independent store" — if it were deleted from the app, nothing else
  would need to change (`src/components/ShelfMap.tsx` doc comment).

### Evidence

- `src/lib/processor.ts` — `processHandover(events): HandoverResult`
- `src/lib/selectors.ts` — every selector takes `HandoverResult`, returns
  a fresh derived value
- `src/app/appReducer.ts` — `RUN` case, `lastResult` only ever fully
  replaced or nulled, never patched
- `src/components/ShelfMap.tsx`, `HandoverBoard.tsx` — read `result` prop
  only, no local list state

---

## Decision: Structural validation is a full-table gate before any processing

### Context

`docs/PLAN.md`'s Validation Contract: "full-table, pre-processing," and
"On structural failure: no partial processing, no outcomes, no board
rows, no summary, clear stale output, show validation message."

### Decision

`validateEvents(inputs: EventInput[]): ValidationResult`
(`src/lib/validation.ts`) is a single function that iterates every row and
collects **every** structural error across the whole table (not just the
first). It returns `{ valid: false, errors, events: [] }` on any failure —
note `events: []`, not a partially-built list — so there is no code path
by which `processHandover()` could ever be called with some, but not all,
rows validated. `appReducer.ts`'s `RUN` case checks `validation.valid`
before calling `processHandover` at all; on failure it explicitly sets
`lastResult: null`, clearing whatever was previously displayed.

### Alternatives

- Row-by-row validation that processes valid rows and skips invalid ones —
  explicitly contradicts PLAN.md's "no partial processing" requirement.
- Validating inline as the user types (real-time validation) — not
  implemented; see `flow.md` §4, "Event Editing Flow" for the explicit
  absence of this.

### Why

The spec's structural-vs-state distinction (below) only holds if
structural failures are caught *before* any parcel-state decision is
made — otherwise a table with one malformed row and five valid ARRIVE/
COLLECT events would produce a half-correct board, which is exactly what
PLAN.md's acceptance test 5 (duplicate event ID) forbids.

### Trade-off

A single typo anywhere in a large table blocks the *entire* run, even
if 99% of the rows are fine. This is a deliberate correctness-over-
convenience choice, not an oversight — it mirrors PLAN.md's explicit
"Structural vs. state distinction is mandatory."

### Consequence

`appReducer.ts`'s `RUN` case is a strict two-branch function: invalid →
`{ lastResult: null, validationErrors: validation.errors }`; valid →
`{ lastResult: processHandover(validation.events), validationErrors: [] }`.
There is no third branch and no partial-state branch.

### Evidence

- `src/lib/validation.ts` — `validateEvents`
- `src/app/appReducer.ts` — `RUN` case
- `src/tests/domain/validation.test.ts` — "produces zero partial output on
  structural failure — no events returned", "reports all structural
  errors across the table, not just the first"
- `src/tests/domain/integration.test.ts` — duplicate-ID pipeline test
- `e2e/handover.spec.ts` test 5

---

## Decision: Structural errors vs. state-dependent rejections are two different mechanisms

### Context

PLAN.md distinguishes: structural errors (`INVALID_EVENT`,
`DUPLICATE_EVENT_ID`, `INVALID_PICKUP_CODE`) invalidate the *entire run*;
state rejections (`PARCEL_ALREADY_SEEN`, `ACTIVE_CODE_COLLISION`,
`PARCEL_NOT_PENDING`, `PICKUP_CODE_MISMATCH`) are *valid outcomes* that a
successful run can produce, and processing continues past them.

### Decision

These live in genuinely different type-and-function layers, not just
different error codes on one type:

- Structural errors are `ValidationError` objects (`rowIndex`, `eventId`,
  `field`, `code: ValidationErrorCode`, `message`), produced only by
  `validateEvents()`, and they abort the whole run (`ValidationResult.
  valid: false`).
- State rejections are `EventOutcome` objects with an `outcome:
  OutcomeType` of one of the four rejection types, produced only by
  `processHandover()`, and they are pushed onto `outcomes` exactly like
  `ARRIVED`/`COLLECTED` — the loop `continue`s to the next event, it never
  returns early or clears `outcomes`.

`REJECTED_OUTCOMES` (`src/lib/constants.ts`) is the one `Set` that defines
"which outcome types count as a rejection" — read by `getSummary()`'s
`rejected` count, `getEventsOverTime()`'s `rejected` series, and
`OutcomeBadge`'s tone — so there is exactly one definition of "rejected"
in the whole codebase, not one per consumer.

### Alternatives

- A single unified "error" type covering both cases with a `severity`
  field — would blur exactly the distinction PLAN.md calls "mandatory,"
  and would make it easy to accidentally abort a whole run on what should
  be a per-event rejection (or vice versa).

### Why

A state rejection (e.g. someone scans the wrong pickup code) is a
legitimate, expected event in a real parcel desk's daily operation — it
should be recorded and shown, not treated as a fatal input error. A
malformed table row is not a business event at all; it is bad input.

### Trade-off

None significant — this is close to a pure win in this domain: it keeps
`processHandover()`'s type signature simple (`Event[] → HandoverResult`,
no error union) while still being unambiguous, at the cost of the caller
(`appReducer.ts`) needing to call `validateEvents` first and check
`.valid` before ever calling `processHandover`.

### Consequence

`processHandover()` has no failure mode of its own — it always returns a
`HandoverResult`, even for empty input (`{ outcomes: [], pending: [],
collected: [] }`). All of its "no" answers are outcome values, not thrown
errors or return-type unions.

### Evidence

- `src/lib/types.ts` — `ValidationError` vs. `EventOutcome`/`OutcomeType`
- `src/lib/constants.ts` — `REJECTED_OUTCOMES`
- `src/lib/processor.ts` — every rejection path is `outcomes.push(...);
  continue;`, never `return`/`throw`
- `src/tests/domain/processor.test.ts` — "ARRIVE state rules", "COLLECT
  state rules" describe blocks

---

## Decision: `processHandover()` is a pure function processing events in strict source order

### Context

PLAN.md: "Process in source order (never event-ID order, never sorted)";
"Fresh state every invocation"; check order for ARRIVE is
`PARCEL_ALREADY_SEEN` → `ACTIVE_CODE_COLLISION` → `ARRIVED`; for COLLECT
is `PARCEL_NOT_PENDING` → `PICKUP_CODE_MISMATCH` → `COLLECTED`.

### Decision

`processHandover(events: Event[]): HandoverResult` (`src/lib/
processor.ts`) is a single `for...of events` loop with zero React/DOM/
browser imports. It declares three fresh local collections on every call
(`seenParcelIds: Set<string>`, `pendingByParcelId: Map<string,
PendingParcel>`, `parcelIdByActiveCode: Map<string, string>`) — nothing
persists between calls, and it never mutates its `events` input parameter.
The `if`/`continue` chain inside each branch enforces the exact check
order PLAN.md specifies.

### Alternatives

- Sorting events by ID before processing — explicitly forbidden by
  PLAN.md ("never event-ID order, never sorted"), and the built-in
  fixture's own IDs (`E01`...`E06`) happen to already be source-ordered,
  so a sort bug wouldn't even be caught by the canonical oracle alone —
  the dedicated "source-order processing" test
  (`src/tests/domain/processor.test.ts`) deliberately uses out-of-order
  IDs (`E03, E01, E02`) to catch this class of bug.
- Reversing the two check orders (e.g. `ACTIVE_CODE_COLLISION` before
  `PARCEL_ALREADY_SEEN`) — PLAN.md marks the order "mandatory"; a
  dedicated test (`"checks PARCEL_ALREADY_SEEN before
  ACTIVE_CODE_COLLISION"`) constructs an event that would trigger either
  outcome and asserts the mandated one wins.

### Why

Source order matches how a real parcel desk actually receives events —
one at a time, as they happen — and the mandated check orders resolve
otherwise-ambiguous cases (an event could plausibly match two rejection
reasons at once) deterministically and specifically to PLAN.md's chosen
priority.

### Trade-off

None material — the check-order requirement costs nothing extra to
implement (it's just `if`/`else if` in the right sequence) but is easy to
silently get backwards without a dedicated test, which is why one exists.

### Consequence

`processHandover([]) === { outcomes: [], pending: [], collected: [] }`
(not a special-cased empty branch — the loop simply doesn't execute), and
calling the same function twice on the same input returns two distinct-
but-`toEqual`-equal objects (`src/tests/domain/processor.test.ts`,
"purity" describe block) — proof there's no hidden module-level state.

### Evidence

- `src/lib/processor.ts`
- `src/tests/domain/processor.test.ts` — "source-order processing",
  "purity" blocks
- `docs/PLAN.md` — Event Processor section

---

## Decision: Data structures inside `processHandover()`

### Context

PLAN.md requires the ARRIVE/COLLECT decision checks to be made in a fixed
order with correctness guarantees ("Another pending parcel holds same
pickup code", "Parcel ID in an earlier accepted arrival") that are
naturally O(1) membership/lookup questions.

### Decision — actual structures in the code

| Structure | Declared as | Stores | Why |
|---|---|---|---|
| `outcomes` | `EventOutcome[]` | one entry per input event, in order | Output must preserve source order; an array is the natural ordered sequence, and PLAN.md requires this exact order in the UI. |
| `pending` | `PendingParcel[]` | currently-pending parcels, in accepted-arrival order | PLAN.md: "Pending list preserves accepted-arrival order" — an array preserves insertion order and supports the required `pending.splice(pendingIndex, 1)` removal on COLLECT. |
| `collected` | `CollectedParcel[]` | parcels collected so far, in successful-collection order | Same reasoning as `pending`, for collection order. |
| `seenParcelIds` | `Set<string>` | every parcel ID that has ever had an accepted ARRIVE | Only ever needs a `.has()` membership check (`PARCEL_ALREADY_SEEN`) — a `Set` gives O(1) average lookup vs. an O(n) `.includes()` scan over the growing event history. |
| `pendingByParcelId` | `Map<string, PendingParcel>` | parcel ID → its pending record | COLLECT needs O(1) lookup by parcel ID to check `PARCEL_NOT_PENDING`/`PICKUP_CODE_MISMATCH` and to find the exact object to remove from `pending`. |
| `parcelIdByActiveCode` | `Map<string, string>` | pickup code → the parcel ID currently holding it | ARRIVE needs an O(1) check for `ACTIVE_CODE_COLLISION` ("another pending parcel holds same pickup code") without scanning all pending parcels' codes. |

`pending.indexOf(parcel)` (to find the splice index on COLLECT) is the one
O(n) scan in the hot path — `parcel` was already found via
`pendingByParcelId.get()` in O(1), so this is only re-deriving its array
position, on an array whose length is bounded by the number of currently-
pending parcels (small in this app's scale).

### Alternatives

- A single combined object per parcel instead of three parallel Maps/Set —
  possible, but `seenParcelIds` intentionally never shrinks (a collected
  parcel must still trigger `PARCEL_ALREADY_SEEN` if it "arrives" again),
  while `pendingByParcelId`/`parcelIdByActiveCode` both shrink on
  COLLECT — conflating them into one structure would require carrying an
  extra "is this parcel currently pending" flag rather than relying on
  presence/absence in the right map, adding a boolean invariant to keep
  in sync by hand.
- Using `pending.find()` instead of maintaining `pendingByParcelId`
  — rejected because it turns every COLLECT into an O(n) scan; the Map is
  a straightforward cache keyed on exactly the lookup COLLECT needs.

### Trade-off

Three auxiliary structures for what is conceptually "which parcels are
active and how" is more moving parts than a single array with `.find()`
calls — chosen because this project's stated priority (PLAN.md's
"Performance" section) is *deterministic correctness at each check*, and
because the check order itself (PLAN.md, mandatory) is naturally expressed
as three independent yes/no questions, each backed by the structure suited
to answering it in O(1).

### Consequence

`processHandover()`'s overall time complexity is O(n) in the number of
input events (each event does a constant number of Map/Set operations
plus, on COLLECT, one `indexOf` bounded by current pending count); space
is O(n) for the output collections plus O(p) for the three lookup
structures, where p ≤ n is peak concurrently-pending-parcel count.

### Evidence

- `src/lib/processor.ts` — full structure declarations and usage
- `docs/PLAN.md` — Performance section ("Correctness and clarity over
  premature optimization")

---

## Decision: Component decomposition follows PLAN.md's required screen sections, one component per section

### Context

PLAN.md's UI Design section names the required screen sections: Header,
Summary, Event Log, Validation/Outcomes, Final Handover Board, plus
optional Shelf Map.

### Decision

Each named section is exactly one component, each independently reading
only the reducer state it needs as props (no section reaches into another
section's internals):

| Component | Reads | Domain calls | Independent state? |
|---|---|---|---|
| `Header.tsx` | `onRun`, `onReset` callbacks only | none | none |
| `SummaryPanel.tsx` | `result: HandoverResult \| null` | `getSummary`, `getEventsOverTime` | none |
| `ValidationBanner.tsx` | `errors: ValidationError[]` | none (renders `.message` verbatim) | none |
| `HandoverBoard.tsx` | `result`, `selectedParcelId`, `onSelectParcel` | reads `result.pending`/`result.collected` directly | none |
| `EventTimeline.tsx` | `result`, `selectedParcelId`, `onSelectParcel` | reads `result.outcomes` directly | none |
| `ShelfMap.tsx` | `result`, `selectedParcelId`, `onSelectParcel` | `getShelfMap` | none |
| `EventTable.tsx` | `rows: EditableEventRow[]`, `dispatch` | none (no validation/processing logic) | none |

`ParcelLabel.tsx` and `Panel.tsx` are the two shared presentational
pieces: `ParcelLabel` is the one visual definition of "what a parcel
looks like," reused by `HandoverBoard`'s two columns and `ShelfMap`;
`Panel` is the one bordered-section chrome (title/subtitle/border/
padding) reused by `HandoverBoard`, `EventTimeline`, `ShelfMap`, and
`EventTable`, so that visual language can only drift in one place.

### Alternatives

- One large `App.tsx` rendering everything inline — would work
  functionally but would make PLAN.md's per-section requirements (exact
  empty-state copy, exact data-testid hooks) harder to keep straight and
  impossible to unit-test/RTL-test in isolation.
- A "smart Board container + dumb Board view" split per section — not
  present; every component here is already "dumb" (props in, JSX out) —
  the one and only smart layer is `App.tsx` + `appReducer.ts`.

### Why

PLAN.md's own required layout list reads almost directly as this
component list — matching one-to-one keeps the mapping from spec section
to source file unambiguous, which matters both for review and for
`data-testid` hooks the Playwright suite depends on.

### Trade-off

More files than a single monolithic component, but each one is small
(under ~180 lines) and independently readable/testable.

### Consequence

No component in `src/components/` (other than `App.tsx`'s reducer) holds
its own `useState` for anything that another component also needs to
know about — the one exception, `selectedParcelId`, deliberately lives in
the shared reducer specifically because three different components
(`HandoverBoard`, `EventTimeline`, `ShelfMap`) all need to react to it
(see the next decision).

### Evidence

- `src/components/*.tsx` — as listed
- `docs/PLAN.md` — UI Design section

---

## Decision: One reducer, one cross-highlight field, no per-component selection state

### Context

The app has three different views of the same final board state
(`HandoverBoard`, `EventTimeline`, `ShelfMap`) and lets a user click a
parcel/event/shelf-occupant in any one of them to highlight it everywhere.

### Decision

`AppState.selectedParcelId: string | null` (`src/app/appReducer.ts`) is
the single field all three views compare against. Each view independently
computes `selected = selectedParcelId === <its own parcelId>` and `dimmed
= selectedParcelId !== null && selectedParcelId !== <its own parcelId>`
for whatever it's rendering. Clicking an already-selected item dispatches
`SELECT_PARCEL` with the same ID, and the reducer toggles it back to
`null` — so there is no separate "clear selection" control needed.

### Alternatives

- Per-component "is this the hovered/selected thing" local state in each
  of the three consumers — would require some out-of-band signal (context,
  a callback prop chain, or a second shared piece of state) to keep three
  independent local states in sync, which is exactly the duplicated-state
  problem a single shared field avoids.

### Why

Since every view already renders parcels/events by their `parcelId`
(the domain model's natural key), one shared ID is sufficient information
to answer "should I highlight myself" in every one of the three places at
once — no second identifier (a "selected event ID" or "selected shelf ID")
is needed because parcel ID is enough to cross-reference into all three.

### Trade-off

Only one thing can be selected app-wide at a time (no multi-select) —
acceptable, since this is a highlight/focus aid, not a bulk-action
selection mechanism, and PLAN.md never asks for multi-select.

### Consequence

A fresh successful `RUN` and a `RESET` both clear `selectedParcelId`
(`appReducer.ts`) — a selection made against a board that's about to be
replaced wouldn't necessarily still mean anything against the new one.

### Evidence

- `src/app/appReducer.ts` — `selectedParcelId`, `SELECT_PARCEL` case
- `src/components/HandoverBoard.tsx`, `EventTimeline.tsx`,
  `ShelfMap.tsx`, `ParcelLabel.tsx` — `selected`/`dimmed` prop usage

---

## Decision: Input state and output state are two independent reducer fields

### Context

PLAN.md: "State separation: editable input state ≠ last processed
result. Editing the table must not silently mutate the displayed prior
result."

### Decision

`AppState` has `rows` (input) and `lastResult` (output) as two separate
fields in one reducer. `ADD_ROW`, `UPDATE_FIELD`, and `DELETE_ROW` only
ever spread-update `rows` — none of their reducer branches touch
`lastResult` or `validationErrors` at all. Only `RUN` writes to
`lastResult`, and only `RESET` (via `createInitialState()`) resets both
together.

### Alternatives

- Deriving `rows` and validity/result eagerly on every keystroke (i.e.
  re-validating and re-processing as the user types) — this would make
  "editing doesn't mutate the displayed prior result" impossible to
  satisfy, since the displayed result would change on every keystroke.
  Confirmed absent: see `flow.md` §4.

### Why

This is the property PLAN.md calls out by name, and it falls out "for
free" from the reducer's shape rather than needing an explicit guard —
because `UPDATE_FIELD`'s case literally has no code path that writes
`lastResult`, there is no way for editing to change what's displayed
until `RUN` is explicitly dispatched.

### Trade-off

None — this is a case where the correct behavior is also the simpler
implementation (fewer reducer branches touching fewer fields), not a
trade made for one at the expense of the other.

### Consequence

`src/tests/ui/App.test.tsx` — "App — editing does not mutate the
displayed prior result" runs a Run, edits a field, and asserts the
summary/outcomes list is unchanged, directly exercising this property
through the real reducer (not a reducer unit test in isolation).

### Evidence

- `src/app/appReducer.ts` — `ADD_ROW`/`UPDATE_FIELD`/`DELETE_ROW` vs.
  `RUN` cases
- `src/tests/ui/App.test.tsx` — the test named above
- `docs/PLAN.md` — "State separation"

---

## Decision: Reset state and empty-run state are deliberately different values, not different renderings of the same value

### Context

PLAN.md acceptance test 6: Reset must show "no result yet" (not `0/0/0`);
running on an actually-empty table must show real `0/0/0`. These must be
"visually distinguishable in the UI and covered by a Playwright
assertion."

### Decision

`AppState.lastResult` is typed `HandoverResult | null`, and `null` is a
distinct, meaningful value from `{ outcomes: [], pending: [], collected:
[] }` (which is what `processHandover([])` actually returns). Every
consumer branches on `result === null` first, then separately handles the
zero-length case:

- `SummaryPanel.tsx`: `result === null` → each figure renders `"—"`
  (`value={undefined}`); non-null → `NumberFlow` renders the real number,
  including `0`.
- `EventTimeline.tsx`: `result === null` → `"No result yet"` copy;
  `result.outcomes.length === 0` (but non-null) → `"Run completed — 0
  events"` copy — two different `EmptyState` blocks with two different
  `data-testid`s (`outcomes-pre-run` vs. `outcomes-empty-run`).
- `HandoverBoard.tsx`: `result === null` → `board-pre-run` panel with an
  empty-state inside; non-null (even with empty pending/collected arrays)
  → the real two-column layout, which then independently shows
  `pending-empty`/`collected-empty` per column if those arrays happen to
  be empty.

### Alternatives

- Representing "no run yet" as `{ outcomes: [], pending: [], collected:
  [] }` (the same shape an empty run produces) plus a separate boolean
  `hasRun` flag — functionally equivalent, but would require every
  consumer to check two fields (`hasRun && result...`) instead of one
  discriminating `null` check; the `null` sentinel keeps the "have we run
  at all" question answerable from the type of a single field.

### Why

This is a directly spec-mandated distinction (acceptance test 6), not an
inferred nicety — and representing "not run yet" as a `null` rather than
an all-zero object is what makes it impossible to accidentally collapse
the two states, since a `HandoverResult` and `null` aren't
interchangeable at the type level (TypeScript strict mode would flag any
code path that tried to read `.outcomes` off a possibly-`null` result
without a check).

### Trade-off

Every result-consuming component needs an explicit `result === null`
branch (visible in the table above) rather than being able to
unconditionally destructure `result.outcomes` — a small amount of
repeated conditional logic in exchange for the distinction being
impossible to silently lose.

### Consequence

- `src/tests/ui/App.test.tsx` and `e2e/handover.spec.ts` test 6 both
  assert this distinction directly, transitioning Reset → run-empty →
  Reset and checking `outcomes-pre-run` vs. `outcomes-empty-run`
  test IDs at each step.

### Evidence

- `src/app/appReducer.ts` — `AppState.lastResult: HandoverResult | null`,
  doc comment above the field
- `src/components/SummaryPanel.tsx`, `EventTimeline.tsx`,
  `HandoverBoard.tsx` — `result === null` branches
- `src/tests/ui/App.test.tsx`, `e2e/handover.spec.ts` test 6
- `docs/PLAN.md` — acceptance test 6

---

## Decision: Libraries actually used, and why

| Library | Installed as | Purpose in this app | Reasonable alternative | Essential? |
|---|---|---|---|---|
| React 19 | `react`, `react-dom` | UI rendering, one `useReducer` for all app state | Vue/Svelte would work equally; React chosen per PLAN.md's stack requirement | Yes — required by PLAN.md |
| TypeScript (strict) | `typescript` | Compile-time correctness for the domain layer especially (`Event`, `HandoverResult`, discriminated `OutcomeType` union) | Plain JS + JSDoc — would lose the exhaustiveness check in `appReducer.ts`'s `default` case | Yes — required by PLAN.md ("strict TS, no `any`") |
| Vite | `vite`, `@vitejs/plugin-react` | Dev server (HMR), production bundler, also powers Vitest's config | Webpack/CRA/Parcel — Vite chosen per PLAN.md's stack, and its native ESM dev server is materially faster for this size of app | Replaceable, but required by PLAN.md |
| Tailwind CSS v4 | `tailwindcss`, `@tailwindcss/vite` | All styling — utility classes + the CSS custom-property palette in `src/index.css` | Hand-written CSS modules, or CSS-in-JS | Yes — required by PLAN.md |
| shadcn/ui (CLI-generated) | `shadcn` (dev-time CLI, not a runtime dependency); generated files depend on `@base-ui/react`, `class-variance-authority`, `tailwind-merge` | Source of `Button`, `Input`, `Select`, `Table`, `Alert`, `Card`, `Label` in `src/components/ui/` | Radix UI primitives directly, or Headless UI — shadcn's copy-in-source model was chosen so the generated components are ordinary editable app code, not an opaque dependency | Yes — required by PLAN.md; the specific base-primitive library (`@base-ui/react`, confirmed by reading the generated `button.tsx`/`select.tsx`, not assumed from older Radix-based shadcn docs) is an implementation detail of the installed CLI version |
| Motion (`motion/react`) | `motion` | All presentation animation: `fadeInUp`/`popIn`/`staggerChildren` variants (`src/lib/motion.ts`), `AnimatePresence`/`LayoutGroup`/`layoutId` FLIP transitions in `HandoverBoard.tsx` | CSS transitions/`@keyframes` alone — would lose `AnimatePresence`'s exit-animation-before-unmount and `layoutId`'s cross-column FLIP, both used here | No — see "Animation" section below; the app is fully usable with it disabled |
| Bklit (shadcn registry, not an npm package) | Source files copied into `src/components/charts/` via `npx shadcn add https://ui.bklit.com/r/area-chart.json`, pulling in `@visx/*`, `d3-array`, `d3-shape` as real npm dependencies | The "Events Over Time" area chart in `EventsOverTimeChart.tsx` | A hand-rolled SVG chart, or Recharts/visx used directly | No — one optional chart; `SummaryPanel.tsx` already shows the true numeric values independent of it |
| `@number-flow/react` | npm dependency (a transitive dependency the Bklit chart pulled in) | The count-up digit-tweening animation on the four summary figures (`SummaryPanel.tsx`'s `Figure`) | Hand-rolled `requestAnimationFrame` tweening via Motion, duplicating logic already available | No — reused rather than reimplemented once already present in the dependency tree |
| Vitest | `vitest` | Domain-layer unit tests (`src/tests/domain/`) and RTL component tests (`src/tests/ui/`) | Jest — Vitest chosen for native Vite config reuse and ESM support | Yes — required by PLAN.md |
| React Testing Library | `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Renders `<App />` in jsdom and drives it via simulated user interaction | Enzyme (unmaintained for current React) | Yes — required by PLAN.md |
| Playwright | `@playwright/test` | The 6 required E2E acceptance scenarios, plus accessibility and keyboard-nav suites, against a real Chromium browser | Cypress | Yes — required by PLAN.md |
| `@axe-core/playwright` | dev dependency | Automated WCAG 2 A/AA sweep in `e2e/accessibility.spec.ts` | Manual-only accessibility review | No — supplements, doesn't replace, manual verification (acknowledged directly in that file's own doc comment) |
| oxlint | `oxlint` | `npm run lint` | ESLint | Replaceable; used because it's fast and already configured (`.oxlintrc.json`) |
| lucide-react | `lucide-react` | All icons (`Box`, `Play`, `Package`, `PackageCheck`, `Plus`, `Trash2`, `CheckCircle2`, `XCircle`) | Heroicons, Phosphor | No — decorative/informational only, easily swappable |
| `clsx` + `tailwind-merge` (via `cn()` in `src/lib/utils.ts`) | npm dependencies | Conditional class-name composition without Tailwind class conflicts | Manual template-string class concatenation | No — a small ergonomics helper, standard in shadcn-based projects |

Note on Playwright MCP: it is referenced in `CLAUDE.md`/`docs/PLAN.md` as
a *dev-time debugging tool* ("Playwright MCP dev-time only"), not a code
dependency — there is no MCP configuration or runtime usage inside this
repository to point to; its role was in the development workflow, not the
shipped app.

### Evidence

- `package.json` — dependencies/devDependencies
- `components.json` — `registries: { "@bklit": "https://ui.bklit.com/r/{name}.json" }`
- `src/components/ui/button.tsx`, `select.tsx` — `@base-ui/react` imports
- `src/components/charts/*` — Bklit-sourced files
- `docs/DECISIONS.md` — the Library Verification Rule anecdotes (bklit
  404, base-ui vs. Radix) are corroborated by the actual installed
  packages and generated source above

---

## Decision: Animation is presentation-only and never gates functional state

### Context

PLAN.md: "Motion Usage: Presentation-only, zero coupling to domain
logic... Respect `prefers-reduced-motion`... app fully usable without
animation."

### Decision

`src/lib/motion.ts` exports only `Transition`/`Variants` objects
(`SPRING`, `SOFT_SPRING`, `fadeInUp`, `popIn`, `staggerChildren`) — plain
data describing *how* things move, with zero import of any domain type
(`Event`, `HandoverResult`, etc.). Every domain-state decision
(what's pending, what's rejected) is computed first by `appReducer.ts`/
`src/lib/`; Motion components only ever consume already-computed props
(e.g. `HandoverBoard.tsx` maps `result.pending` into `motion.li` elements
— the *set* of pending parcels comes from `processHandover()`, Motion
only decides how each one visually enters/exits).

Reduced motion is handled once, at the root: `<MotionConfig
reducedMotion="user">` in `App.tsx` makes every `motion.*` element in the
tree skip its animated transition (while still reaching its final
visual state) when the OS-level `prefers-reduced-motion` is on — no
individual component contains its own reduced-motion check. `src/
index.css` additionally has a CSS-only `@media (prefers-reduced-motion:
reduce)` block as a backstop for shadcn/ui's own non-Motion CSS
transitions.

What's actually animated, concretely:

- `SummaryPanel.tsx` — figures fade/rise in (`fadeInUp`) on mount; each
  numeric value count-transitions via `@number-flow/react` (not Motion,
  but the same presentation-only role).
- `EventTimeline.tsx` — the outcome strip staggers in node-by-node
  (`staggerChildren`); each node pops in (`popIn`).
- `HandoverBoard.tsx` — parcels pop in/out on enter/exit
  (`AnimatePresence` + `popIn`); a parcel moving from Pending to Collected
  across a re-run FLIP-animates via a shared `layoutId` scoped by
  `LayoutGroup`.
- `ShelfMap.tsx` — shelf cells pop in/out as shelves start/stop being
  referenced by the log.
- `ValidationBanner.tsx` — fades/rises in and out (`fadeInUp`) as errors
  appear/clear.

### Alternatives

- Coupling animation state into the reducer (e.g. an `isAnimating` flag
  gating some render branch) — an earlier iteration of the app had
  exactly this (`runStatus`, a local `useState` "PROCESSING…/HANDOVER
  COMPLETE" indicator; see docs/DECISIONS.md's history). It was removed —
  `App.tsx`'s current doc comment states it directly ("both the footer
  and the flag were removed together"). **Verified absent from the
  current codebase** — grepping `src/` finds no `runStatus`, no
  "PROCESSING", no "HANDOVER COMPLETE" string.

### Why

Keeping `src/lib/motion.ts` free of domain imports is what lets
`src/lib/processor.ts`/`validation.ts`/`selectors.ts` remain independently
unit-testable with zero DOM — a Motion-coupled domain layer couldn't be
imported into a plain Vitest Node test the way it currently is.

### Trade-off

None material — Motion's own API (`variants`, `AnimatePresence`) is
already designed for exactly this "presentation subscribes to state"
direction, so no awkward indirection was needed to keep the boundary
clean.

### Consequence

`e2e/accessibility.spec.ts`'s "reduced motion" test suite
(`test.use({ reducedMotion: "reduce" })`) asserts the app still fully
populates and reaches `opacity: 1` immediately, with no settle delay —
direct proof the app doesn't rely on an animation callback to reach its
final state.

### Reasoning Classification

The "removed runStatus flag" fact is directly evidenced by `App.tsx`'s
own comment and by its absence from the current source (grep-verified);
everything else in this section is a direct reading of `src/lib/motion.ts`
and its consumers, not an inference.

### Evidence

- `src/lib/motion.ts`
- `src/app/App.tsx` — `<MotionConfig reducedMotion="user">`, and the doc
  comment about the removed `runStatus` flag
- `src/index.css` — `@media (prefers-reduced-motion: reduce)` block
- `e2e/accessibility.spec.ts` — "reduced motion" describe block
- `docs/PLAN.md` — Motion Usage

---

## Decision: One Bklit chart, deferred until it's needed — and it plots a running series, not a single split

### Context

PLAN.md: "Bklit Usage: Visualization layer only, never the primary UI. One
meaningful chart max (pending vs. collected split, or shelf occupancy)
derived from HandoverResult. No independent chart state. Omit if it
doesn't improve understanding."

### Decision — current implementation

`EventsOverTimeChart.tsx` renders **one** Bklit-sourced `AreaChart` with
three series — Pending, Collected, Rejected — plotting the *cumulative,
running* counts after each event in source order, computed by
`getEventsOverTime()` (`src/lib/selectors.ts`), itself a pure aggregation
over `result.outcomes` that "does not re-decide what ARRIVED/COLLECTED/
rejected mean" (its own doc comment) — it only tallies the same
classification `getSummary()` already makes, at every step along the way
rather than only at the end.

The chart is:

- **Lazy-loaded**: `SummaryPanel.tsx` imports it via `React.lazy()`, and
  only renders it (inside a `<Suspense>`) once `result !== null` — before
  the first Run, the chart's module (and its `@visx`/`d3` dependency
  chain, ~94 kB minified per the code comment) is never fetched at all.
- **The x-axis is a workaround, not a hidden feature**: the underlying
  Bklit `AreaChart` always coerces its x-values through `new Date(...)`
  and labels ticks as calendar dates (it's a genuine time-series
  component). Rather than fork the vendored file, `EventsOverTimeChart.tsx`
  feeds it synthetic, evenly-spaced `Date` objects purely as ordinal
  x-position, and renders the real `E01`/`E02`/... labels itself in a
  plain row underneath, aligned to the chart's own margins.
- **Straight line segments** (`curveLinear`), not the component's default
  smoothed curve — because these are discrete state transitions between
  events, not a continuously-varying quantity; a smoothed spline would
  visually imply in-between values that were never true at any actual
  moment.

**Note — discrepancy with `docs/DECISIONS.md`**: the existing
`docs/DECISIONS.md` describes an earlier iteration's chart as a
`ring-chart` ("pending vs. collected split... `rejected` is deliberately
excluded from it") sourced from `npx shadcn add
https://ui.bklit.com/r/ring-chart.json`, and a `HandoverChart.tsx`
component. **Neither exists in the current repository.** The current
component is `EventsOverTimeChart.tsx`, an `area-chart` registry source,
plotting all three series (pending/collected/**rejected included**) as a
running time series, not a single split. This document describes the
current, verified implementation; the ring-chart description in
`docs/DECISIONS.md` is stale relative to the code and should be read as
historical only.

### Alternatives

- The ring-chart pending/collected split described in the (now stale)
  `docs/DECISIONS.md` — a valid PLAN.md-compliant alternative
  ("pending vs. collected split... derived from HandoverResult") that was
  evidently superseded during a later visual-redesign pass (see git log:
  "Final visual refinement: horizontal metrics row, compact chart,
  straight line segments"; "Final layout refinement: dense one-viewport
  desktop composition").
- Shelf occupancy chart (PLAN.md's other named option) — not built; the
  Shelf Map component (a non-Bklit grid) covers that need instead.

### Why

A running series shows *how* the run arrived at its final counts
(useful for understanding a rejection's position relative to
arrivals/collections), which a single end-state split chart cannot — this
is a reasonable interpretation of PLAN.md's "derived from HandoverResult,"
though PLAN.md's own example phrasing describes a split chart specifically.

### Trade-off

Pulls in a heavier dependency chain (`@visx/*`, `d3-array`, `d3-shape`)
than a simple ring/donut chart would need — mitigated by lazy-loading it
out of the initial bundle (see Evidence below, and the "Bundle size"
section of `README.md`).

### Consequence

- `vite.config.ts`'s `manualChunks` splits `react-vendor` into its own
  chunk; `EventsOverTimeChart`'s dynamic `import()` in `SummaryPanel.tsx`
  is the other half of resolving a `>500 kB` initial-chunk warning (see
  git commit `229ff80`, "Fix the >500 kB chunk warning: lazy-load the
  chart, split the React vendor chunk").
- `SummaryPanel.tsx`'s four numeric figures (Pending/Collected/Rejected/
  Events) are the ground truth the spec requires — "an optional Bklit
  chart never replaces the numeric values" (PLAN.md) — and remain fully
  correct and rendered even while the chart chunk is still loading
  (`Suspense fallback`).

### Evidence

- `src/components/EventsOverTimeChart.tsx`
- `src/lib/selectors.ts` — `getEventsOverTime`
- `src/components/SummaryPanel.tsx` — `React.lazy`, `Suspense`
- `vite.config.ts` — `manualChunks`
- `git log` — commit `229ff80`, `dd55023`
- `docs/PLAN.md` — Bklit Usage section

### Reasoning Classification

The specific claim that the ring-chart approach was deliberately replaced
by the area-chart approach (rather than the ring-chart never having
existed) is an **implementation inference** drawn from git history and
the stale `docs/DECISIONS.md` entry — there is no explicit commit message
stating "replace ring-chart with area-chart" to cite directly.

---

## Decision: Testing is layered — Vitest (exact-assertion domain), RTL (component wiring), Playwright (real-browser E2E + a11y)

### Context

PLAN.md: "Testing Layers — Vitest... RTL... Playwright... minimum 6
scenarios." "Domain Test Suite (Vitest — exact assertions, no
`toBeDefined()`)."

### Decision

Three layers, each targeting a distinct kind of regression:

1. **Vitest domain tests** (`src/tests/domain/{processor,validation,
   selectors}.test.ts`, plus `integration.test.ts`) — import `src/lib/*`
   directly, with no React/DOM involved at all. Every assertion here uses
   `.toEqual`/`.toBe` against exact expected values (parcel ID lists,
   summary objects, outcome sequences) — no `toBeDefined()`/`toBeTruthy()`
   placeholder assertions anywhere in these files.
2. **RTL** (`src/tests/ui/App.test.tsx`) — renders the real `<App />` in
   jsdom, drives it via `@testing-library/user-event`, and asserts on
   rendered text/`data-testid` — covers "does the UI dispatch the right
   action and render the right thing," which the domain tests alone
   cannot, since they never touch `appReducer.ts` or any component.
3. **Playwright** (`e2e/handover.spec.ts`, `accessibility.spec.ts`,
   `keyboard-nav.spec.ts`) — real Chromium, boots the actual `npm run dev`
   server (`playwright.config.ts`'s `webServer`), covers the 6 PLAN.md
   acceptance scenarios end-to-end, an axe-core WCAG sweep, and a
   keyboard-only walkthrough — the layer closest to what a real desk
   operator experiences, and the only layer that can catch real pointer-
   based dropdown behavior (`Select`) or actual computed CSS contrast.

### Alternatives

- Testing only at the Playwright layer — would be slow to iterate on and
  would make check-order bugs (PARCEL_ALREADY_SEEN vs.
  ACTIVE_CODE_COLLISION) harder to pin down precisely, since a browser
  test failure doesn't localize to a specific function the way a Vitest
  failure does.
- Testing only at the Vitest layer — would miss real UI wiring bugs (e.g.
  a button not actually calling `dispatch`) and cannot verify computed
  contrast ratios or reduced-motion behavior at all.

### Why

Each layer catches a different bug class at the cheapest possible cost:
domain logic bugs are cheapest to catch and pinpoint in Vitest (no DOM,
milliseconds per test); UI-wiring bugs need RTL; only-observable-in-a-
real-browser bugs (contrast, focus order, real Select interaction) need
Playwright.

### Limitations of current coverage

- No visual regression testing (screenshot diffing) beyond the manual
  reference-image comparison mentioned in `docs/PROMPTS.md`.
- The RTL suite (`App.test.tsx`) does not test the `Select` dropdown's
  actual open/close pointer interaction (acknowledged in its own doc
  comment: "can't cover things like actual pointer-based dropdown
  interaction — that's what e2e/handover.spec.ts is for" — though the E2E
  suite also never directly exercises changing the Action dropdown; it
  edits text fields).
- No test asserts oxlint/`tsc -b` pass with zero warnings as part of the
  automated suite (`README.md`/PLAN.md's Phase 16 audit describes this as
  a manual/CI step, not a Vitest/Playwright assertion).

### Evidence

- `src/tests/domain/*.test.ts`, `src/tests/ui/App.test.tsx`,
  `e2e/*.spec.ts`
- `vite.config.ts` — `test.include` scoped to `src/tests/**` specifically
  so Vitest's default glob doesn't also try to run Playwright's
  `e2e/*.spec.ts` files
- `docs/PLAN.md` — Testing Layers, Domain Test Suite

---

## Decision: Build/tooling choices actually present

### Context

PLAN.md's Technology Stack section and Phase 1 (Scaffolding).

### Decision

- **Vite** (`vite.config.ts`) — dev server + production build
  (`tsc -b && vite build`), with a `manualChunks` split for the React
  vendor bundle and Vitest configuration co-located in the same file
  (`/// <reference types="vitest/config" />`).
- **TypeScript strict mode** (`tsconfig.app.json`) — `strict: true`,
  `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
  target `es2023`. The `"@/*"` path alias mirrors Vite's own
  `resolve.alias`, required because shadcn/ui-generated components import
  via `@/lib/utils` etc.
- **oxlint** (`.oxlintrc.json`) — `react/rules-of-hooks: error`,
  `react/only-export-components: warn` (the latter is why
  `OUTCOME_DESCRIPTIONS` lives in `constants.ts` rather than inside
  `OutcomeBadge.tsx`, per that constant's own doc comment).
- **No CI configuration exists in this repository** — no `.github/
  workflows/`. PLAN.md's Phase 15 lists "Optional: GitHub Actions running
  Vitest + Playwright on push" — this was not implemented; test suites
  are run manually (`npm run test`, `npm run test:e2e`).
- **Deployment**: `README.md`/PLAN.md describe a Vercel-compatible static
  build (`npm run build` produces `dist/`); no deployment configuration
  file (e.g. `vercel.json`) is present in the repository — Vite's default
  static-build output is Vercel's auto-detected format, requiring no
  extra config.

### Evidence

- `vite.config.ts`, `tsconfig.app.json`, `tsconfig.json`,
  `tsconfig.node.json`, `.oxlintrc.json`, `package.json` scripts
- Absence of `.github/workflows/` and `vercel.json` in the repository
  listing

### Reasoning Classification

The absence of CI configuration and the "not implemented" status of
Phase 15's optional GitHub Actions item are directly observable facts
(no such files exist), not inferences.
