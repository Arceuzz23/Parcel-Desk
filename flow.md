# Application Execution Flow

This document traces exactly how the application executes — real function
names, real files, real call order — verified by reading the source
directly. It is not a design document (see `decisions.md` for the "why").

---

## 1. Application Boot

```
index.html
    ↓  <script type="module" src="/src/main.tsx">
src/main.tsx
    ↓  createRoot(document.getElementById("root")!)
    ↓  .render(<StrictMode><App /></StrictMode>)
src/app/App.tsx  — function App()
    ↓  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState)
src/app/appReducer.ts — createInitialState()
    ↓  rows: toRows(getBuiltInEvents())     — src/lib/sampleData.ts
    ↓  lastResult: null
    ↓  validationErrors: []
    ↓  selectedParcelId: null
    ↓
App renders:
  <MotionConfig reducedMotion="user">
    <Header onRun={...} onReset={...} />
    <SummaryPanel result={null} />
    <ValidationBanner errors={[]} />
    <HandoverBoard result={null} .../>
    <EventTimeline result={null} .../>
    <ShelfMap result={null} .../>          → returns null (no result yet, see §3)
    <EventTable rows={...} dispatch={...} />
  </MotionConfig>
```

`getBuiltInEvents()` (`src/lib/sampleData.ts`) returns a **fresh clone**
(`.map((event) => ({ ...event }))`) of a module-level `const BUILT_IN_
EVENTS` array — the canonical fixture itself is never mutated by this
call. `toRows()` (`appReducer.ts`) wraps each `EventInput` in an
`EditableEventRow { key: crypto.randomUUID(), data }` — `key` is a
React-reconciliation identity, never seen by `src/lib/`.

## 2. Component Tree

```
App
├── Header                (onRun, onReset callbacks only)
├── SummaryPanel           (result)
│   └── EventsOverTimeChart   (lazy-loaded, only rendered once result !== null)
├── ValidationBanner       (errors)
├── HandoverBoard          (result, selectedParcelId, onSelectParcel)
│   └── ParcelLabel × N        (one per pending/collected parcel)
├── EventTimeline          (result, selectedParcelId, onSelectParcel)
│   └── RejectionDetails       (rendered inline, not a separate exported component)
├── ShelfMap               (result, selectedParcelId, onSelectParcel)
│   └── ParcelLabel × N        (same component HandoverBoard uses)
└── EventTable             (rows, dispatch)
```

Render order in `App.tsx` (a dense, single-viewport composition, not a
long scrolling page):

```
Header
SummaryPanel
ValidationBanner
grid (2 columns on xl+):
  left column:  HandoverBoard, then EventTimeline
  right column: ShelfMap, then EventTable
```

Per-component responsibility (props / state / callbacks):

| Component | Props in | Local state | Calls out | Callbacks fired |
|---|---|---|---|---|
| `Header` | `onRun`, `onReset` | none | none | `onRun()`, `onReset()` on button click |
| `SummaryPanel` | `result: HandoverResult \| null` | none | `getSummary(result)`, `getEventsOverTime(result)` | none |
| `ValidationBanner` | `errors: ValidationError[]` | none | none | none |
| `HandoverBoard` | `result`, `selectedParcelId`, `onSelectParcel` | none | reads `result.pending`/`result.collected` directly | `onSelectParcel(parcelId)` per `ParcelLabel` click |
| `EventTimeline` | `result`, `selectedParcelId`, `onSelectParcel` | none | reads `result.outcomes` directly | `onSelectParcel(parcelId)` per timeline-node click |
| `ShelfMap` | `result`, `selectedParcelId`, `onSelectParcel` | none | `getShelfMap(result)` | `onSelectParcel(parcelId)` per `ParcelLabel` click |
| `EventTable` | `rows`, `dispatch` | none | none | `dispatch({type:"ADD_ROW"\|"UPDATE_FIELD"\|"DELETE_ROW"})` |
| `ParcelLabel` | `parcelId, student, shelf, pickupCode, tone, selected, dimmed, onSelect` | none | none | `onSelect(parcelId)` on click |

`App.tsx` is the **only** component holding React state (`useReducer`) —
every other component is a pure function of its props.

## 3. Initial State (first paint)

Stored state (`AppState`, in the reducer):

- `rows` — the 6 built-in events, cloned into editable rows.
- `lastResult` — `null`.
- `validationErrors` — `[]`.
- `selectedParcelId` — `null`.

Derived values computed fresh on this render (none are stored):

- `SummaryPanel`: `summary = null` (skips `getSummary` entirely since
  `result === null`); each of the 4 figures renders `"—"`.
- `EventTimeline`: renders the `outcomes-pre-run` `EmptyState` branch.
- `HandoverBoard`: renders the `board-pre-run` `EmptyState` branch.
- `ShelfMap`: `result === null` → component returns `null` (renders
  nothing at all — no panel, no empty state; see its own guard clause).
- `EventTable`: renders all 6 rows from `state.rows`.

Distinction: **stored** = `rows`, `lastResult`, `validationErrors`,
`selectedParcelId` (the 4 reducer fields). **Derived** = everything else
on screen — every number, list, and chart series is recomputed from
`lastResult` on every render via `src/lib/selectors.ts` functions or
direct field access; nothing is cached in state.

## 4. Event Editing Flow

```
User types into a cell (e.g. Pickup Code input)
    ↓
<Input onChange={(event) => updateField(row.key, "pickupCode", event.target.value.toUpperCase())}>   — EventTable.tsx
    ↓
updateField(key, field, value)   — local helper inside EventTable.tsx
    ↓
dispatch({ type: "UPDATE_FIELD", key, field, value })
    ↓
appReducer.ts — case "UPDATE_FIELD":
    return { ...state, rows: state.rows.map((row) =>
      row.key === action.key ? { ...row, data: { ...row.data, [field]: value } } : row) }
    ↓
React re-renders EventTable with the new rows
    ↓
lastResult / validationErrors / selectedParcelId are UNTOUCHED
    ↓
Every other component (SummaryPanel, HandoverBoard, EventTimeline, ShelfMap)
re-renders with the SAME lastResult prop as before — no visible change there.
```

**No realtime validation exists.** Typing an invalid pickup code (e.g.
`"bad"`) does not trigger `validateEvents()` — it only updates
`row.data.pickupCode` in `rows`. Validation only runs when `RUN` is
dispatched (§7/§8). This is confirmed by reading `EventTable.tsx`
(`updateField` only ever dispatches `UPDATE_FIELD`, never imports
`validateEvents`) and by `appReducer.ts`'s `UPDATE_FIELD` case, which has
no call into `src/lib/validation.ts`.

The Pickup Code field does auto-uppercase each keystroke
(`event.target.value.toUpperCase()`) and is capped at `maxLength={4}` in
the `<Input>` — this is an input-shaping convenience in the UI layer, not
domain validation; `validateEvents()` still independently re-checks the
regex on every Run regardless of what the input widget already enforced.

## 5. Add Event Flow

```
User clicks "Add Event" (EventTable.tsx headerRight button)
    ↓
onClick={() => dispatch({ type: "ADD_ROW" })}
    ↓
appReducer.ts — case "ADD_ROW":
    return { ...state, rows: [...state.rows,
      { key: createRowKey(), data: createEmptyRowInput() }] }
    ↓
createEmptyRowInput() — { id:"", action:"ARRIVE", parcelId:"", student:"", pickupCode:"", shelf:"" }
    ↓
React re-renders EventTable with one additional blank row (action defaults to "ARRIVE")
```

`lastResult`/`validationErrors`/`selectedParcelId` untouched, same as §4.

## 6. Delete Event Flow

```
User clicks the trash icon on a row (EventTable.tsx)
    ↓
onClick={() => dispatch({ type: "DELETE_ROW", key: row.key })}
    ↓
appReducer.ts — case "DELETE_ROW":
    return { ...state, rows: state.rows.filter((row) => row.key !== action.key) }
    ↓
React re-renders EventTable with that row removed; remaining rows shift up
(row numbers # are computed from array index at render time, not stored)
```

Deleting every row leaves `rows: []`, which `EventTable.tsx` renders as
the `event-table-empty` `EmptyState` block.

## 7. Run Handover — PRIMARY FLOW

```
User clicks "Run Handover"  (Header.tsx, data-testid="run-handover")
    ↓
onRun()  — passed down from App.tsx: () => dispatch({ type: "RUN" })
    ↓
appReducer.ts — case "RUN":
    const inputs = state.rows.map((row) => row.data)     // strip UI-only `key`
    const validation = validateEvents(inputs)             — src/lib/validation.ts
    ↓
    ┌─ if (!validation.valid):
    │     return { ...state,
    │       lastResult: null,                 // explicitly cleared, not left stale
    │       validationErrors: validation.errors,
    │       selectedParcelId: null }
    │     ⇒ App re-renders: ValidationBanner shows errors,
    │       SummaryPanel/HandoverBoard/EventTimeline all show their
    │       "no result yet" branches (result === null)
    │
    └─ if (validation.valid):
          const result = processHandover(validation.events)  — src/lib/processor.ts
          return { ...state,
            lastResult: result,
            validationErrors: [],
            selectedParcelId: null }
          ⇒ App re-renders: SummaryPanel/HandoverBoard/EventTimeline/ShelfMap
            all now read the new non-null `result`
```

`appReducer.ts` calls `validateEvents` and `processHandover` directly —
there is no intermediate "handler" function in `App.tsx` or
`Header.tsx`; the entire pipeline lives in the single `RUN` reducer case.

Arguments/return values at each step:

- `validateEvents(inputs: EventInput[])` → `ValidationResult { valid,
  errors: ValidationError[], events: Event[] }`.
- `processHandover(events: Event[])` (only called if `validation.valid`)
  → `HandoverResult { outcomes: EventOutcome[], pending: PendingParcel[],
  collected: CollectedParcel[] }`.

## 8. Validation Flow

```
validateEvents(inputs)   — src/lib/validation.ts
    ↓
for each input row (rowIndex = index + 1):
    trim id/action/parcelId/student/pickupCode/shelf
    ├─ id === ""                          → push INVALID_EVENT (field: "Event ID")
    ├─ else if seenIds.has(id)            → push DUPLICATE_EVENT_ID (field: "Event ID")
    ├─ else                               → seenIds.add(id)
    ├─ parcelId === ""                    → push INVALID_EVENT (field: "Parcel ID")
    ├─ action not in {ARRIVE, COLLECT}    → push INVALID_EVENT (field: "Action")
    ├─ !PICKUP_CODE_REGEX.test(pickupCode)→ push INVALID_PICKUP_CODE (field: "Pickup Code")
    └─ if action === "ARRIVE":
         ├─ student === ""  → push INVALID_EVENT (field: "Student")
         └─ shelf === ""    → push INVALID_EVENT (field: "Shelf")
    ↓
(every row is checked — the loop never stops early on the first error)
    ↓
if errors.length > 0:  return { valid: false, errors, events: [] }
else:                   return { valid: true, errors: [], events: <trimmed Event[]> }
```

`PICKUP_CODE_REGEX = /^[A-Z0-9]{4}$/` (`src/lib/constants.ts`) — 4
characters, each independently an uppercase letter or digit.

What happens after failure: `appReducer.ts`'s `RUN` case (see §7) sets
`lastResult: null` and `validationErrors: validation.errors` — per
PLAN.md, this produces **zero** event outcomes, zero board rows, and zero
summary; `ValidationBanner.tsx` renders every `ValidationError.message`
verbatim as a list item (no summarizing/truncation), and
`HandoverBoard`/`EventTimeline`/`SummaryPanel` all render their "no
result yet" branches exactly as if the app had just loaded or been reset
— because `lastResult` is `null` in both cases (see §14 and
`decisions.md`'s reset-vs-empty-run entry for why this is intentional).

## 9. Event Processing Flow

`processHandover(events: Event[])` — `src/lib/processor.ts`. Fresh local
state declared on every call: `outcomes: EventOutcome[] = []`, `pending:
PendingParcel[] = []`, `collected: CollectedParcel[] = []`,
`seenParcelIds: Set<string>`, `pendingByParcelId: Map<string,
PendingParcel>`, `parcelIdByActiveCode: Map<string, string>`. Then, for
each `event` **in array order** (`for (const event of events)`):

### ARRIVE

```
event (action === "ARRIVE")
    ↓
seenParcelIds.has(event.parcelId)?
    ├─ yes → outcomes.push({event, outcome:"PARCEL_ALREADY_SEEN"}); continue
    └─ no
        ↓
    parcelIdByActiveCode.has(event.pickupCode)?
        ├─ yes → outcomes.push({event, outcome:"ACTIVE_CODE_COLLISION"}); continue
        └─ no
            ↓
        parcel = { parcelId, student, pickupCode, shelf, arrivedAtEventId: event.id }
        pending.push(parcel)
        pendingByParcelId.set(event.parcelId, parcel)
        seenParcelIds.add(event.parcelId)
        parcelIdByActiveCode.set(event.pickupCode, event.parcelId)
        outcomes.push({event, outcome:"ARRIVED"}); continue
```

### COLLECT

```
event (action === "COLLECT")
    ↓
parcel = pendingByParcelId.get(event.parcelId)
    ↓
parcel undefined?
    ├─ yes → outcomes.push({event, outcome:"PARCEL_NOT_PENDING"}); continue
    └─ no
        ↓
    parcel.pickupCode !== event.pickupCode?
        ├─ yes → outcomes.push({event, outcome:"PICKUP_CODE_MISMATCH"}); continue
        └─ no
            ↓
        pending.splice(pending.indexOf(parcel), 1)
        pendingByParcelId.delete(event.parcelId)
        parcelIdByActiveCode.delete(parcel.pickupCode)
        collectedParcel = { parcelId, student, pickupCode, shelf, collectedAtEventId: event.id }
        collected.push(collectedParcel)
        outcomes.push({event, outcome:"COLLECTED"}); continue
```

After the loop: `return { outcomes, pending, collected }`.

## 10. Output Derivation

| Output | Function | File | Input | Consumed by | Kind |
|---|---|---|---|---|---|
| Pending count | `getSummary(result).pending` (`= result.pending.length`) | `src/lib/selectors.ts` | `HandoverResult` | `SummaryPanel` | DERIVED |
| Collected count | `getSummary(result).collected` | `src/lib/selectors.ts` | `HandoverResult` | `SummaryPanel` | DERIVED |
| Rejected count | `getSummary(result).rejected` (filters `outcomes` by `REJECTED_OUTCOMES`) | `src/lib/selectors.ts` | `HandoverResult` | `SummaryPanel` | DERIVED |
| Events total | `result.outcomes.length` (read directly, no selector) | `SummaryPanel.tsx` | `HandoverResult` | `SummaryPanel` | DERIVED |
| Pending board list | `result.pending` (read directly) | `HandoverBoard.tsx` | `HandoverResult` | `HandoverBoard` → `ParcelLabel[]` | DERIVED (already the stored shape of `HandoverResult`, but `HandoverResult` itself is stored only inside `lastResult`) |
| Collected board list | `result.collected` (read directly) | `HandoverBoard.tsx` | `HandoverResult` | `HandoverBoard` → `ParcelLabel[]` | DERIVED |
| Shelf map | `getShelfMap(result)` | `src/lib/selectors.ts` | `HandoverResult` | `ShelfMap` | DERIVED |
| Shelf occupancy (unused by any current component — see below) | `getShelfOccupancy(result)` | `src/lib/selectors.ts` | `HandoverResult` | tested directly in `src/tests/domain/selectors.test.ts`; not called from any component | DERIVED |
| Events-over-time series | `getEventsOverTime(result)` | `src/lib/selectors.ts` | `HandoverResult` | `SummaryPanel` → `EventsOverTimeChart` | DERIVED |
| Rejected-events detail list | `result.outcomes.filter((o) => REJECTED_OUTCOMES.has(o.outcome))` (inline, not a named selector) | `EventTimeline.tsx`'s `RejectionDetails` | `HandoverResult` | `EventTimeline` | DERIVED |

`lastResult` itself is the one **STORED** value all of the above derive
from; nothing in this table is stored separately from it. (`getShelfOccupancy`
is exported and unit-tested but not currently called by any React
component — `ShelfMap.tsx` uses `getShelfMap`, a superset that also
includes now-empty shelves.)

## 11. Reset Flow

```
User clicks "Reset"  (Header.tsx)
    ↓
onReset()  — App.tsx: () => dispatch({ type: "RESET" })
    ↓
appReducer.ts — case "RESET":
    return createInitialState()
    ↓
createInitialState():
    rows: toRows(getBuiltInEvents())   — fresh clone of the 6-event fixture
    lastResult: null
    validationErrors: []
    selectedParcelId: null
    ↓
App re-renders with a brand-new AppState object (not a patch of the old one):
    EventTable      → shows the 6 built-in rows again (any user edits/added/deleted rows are discarded)
    ValidationBanner → renders nothing (errors === [])
    SummaryPanel     → all 4 figures show "—" (result === null)
    HandoverBoard    → board-pre-run EmptyState
    EventTimeline    → outcomes-pre-run EmptyState
    ShelfMap         → returns null
```

## 12. Unit Test Flow (Vitest)

| Test file | Imports from `src/lib/` | What it proves |
|---|---|---|
| `src/tests/domain/processor.test.ts` | `processHandover`, `validateEvents`, `getBuiltInEvents`, `getSummary` | Canonical oracle exact match; corrected-E03 collection; E06 collision; empty input; source-order (out-of-order IDs); ARRIVE/COLLECT check-order priority; blank-student/shelf COLLECT; purity (no input mutation, fresh state per call) |
| `src/tests/domain/validation.test.ts` | `validateEvents`, `getBuiltInEvents` | Pickup-code regex (mixed/all-letter/all-digit accepted; short/long/lowercase/non-alphanumeric/empty rejected); every structural rule (empty ID, duplicate ID, empty parcel ID, bad action, missing ARRIVE student/shelf, COLLECT not requiring them); whitespace trimming; zero-partial-output on failure; all-errors-reported (not just first) |
| `src/tests/domain/selectors.test.ts` | `processHandover`, `validateEvents`, `getBuiltInEvents`, all of `src/lib/selectors.ts` | `getSummary` on both the oracle and an empty result; `getShelfOccupancy` grouping; `getShelfMap` including an emptied-but-used shelf (B1); `getEventsOverTime`'s exact cumulative series against the oracle |
| `src/tests/domain/integration.test.ts` | `validateEvents`, `processHandover`, `getBuiltInEvents` | The full validate→process pipeline end to end: duplicate-ID structural failure yields `events: []`; a valid run yields the exact oracle outcome sequence |

Setup: `src/tests/setup.ts` stubs `window.matchMedia` (jsdom has none;
needed by Motion's reduced-motion detection) and `window.ResizeObserver`
(needed by the Bklit chart's `@visx/responsive` sizing) as no-ops, loaded
via `vite.config.ts`'s `test.setupFiles`.

`src/tests/ui/App.test.tsx` (RTL, distinct from the domain suite) renders
the real `<App />` and asserts: initial reset-state placeholders; a full
Run produces the correct outcomes/board/summary; running an emptied table
produces explicit `0/0/0`; a duplicate-ID edit blocks the run with a
specific banner message and no partial output; an invalid pickup code
produces a specific banner message; editing after a Run does not change
the displayed result; Reset restores the 6 rows and pre-run placeholders;
Add Event appends a 7th blank row.

## 13. Playwright / E2E Flow

```
npm run test:e2e
    ↓
playwright.config.ts webServer: `npm run dev` (real Vite dev server, port 5173)
    ↓
each test:
    page.goto("/")
    ↓
    (real browser) fillCell(page, row, field, value)
        → page.getByLabel(`Row {row} {field}`, { exact: true }).fill(value)
    (real browser) runHandover(page)
        → page.getByTestId("run-handover").click()
    ↓
    assertions against rendered DOM: page.getByTestId(...), .toContainText(...),
    expectColumnParcelIds() (reads data-testid="parcel-{id}" attributes
    inside a column's testid container, in DOM order)
```

`e2e/handover.spec.ts` — the 6 required acceptance scenarios, named
`test("1. built-in fixture matches the canonical oracle", ...)` through
`test("6. Reset (no result) is visually distinct from an empty completed
run", ...)`.

`e2e/accessibility.spec.ts` — `AxeBuilder({ page }).withTags(["wcag2a",
"wcag2aa"]).analyze()` run against 3 states (pre-run, post-Run, validation-
error), asserting `results.violations` is empty; plus a `reducedMotion:
"reduce"` project variant asserting the app still fully populates and
every element reaches `opacity: 1` without a settle delay.

`e2e/keyboard-nav.spec.ts` — focuses inputs/buttons directly (`.focus()`)
and drives the primary flow (edit → Run → Reset) via `page.keyboard.press`
only, asserting focus and final state at each step.

## 14. Complete Canonical Execution Trace (built-in 6-event scenario)

```
Browser loads
    ↓
main.tsx → createRoot().render(<App/>)
    ↓
App.tsx → useReducer(appReducer, undefined, createInitialState)
    ↓
createInitialState() → rows = 6 built-in EditableEventRows, lastResult = null
    ↓
[UI shows: 6-row EventTable, "—" summary figures, board-pre-run, outcomes-pre-run]
    ↓
User clicks "Run Handover"
    ↓
dispatch({ type: "RUN" })
    ↓
appReducer.ts: inputs = 6 EventInputs (stripped of `key`)
    ↓
validateEvents(inputs)                — src/lib/validation.ts
    all 6 rows pass every structural rule (id/action/parcelId/pickupCode
    valid; ARRIVE rows have student+shelf; COLLECT rows' blank
    student/shelf are allowed)
    ↓ { valid: true, errors: [], events: [6 trimmed Events] }
    ↓
processHandover(events)               — src/lib/processor.ts
    E01 ARRIVE  P01  K7M2  A1  → seenParcelIds{}, activeCode{} both miss → ARRIVED
                                   pending=[P01], seen={P01}, activeCode={K7M2→P01}
    E02 ARRIVE  P02  R4Q8  B1  → both miss → ARRIVED
                                   pending=[P01,P02], seen={P01,P02}, activeCode={K7M2→P01,R4Q8→P02}
    E03 COLLECT P01  ZZZZ      → pendingByParcelId has P01 → parcel.pickupCode(K7M2) !== ZZZZ
                                   → PICKUP_CODE_MISMATCH (no state change)
    E04 ARRIVE  P03  T9C4  A2  → both miss → ARRIVED
                                   pending=[P01,P02,P03], activeCode += {T9C4→P03}
    E05 COLLECT P02  R4Q8      → pendingByParcelId has P02 → code matches
                                   → COLLECTED: pending=[P01,P03], collected=[P02],
                                     activeCode -= R4Q8
    E06 ARRIVE  P04  H2N6  B2  → seenParcelIds misses P04, activeCode misses H2N6
                                   → ARRIVED: pending=[P01,P03,P04]
    ↓
    return { outcomes: [ARRIVED,ARRIVED,PICKUP_CODE_MISMATCH,ARRIVED,COLLECTED,ARRIVED],
             pending: [P01,P03,P04], collected: [P02] }
    ↓
appReducer.ts: return { ...state, lastResult: result, validationErrors: [], selectedParcelId: null }
    ↓
App re-renders with the new state:
    SummaryPanel   → getSummary(result) = {pending:3, collected:1, rejected:1};
                     events figure = result.outcomes.length = 6
                     → EventsOverTimeChart lazy-loads and renders getEventsOverTime(result)
    EventTimeline  → outcomes-list renders 6 nodes E01→E02→E03→E04→E05→E06 in that
                     exact order; E03's node is styled rejected (XCircle, rejected border);
                     RejectionDetails renders one row for E03: "expected K7M2 · received ZZZZ",
                     consequence "Parcel P01 remains on shelf A1" (looked up from result.pending)
    HandoverBoard  → Pending column: P01, P03, P04 (in that order, accepted-arrival order);
                     Collected column: P02
    ShelfMap       → getShelfMap(result): A1{P01}, A2{P03}, B1{} (used, now empty — P02 collected), B2{P04}
    ↓
[UI shows the exact canonical oracle from docs/PLAN.md]
```

## 15. File-to-File Call Graph (application-level)

```
main.tsx
  └─ App.tsx
       ├─ appReducer.ts
       │    ├─ validateEvents()        (src/lib/validation.ts)
       │    │    └─ PICKUP_CODE_REGEX   (src/lib/constants.ts)
       │    ├─ processHandover()       (src/lib/processor.ts)
       │    └─ getBuiltInEvents()      (src/lib/sampleData.ts)
       │
       ├─ Header.tsx                    (dispatch via onRun/onReset props only)
       │
       ├─ SummaryPanel.tsx
       │    ├─ getSummary()            (src/lib/selectors.ts)
       │    ├─ getEventsOverTime()     (src/lib/selectors.ts)
       │    └─ EventsOverTimeChart.tsx  (React.lazy, only once result != null)
       │         └─ src/components/charts/{area-chart,grid,area}.tsx  (Bklit-sourced)
       │
       ├─ ValidationBanner.tsx          (renders ValidationError[] verbatim)
       │
       ├─ HandoverBoard.tsx
       │    └─ ParcelLabel.tsx × N
       │
       ├─ EventTimeline.tsx
       │    ├─ OutcomeBadge.tsx          (uses OUTCOME_DESCRIPTIONS, REJECTED_OUTCOMES — src/lib/constants.ts)
       │    └─ RejectionDetails (inline) (reads result.pending/collected directly)
       │
       ├─ ShelfMap.tsx
       │    ├─ getShelfMap()            (src/lib/selectors.ts)
       │    └─ ParcelLabel.tsx × N       (same component as HandoverBoard)
       │
       └─ EventTable.tsx
            ├─ src/components/ui/{table,input,select,button}.tsx  (shadcn primitives)
            └─ dispatch({ADD_ROW | UPDATE_FIELD | DELETE_ROW})
```

`Panel.tsx` and `EmptyState.tsx` are shared leaves used by
`HandoverBoard`, `EventTimeline`, `ShelfMap`, `EventTable`,
`SummaryPanel`, and `EventsOverTimeChart` — omitted from the branches
above to keep the graph at the application-logic level rather than every
shared UI leaf.

No component below `App.tsx` ever calls `dispatch` directly except
through a callback prop (`onRun`, `onReset`, `onSelectParcel`,
`dispatch` itself passed to `EventTable`) — `App.tsx` is the only place
the `AppAction` union is constructed for `RUN`/`RESET`/`SELECT_PARCEL`;
`EventTable.tsx` constructs `ADD_ROW`/`UPDATE_FIELD`/`DELETE_ROW` directly
since it's handed the raw `dispatch` function rather than pre-bound
callbacks.
