# Interview Questions — Parcel Desk

Grounded in the actual repository (`decisions.md` = WHY, `flow.md` = HOW),
`docs/PLAN.md` (the de facto P11 spec — the actual `docs/P11-SPEC.md` was
never supplied to this project; see `docs/PROMPTS.md`), and the test
suites. Hypothetical/productionization questions are labeled explicitly
and never imply the shipped app contains a backend, database, or network
service.

---

## 1. Problem Understanding

### Q: What problem does Parcel Desk solve?

**Answer:** A hostel parcel desk needs to process a day's worth of
ARRIVE/COLLECT events (a parcel arriving on a shelf, a student collecting
one) and produce a final board of what's still pending and what's been
collected, plus a per-event outcome log — deterministically, from a
complete, editable event table.

**Code:** `docs/PLAN.md`'s Target Architecture; `src/lib/processor.ts`.

**Follow-up:** Why is this "handover" processed as a batch (Run Handover)
rather than event-by-event in real time?

**Strong follow-up answer:** PLAN.md's UI explicitly separates "editable
input state" from "last processed result" and requires full-table
validation *before* any processing — a real-time model would either skip
that validation gate per keystroke or require debouncing/partial-state
handling PLAN.md never asks for. Batch processing on an explicit action
also matches how this app's test suite verifies behavior deterministically
(one call, one exact expected `HandoverResult`).

---

### Q: Why is the event log the source of truth?

**Answer:** All board/summary/chart/shelf-map state is derived from
`processHandover(events)`'s return value — nothing else stores parcel
state independently. Editing the log and clicking Run is the only way to
change what's displayed.

**Code:** `src/app/appReducer.ts` — `rows` is the only user-editable
field; `lastResult` is only ever replaced wholesale by `processHandover()`.

**Follow-up:** What would break if the Handover Board instead kept its own
mutable list of parcels, updated incrementally as rows are edited?

**Strong follow-up answer:** It could desynchronize from what a fresh
`processHandover()` run over the current table would actually produce —
e.g. deleting an ARRIVE row wouldn't automatically un-arrive its parcel
on the board unless the incremental update logic special-cased every
possible edit. A single derived source avoids that whole bug class.

---

### Q: Why does source order matter, and where is it enforced?

**Answer:** PLAN.md requires processing "in source order (never event-ID
order, never sorted)" — because check outcomes like
`PARCEL_ALREADY_SEEN`/`ACTIVE_CODE_COLLISION` genuinely depend on what
happened earlier in the *actual* sequence of events, which is not
necessarily the same as sorting by the (free-text) Event ID field.

**Code:** `src/lib/processor.ts` — `for (const event of events)`, a plain
array iteration with no `.sort()` anywhere. Verified by
`src/tests/domain/processor.test.ts`'s "source-order processing" test,
which deliberately uses IDs out of numeric order (`E03, E01, E02`) so a
hidden sort-by-ID bug couldn't hide behind the built-in fixture's
already-ordered IDs.

**Follow-up:** Why doesn't the canonical built-in oracle alone prove
source-order correctness?

**Strong follow-up answer:** Because `E01...E06`'s IDs already happen to
be in ascending, source-matching order — a processor that (incorrectly)
sorted by ID first would still pass the oracle test by coincidence. The
dedicated out-of-order test exists specifically to rule that out.

---

### Q: What is a structural validation error, concretely?

**Answer:** A problem with the input row itself that makes it impossible
to interpret as a valid event at all — empty/duplicate Event ID, empty
Parcel ID, an action that isn't `ARRIVE`/`COLLECT`, an invalid pickup
code, or (for ARRIVE) a missing student/shelf. Detected by
`validateEvents()` *before* any ARRIVE/COLLECT logic runs, and it
invalidates the **entire** run, not just that row.

**Code:** `src/lib/validation.ts`; `ValidationErrorCode` in
`src/lib/types.ts` (`INVALID_EVENT`, `DUPLICATE_EVENT_ID`,
`INVALID_PICKUP_CODE`).

**Follow-up:** Contrast this with a state-dependent rejection.

**Strong follow-up answer:** See next question — the key difference is
that a structural error can't even be turned into a well-formed `Event`
object, whereas a state rejection is a well-formed event that simply
conflicts with the parcel-desk's *current state* (e.g. this parcel was
already collected).

---

### Q: What is a state-dependent rejection?

**Answer:** A structurally valid event that `processHandover()` cannot
apply because of the board's current state at that point in the replay —
`PARCEL_ALREADY_SEEN`, `ACTIVE_CODE_COLLISION`, `PARCEL_NOT_PENDING`,
`PICKUP_CODE_MISMATCH`. Unlike structural errors, these don't abort
anything — they're recorded as a normal `EventOutcome` and processing
continues to the next event.

**Code:** `src/lib/processor.ts` — every rejection branch is
`outcomes.push(...); continue;`, never a `return`/`throw`.

**Follow-up:** Why does a rejection not mutate state?

**Strong follow-up answer:** Because by definition the event was invalid
*in context* — e.g. `PICKUP_CODE_MISMATCH` means "this parcel is pending
but you gave the wrong code," which should not change what's on the
shelf. If it *did* mutate state, a wrong-code scan could accidentally
collect the wrong parcel — the check-then-reject pattern is what keeps
the board correct even when desk staff make an entry mistake.

---

### Q: Why does every run start with empty internal state?

**Answer:** `processHandover()` declares fresh `Set`/`Map`/array locals on
every call — nothing persists across calls, and the function has no
module-level or closure state. Running the same events twice produces two
distinct-but-equal `HandoverResult` objects.

**Code:** `src/lib/processor.ts` — local declarations inside the function
body; `src/tests/domain/processor.test.ts`'s "purity" block
(`expect(first).not.toBe(second); expect(first).toEqual(second)`).

**Follow-up:** What would go wrong if `seenParcelIds` were declared at
module scope instead of inside the function?

**Strong follow-up answer:** A second, unrelated Run (e.g. after editing
the table and clicking Run again) would incorrectly treat parcels from
the *previous* run as "already seen," producing spurious
`PARCEL_ALREADY_SEEN` rejections for parcels that are actually fine in
the new table.

---

### Q: Why is an empty event table a valid, meaningful state — not an error?

**Answer:** PLAN.md's acceptance test 4 requires running an empty table to
produce an explicit `0/0/0` result — a real completed run that happens to
have processed zero events — not a validation failure and not the same
as never having run at all.

**Code:** `validateEvents([])` returns `{ valid: true, errors: [], events:
[] }`; `processHandover([])` returns `{ outcomes: [], pending: [],
collected: [] }`. Both tested directly
(`src/tests/domain/validation.test.ts`, `processor.test.ts`).

**Follow-up:** How is this visually distinguished from Reset?

**Strong follow-up answer:** See §10 below — `lastResult` is `null` after
Reset (or on first load) vs. a real, non-null, zero-length
`HandoverResult` after running an emptied table; every consuming
component branches on `result === null` first.

---

## 2. Architecture

### Q: Why frontend-only? Why no backend/database?

**Answer:** `CLAUDE.md`'s Hard Constraints and PLAN.md's Hard Constraints
both explicitly forbid backend/API/database/Redis/Docker/network service —
this is a stated requirement of the assignment, not a technical
limitation of the domain (a real parcel desk plausibly *would* have a
backend — see `docs/SYSTEM-DESIGN.md`, explicitly marked conceptual/
never-implemented).

**Code:** No server code, no `fetch` calls, anywhere in `src/`.

### Q: Why in-memory state?

**Answer:** Same Hard Constraints list: "zero network calls at runtime,"
implying no persistence layer either. `AppState` lives entirely in one
`useReducer`; a page reload returns to the built-in fixture.

**Code:** `src/app/appReducer.ts`.

### Q: Where is authoritative state, precisely?

**Answer:** `AppState` in `src/app/appReducer.ts`, held by the single
`useReducer` call in `App.tsx`. Two of its four fields are genuinely
independent sources of truth (`rows` = input, `lastResult` = last
processed output); `validationErrors` and `selectedParcelId` are
secondary/UI-facing state.

### Q: What is domain logic vs. presentation logic here?

**Answer:** Domain logic = `src/lib/{types,constants,sampleData,
validation,processor,selectors}.ts` — zero React/DOM/browser imports,
directly importable into a plain Node test. Presentation logic =
everything in `src/components/`, `src/app/`, and `src/lib/motion.ts` —
consumes domain output, decides nothing about what counts as a valid
pickup code or what ARRIVE/COLLECT do.

**Code:** Verify by grepping `src/lib/` for `react`/`document`/`window` —
none present (`src/lib/motion.ts` is presentation, deliberately kept
separate from the `lib/` domain files despite living in the same
directory — see its own doc comment for why).

### Q: Why separate processing from React?

**Answer:** So the domain engine can be unit-tested with exact assertions
in milliseconds, with no DOM, no React rendering, no jsdom — and so the
UI can be restyled/rearranged without risking a change to what
`processHandover()` computes.

**Code:** `src/tests/domain/*.test.ts` import only from `src/lib/`.

### Q: How do we avoid duplicated state?

**Answer:** Every board/summary/chart/shelf-map view reads either
`lastResult` directly or a pure derivation of it via
`src/lib/selectors.ts` — none of them hold an independent copy. The one
piece of state shared across three components (`selectedParcelId`) is a
single field in the same reducer, not three separately-synchronized
local states.

**Code:** `decisions.md` — "One reducer, one cross-highlight field" entry.

---

## 3. Execution Flow

(See `flow.md` for full detail; these are interview-phrased versions.)

- **What happens when the application loads?** `main.tsx` mounts `<App
  />`; `useReducer(appReducer, undefined, createInitialState)` seeds
  `AppState` with a fresh clone of the 6-event fixture and `lastResult:
  null`. (`flow.md` §1, §3)
- **What happens when Run Handover is clicked?** `Header`'s `onRun`
  dispatches `{ type: "RUN" }`; the `RUN` case in `appReducer.ts` calls
  `validateEvents()` then, only if valid, `processHandover()`, then
  writes the result (or the errors) back into state. (`flow.md` §7)
- **What calls validation?** Only `appReducer.ts`'s `RUN` case — nothing
  else in the app calls `validateEvents` (confirmed: it's imported only
  there and in tests).
- **What calls processing?** Same — only `appReducer.ts`'s `RUN` case,
  and only after confirming `validation.valid`.
- **How does ARRIVE work?** `PARCEL_ALREADY_SEEN` check →
  `ACTIVE_CODE_COLLISION` check → accept onto `pending`. (`flow.md` §9)
- **How does COLLECT work?** `PARCEL_NOT_PENDING` check →
  `PICKUP_CODE_MISMATCH` check → move from `pending` to `collected`.
  (`flow.md` §9)
- **How does the result reach the UI?** `appReducer.ts` returns a new
  `AppState` with `lastResult` set; React re-renders every component that
  reads `state.lastResult` as a prop — no separate "publish" step.
- **How does Reset work?** Dispatches `{ type: "RESET" }`, which just
  calls `createInitialState()` again — a brand-new state object, not a
  patch. (`flow.md` §11)
- **How does the chart receive data?** `SummaryPanel` calls
  `getEventsOverTime(result)` and passes the returned array as
  `EventsOverTimeChart`'s `points` prop — the chart never touches
  `HandoverResult` directly. (`flow.md` §10)
- **How does Shelf Map receive data?** `getShelfMap(result)`, called
  directly inside `ShelfMap.tsx`. (`flow.md` §10)

---

## 4. Data Structures

(Only structures actually present in `src/lib/processor.ts` —
see `decisions.md`'s dedicated Data Structures decision for full detail.)

### Q: Why is `seenParcelIds` a `Set<string>` and not an array?

**Answer:** It only ever needs a `.has()` membership check
(`PARCEL_ALREADY_SEEN`) — a `Set` gives O(1) average lookup vs. an
`array.includes()` O(n) scan that would grow with every ARRIVE event
processed so far.

**Complexity:** O(1) average insert/lookup. **Alternative:** a plain
array with `.includes()` — functionally identical output, strictly worse
asymptotically as event count grows. **Trade-off:** none real at this
app's scale, but it's the textbook-correct choice regardless.

### Q: Why `pendingByParcelId: Map<string, PendingParcel>` instead of scanning the `pending` array?

**Answer:** COLLECT needs to find (or fail to find) a parcel by ID in
O(1) — an `Array.find()` would be O(n) in the number of currently-pending
parcels, on every single COLLECT event.

**Complexity:** O(1) get/set/delete. **Alternative:** `pending.find(p =>
p.parcelId === event.parcelId)`. **Trade-off:** the Map must be kept
manually in sync with the `pending` array (added together on ARRIVE,
removed together on COLLECT) — two data structures describing
overlapping information, accepted for the lookup-speed win.

### Q: Why `parcelIdByActiveCode: Map<string, string>`?

**Answer:** `ACTIVE_CODE_COLLISION` needs "is this pickup code currently
held by some other pending parcel" in O(1), without scanning every
pending parcel's `.pickupCode`.

**Complexity:** O(1). **Alternative:** `pending.some(p => p.pickupCode
=== event.pickupCode)` — O(n) per ARRIVE. **Trade-off:** same as above, a
third structure to keep manually consistent.

### Q: Why are `pending`/`collected`/`outcomes` plain arrays?

**Answer:** All three have an *order requirement* from PLAN.md (source
order for outcomes, accepted-arrival order for pending, successful-
collection order for collected) that only an ordered structure like an
array (not a `Set`/`Map`, whose iteration order is an implementation
detail JS happens to guarantee but which isn't the natural mental model
here) directly and readably expresses.

**Complexity:** O(1) amortized `push`; the one O(n) operation is
`pending.splice(pending.indexOf(parcel), 1)` on COLLECT, bounded by
current pending-parcel count.

**Follow-up — could `pending` be a `Map` instead of an array, since
`pendingByParcelId` already exists?** JS `Map` does preserve insertion
order for iteration, so this is a legitimate alternative — but it would
make "the array processHandover returns as `pending`" and "the lookup
structure" the exact same object, and the code currently keeps them
separate (redundant, in fact — `pendingByParcelId`'s *values* are the
same object references as what's in `pending`). This is a real, honest
simplification opportunity in the current code, not a spec requirement
either way.

---

## 5. Complexity

### Q: What is the time complexity of `processHandover()`?

**Answer:** O(n) in the number of input events. Each event does a
constant number of `Set`/`Map` operations (O(1) average) plus, on
COLLECT only, one `pending.indexOf()` call bounded by the number of
*currently pending* parcels (call it p, p ≤ n).

**Follow-up:** Under what condition does this degrade?

**Strong follow-up answer:** If the pending list grows very large (many
ARRIVEs with few COLLECTs), each COLLECT's `indexOf` scan gets
proportionally slower — worst case O(n) per COLLECT if almost everything
is still pending, making the pathological worst case O(n²) overall (many
ARRIVEs, then many COLLECTs against a large pending list). At this app's
realistic scale (a handful to a few dozen rows on one screen) this is
irrelevant; see §16 for the hypothetical production-scale answer.

### Q: What is `validateEvents()`'s complexity?

**Answer:** O(n) — one pass over all rows, with an O(1) `Set.has()` per
row for duplicate-ID detection (`seenIds`).

### Q: What is `getShelfMap()`'s complexity?

**Answer:** O(p) where p = number of parcels in `pending` + `collected` —
one pass to collect the distinct shelf set, one pass to bucket pending
parcels by shelf, then a sort over the (typically small) distinct-shelf
list.

### Q: What is `getEventsOverTime()`'s complexity?

**Answer:** O(n) — a single `.map()` over `result.outcomes` maintaining
three running counters.

### Q: Memory complexity?

**Answer:** O(n) for `outcomes` (one entry per input event, always), plus
O(p) for `pending`/`collected` combined (p ≤ n) and the three lookup
structures (each bounded by p or n).

### Q: What are the actual scalability limits of this implementation?

**Answer:** Everything is recomputed from scratch on every Run — the
whole table is re-validated and re-processed from event 1 every time,
even if only one row changed. At a few dozen rows (this app's realistic
scale) this is effectively free; PLAN.md's own Performance section
explicitly rejects premature optimization ("no
Redux/Zustand/virtualization/Web Workers") for exactly this reason. The
Shelf Map's `Array.from(shelves).sort()` and the O(n) `indexOf` in
`processHandover` would become the first things worth profiling at, say,
tens of thousands of events — not before.

---

## 6. Design Trade-offs

(Generated directly from `decisions.md`'s entries — see that file for
full Context/Alternatives/Trade-off/Consequence detail on each.)

### Interview Question: Why does validation fail the *whole table* on one bad row, instead of processing the valid rows and flagging just the bad one?

**Strong Answer:** PLAN.md's validation contract is explicit: "On
structural failure: no partial processing, no outcomes, no board rows, no
summary." Confirmed in code — `validateEvents` returns `events: []`
(not a partial list) on any failure, and `appReducer.ts`'s `RUN` case
never calls `processHandover` unless `validation.valid` is true.

**Deeper Follow-up:** Isn't that a worse user experience for a large
table with one typo?

**Follow-up Answer:** Possibly, in isolation — but the spec's rationale
is correctness: the structural-vs-state distinction only holds together
if a malformed row can *never* silently become "just skipped," because
that would blur the line between "bad input" and "a legitimate rejected
outcome," which PLAN.md calls a mandatory distinction.

**Common Mistake:** Implementing per-row validation that continues past
bad rows "to be helpful" — this directly contradicts acceptance test 5
(duplicate event ID) and would fail
`src/tests/domain/validation.test.ts`'s "produces zero partial output on
structural failure" test.

### Interview Question: Why is `selectedParcelId` a single shared reducer field instead of local state per component?

**Strong Answer:** Three different views (`HandoverBoard`,
`EventTimeline`, `ShelfMap`) need to react to the same selection — a
single shared ID is enough because every view already identifies its own
content by parcel ID, so there's no need for a second identifier per view.

**Deeper Follow-up:** What if you needed to select an *event* that
doesn't correspond to any parcel (e.g. a structural validation error row)?

**Follow-up Answer:** The current design wouldn't support that directly —
`selectedParcelId` is parcel-keyed, and `ValidationBanner` doesn't
participate in the cross-highlight at all. Extending it would mean either
widening the field to a union type or adding a second, purpose-built
field — a legitimate design question, not something the current code
handles.

**Common Mistake:** Adding a `selected` boolean prop to each `ParcelLabel`
call site independently instead of deriving it from the one shared ID —
would immediately desync the three views' highlight state.

### Interview Question: Why `HandoverResult | null` for `lastResult` instead of always having a `HandoverResult` plus a separate `hasRun: boolean`?

**Strong Answer:** `null` vs. a real `HandoverResult` is a distinction
enforceable by TypeScript's type system itself — every consumer must
explicitly narrow before reading `.outcomes`/`.pending`, so it's
structurally impossible to forget the check the way a second boolean flag
could be forgotten (e.g. reading `result.outcomes` while `hasRun` happens
to be stale `false`).

**Deeper Follow-up:** Doesn't this mean every consumer needs its own
`=== null` check — isn't that repetition?

**Follow-up Answer:** Yes, and it's an intentional trade — a small amount
of repeated conditional logic (visible in `SummaryPanel`,
`HandoverBoard`, `EventTimeline`) in exchange for the reset-vs-empty-run
distinction being impossible to accidentally collapse.

**Common Mistake:** Treating `{ outcomes: [], pending: [], collected: []
}` as "no run yet" — this is literally what `processHandover([])`
legitimately returns for a real empty-table run, so conflating it with
"never ran" would directly violate acceptance test 6.

---

## 7. Library Questions

| Library | Why this library? | Problem it solves | Alternative | Trade-off | Removable? |
|---|---|---|---|---|---|
| React 19 | Required by PLAN.md's stack | Component rendering, `useReducer` state | Vue, Svelte | Larger runtime than Svelte's compiled output | No — spec-mandated |
| TypeScript (strict) | Required by PLAN.md ("strict TS, no `any`") | Compile-time correctness, exhaustiveness (`appReducer.ts`'s `default: const _exhaustive: never`) | Plain JS + JSDoc | Slower iteration without types initially, but far fewer runtime bugs in a rules-heavy domain like this | No — spec-mandated |
| Vite | Required by PLAN.md's stack | Dev server (HMR), production bundling, shares config with Vitest | Webpack, Parcel | Smaller plugin ecosystem than Webpack's | No — spec-mandated, but functionally replaceable |
| Tailwind CSS v4 | Required by PLAN.md's stack | All styling via utility classes + one CSS custom-property palette | CSS Modules, styled-components | Verbose class lists in JSX; mitigated somewhat by `cn()` | No — spec-mandated |
| shadcn/ui (CLI, `@base-ui/react`-based) | Required by PLAN.md's stack | Source (not dependency) for `Button`/`Input`/`Select`/`Table`/`Alert`/`Card` | Radix UI directly, Headless UI, MUI | Generated code lives in-repo and must be manually kept up to date on shadcn upgrades (no `npm update` for it) | No — spec-mandated; could swap its underlying primitive library without changing the app's usage of `Button`/`Input`/etc. |
| Motion (`motion/react`) | Chosen for `AnimatePresence`/`layoutId` FLIP support that plain CSS transitions don't provide | Enter/exit/layout animation for board columns, timeline, shelf map | Plain CSS `@keyframes`/transitions, react-spring | Extra dependency weight; not used for anything the app functionally needs — could be deleted and the app would still work (see §13) | Yes, functionally — animation is presentation-only per PLAN.md |
| Bklit (shadcn registry, `area-chart`) | The chart PLAN.md allows ("one meaningful chart max...derived from HandoverResult") | Renders the Events Over Time series | Recharts, a hand-rolled SVG chart, Chart.js | Pulls in `@visx/*`/`d3-array`/`d3-shape` (~94 kB min., per `EventsOverTimeChart.tsx`'s own comment) — mitigated by lazy-loading | Yes — the numeric summary figures are the ground truth regardless; PLAN.md explicitly says "omit if it doesn't improve understanding" |
| `@number-flow/react` | Already a transitive dependency of the Bklit chart; reused rather than reimplemented | Count-up digit animation on the 4 summary figures | Hand-rolled `requestAnimationFrame` tween via Motion | None material — pure reuse decision | Yes — cosmetic only |
| Vitest | Required by PLAN.md's stack; shares Vite config natively | Domain + RTL test runner | Jest | Jest has a larger historical ecosystem but worse native ESM/Vite integration | No — spec-mandated |
| React Testing Library | Required by PLAN.md's stack | Renders `<App/>` in jsdom, simulates user interaction | Enzyme (effectively unmaintained for current React) | None material | No — spec-mandated |
| Playwright | Required by PLAN.md's stack | Real-browser E2E, accessibility sweep, keyboard-nav check | Cypress | None material for this app's needs | No — spec-mandated |
| `@axe-core/playwright` | Automates PLAN.md's "adequate contrast"/accessibility requirements | WCAG 2 A/AA violation detection | Manual-only audit | Doesn't replace real screen-reader/manual testing (acknowledged in the test file's own comment) | Yes — supplementary, not required by PLAN.md by name |

---

## 8. Frontend Questions

- **State ownership:** One `useReducer` in `App.tsx`; every other
  component is a pure function of props. (`decisions.md` — "no separate
  useState calls scattered across components.")
- **Controlled inputs:** Every `EventTable` cell is a controlled
  `<Input>`/`<Select>` — `value={row.data.field}`,
  `onChange`/`onValueChange` dispatching `UPDATE_FIELD`. No uncontrolled
  refs anywhere in the table.
- **Component decomposition:** One component per PLAN.md-named screen
  section, plus two shared presentational leaves (`Panel`, `ParcelLabel`)
  — see `decisions.md`'s dedicated entry.
- **Derived state:** Everything except the 4 reducer fields — see
  `flow.md` §10's table.
- **Event table:** `#|Event ID|Action|Parcel ID|Student|Pickup
  Code|Shelf|Actions` — exactly PLAN.md's required column list;
  `table-fixed` layout (chosen specifically to eliminate a horizontal
  scrollbar bug — see git commit `6dd168c`).
- **Metrics/summary:** 4 editorial figures (Pending/Collected/Rejected/
  Events), always one row, never a 2×2 grid — per the component's own doc
  comment matching a visual reference image.
- **Chart:** See §7 above; lazy-loaded, deferred until `result !== null`.
- **Shelf map:** Renders `null` entirely (no panel at all) until
  `result` is non-null AND at least one parcel has ever been seen —
  `if (result === null || result.pending.length + result.collected.length
  === 0) return null;` in `ShelfMap.tsx`.
- **Timeline:** A connected `E01 → E02 → ...` strip in source order, with
  an expanded "Rejected Events" detail block underneath for any
  rejections in the run.
- **Animation:** Presentation-only, gated behind `MotionConfig
  reducedMotion="user"` at the root — see `decisions.md`.
- **Responsive layout:** Single-column stack below `xl`, two-column grid
  (`xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`) at `xl` and above —
  `App.tsx`'s render.
- **Accessibility:** `aria-label`s on every table input (`Row {n}
  {Field}`), `role="alert"` on the validation banner, `aria-pressed` on
  toggleable selection buttons, semantic `<section aria-labelledby=...>`
  panels, visible focus via `focus-visible:ring-3` (from shadcn's Button
  styles), a dedicated axe-core sweep and keyboard-nav test.
- **Reset:** Full `createInitialState()` replacement — see `flow.md` §11.

---

## 9. Testing Questions

- **Why both unit and E2E tests, given some overlap in scenario names?**
  The Vitest suite verifies the domain engine in isolation (fast,
  precise, catches exactly which check-order rule broke); the Playwright
  suite verifies the *same 6 scenarios* are correctly wired to real UI
  and rendered correctly for an actual desk operator — a bug could exist
  in either layer independently (e.g. `processHandover` could be correct
  but `Header`'s `onRun` could fail to call `dispatch`).
- **Why does `src/tests/domain/validation.test.ts` never use
  `toBeDefined()`?** PLAN.md explicitly requires "exact assertions, no
  `toBeDefined()`" — every domain test asserts an exact value (`.toEqual`,
  `.toBe`, `expect.objectContaining` with specific fields), never merely
  "some error object exists."
- **What does the canonical/oracle scenario prove, specifically?** That
  the whole pipeline — validation, both ARRIVE and COLLECT check chains,
  ordering guarantees, and the summary derivation — matches PLAN.md's
  exact documented outcome sequence, pending/collected lists, and 3/1/1
  summary, in one integration-style assertion
  (`src/tests/domain/processor.test.ts`, also independently re-verified
  in `integration.test.ts` and `App.test.tsx` and `e2e/handover.spec.ts`
  test 1 — the same scenario checked at all three layers).
- **What edge cases are covered that a naive implementation might miss?**
  Check-order priority when two rejection reasons could both apply
  (`PARCEL_ALREADY_SEEN` before `ACTIVE_CODE_COLLISION`;
  `PARCEL_NOT_PENDING` before `PICKUP_CODE_MISMATCH`); a pickup code
  becoming reusable after its holder is collected; blank student/shelf
  being valid for COLLECT but not ARRIVE; whitespace trimming before
  comparison; processor purity (no input mutation, fresh state per call).
- **What's missing from current coverage?** No visual regression
  (screenshot diff) testing; the RTL suite doesn't exercise the `Select`
  dropdown's real pointer interaction; no automated `tsc -b`/lint
  zero-warnings check as part of the test command itself. (See
  `decisions.md`'s Testing decision, "Limitations of current coverage.")

---

## 10. P11 Acceptance Criteria

For each of PLAN.md's 6 required scenarios: what it means, how the
implementation satisfies it, where it's tested, what could break it.

### 1. Built-in six-event scenario

**Means:** Running the unmodified fixture must produce the exact
documented oracle. **Satisfied by:** `processHandover()`'s check-order
logic applied to `getBuiltInEvents()`. **Tested:**
`src/tests/domain/processor.test.ts`, `integration.test.ts`,
`src/tests/ui/App.test.tsx`, `e2e/handover.spec.ts` test 1 (same scenario,
4 layers). **Could break it:** any change to the ARRIVE/COLLECT check
order, or to `getBuiltInEvents()`'s fixture data.

### 2. Corrected E03 pickup code

**Means:** Changing E03's code from `ZZZZ` to `K7M2` must flip its
outcome from `PICKUP_CODE_MISMATCH` to `COLLECTED` and correspondingly
move P01 from pending to collected. **Satisfied by:** the COLLECT branch's
`parcel.pickupCode !== event.pickupCode` check. **Tested:**
`processor.test.ts`, `e2e/handover.spec.ts` test 2. **Could break it:**
comparing codes case-sensitively incorrectly, or reading the wrong
parcel's stored code.

### 3. E06 active-code collision

**Means:** Changing E06's code to collide with P03's still-active code
(`T9C4`) must reject E06 as `ACTIVE_CODE_COLLISION` and exclude P04 from
pending. **Satisfied by:** the ARRIVE branch's `parcelIdByActiveCode.has()`
check, checked *after* `PARCEL_ALREADY_SEEN` but *before* accepting.
**Tested:** `processor.test.ts`, `e2e/handover.spec.ts` test 3. **Could
break it:** checking collision before already-seen (wrong priority), or
not removing a code from `parcelIdByActiveCode` on COLLECT (would cause
false collisions on legitimately-reused codes).

### 4. Empty table

**Means:** Running zero rows must show a real, explicit `0/0/0` — not
block, not show placeholders. **Satisfied by:** `validateEvents([])` and
`processHandover([])` both handling zero-length input as a normal,
successful case (no special-cased empty branch needed — the loops simply
don't execute). **Tested:** `processor.test.ts`, `validation.test.ts`,
`App.test.tsx`, `e2e/handover.spec.ts` test 4. **Could break it:** adding
a guard clause that treats `events.length === 0` as an error or a no-op
that leaves the previous result on screen.

### 5. Duplicate event ID (E06→E05)

**Means:** Colliding IDs must block the whole run with zero partial
output and a specific message naming the duplicated ID. **Satisfied by:**
`validateEvents()`'s `seenIds.has(id)` check, and `appReducer.ts`
refusing to call `processHandover` when `!validation.valid`. **Tested:**
`validation.test.ts`, `integration.test.ts`, `App.test.tsx`,
`e2e/handover.spec.ts` test 5. **Could break it:** calling
`processHandover` regardless of validity, or truncating the error message
so it no longer names the specific ID.

### 6. Reset vs. empty-run distinction (synchronization)

**Means:** Reset (`lastResult: null`) must render visually and
programmatically differently from a completed zero-event run
(`lastResult: { outcomes:[], pending:[], collected:[] }`) — `"—"` vs.
`"0"`, `outcomes-pre-run` vs. `outcomes-empty-run` test IDs. **Satisfied
by:** every result-consuming component's `result === null` branch.
**Tested:** `App.test.tsx` (`describe("App — Reset")`),
`e2e/handover.spec.ts` test 6 (which explicitly transitions Reset →
empty-run → Reset in one test to prove both states and the transition
between them). **Could break it:** representing "not run yet" as the same
all-zero object an empty run produces, collapsing the two states.

### 7. Source-order processing

**Means:** Events must be processed in table order, never sorted by ID.
**Satisfied by:** `processHandover()`'s plain `for...of` loop over its
input array, no sort. **Tested:** `processor.test.ts`'s dedicated
out-of-order-ID test. **Could break it:** adding `events.slice().sort((a,
b) => a.id.localeCompare(b.id))` anywhere before the loop.

---

## 11. LIVE MODIFICATIONS

Realistic modifications compatible with PLAN.md's Hard Constraints
(no backend/database/auth/network/notifications/bookings/delivery
routing), grounded in the actual current file structure.

### EASY

1. Add a new derived summary statistic (e.g. "average shelf occupancy" or
   "% of events rejected") to `SummaryPanel`.
2. Add a new event-table column-level constraint (e.g. shelf ID format
   restriction) to `validateEvents()`.
3. Change the pickup-code length/character-set rule (e.g. allow 5
   characters) in `PICKUP_CODE_REGEX`.
4. Add a "Copy outcome" or "Filter to rejected only" control to
   `EventTimeline`.
5. Add a new empty-state message variant for a currently-uncovered case.

### MEDIUM

1. Add a new state-dependent outcome type (e.g. `DUPLICATE_PICKUP_ATTEMPT`
   for collecting an already-collected parcel with the right code, as
   distinct from `PARCEL_NOT_PENDING`).
2. Add a "filter Event Log by outcome type" control wired to the
   post-Run outcomes.
3. Add a running "peak pending count" derived statistic to
   `getSummary`/`SummaryPanel`.
4. Make the Shelf Map sortable/groupable by occupancy count instead of
   alphabetical shelf ID.
5. Add per-row inline validation error highlighting in `EventTable`
   (currently validation only surfaces in `ValidationBanner`, not on the
   offending cell).

### HARD

1. Support multi-select in the Event Timeline/Board (extending
   `selectedParcelId: string | null` to `string[]`) without breaking the
   existing toggle-single-selection tests.
2. Add an "undo last Run" capability that can restore the previous
   `lastResult` (would require extending `AppState` with a history stack,
   carefully, without violating "editing doesn't mutate displayed
   result").
3. Add a second, independently-configurable chart (a second Bklit
   registry component) while keeping PLAN.md's "one meaningful chart max"
   constraint honestly satisfied (would need to argue why a second chart
   earns its place, or replace rather than add).
4. Rework `processHandover()`'s `pending` array to also be a `Map` (per
   §4's identified redundancy with `pendingByParcelId`) without breaking
   any of the ordering-dependent tests.

**Explicitly not normal modifications** (PLAN.md's Prohibited
"Improvements" — only ever discuss as `docs/SYSTEM-DESIGN.md`-style
hypotheticals): backend, database, authentication, real-time
sync/WebSockets, notifications, bookings, delivery routing, multi-desk
persistence.

---

## 12. LIVE MODIFICATION WALKTHROUGHS

### 1. Add a new validation rule: reject a Shelf ID that isn't 2 characters (e.g. must be a letter + digit like "A1")

**Difficulty:** Easy

**Files affected:** `src/lib/validation.ts`, `src/lib/constants.ts`
(optional: a new regex constant), `src/tests/domain/validation.test.ts`

**Functions affected:** `validateEvents()`

**Implementation steps:**
1. Add `export const SHELF_REGEX = /^[A-Z][0-9]$/;` to `constants.ts`
   (or inline the check) — decide the exact format with the interviewer.
2. Inside `validateEvents()`'s `if (action === "ARRIVE")` block, add a
   `SHELF_REGEX.test(shelf)` check alongside the existing empty-shelf
   check, pushing a new `INVALID_EVENT` (or a new
   `ValidationErrorCode` if the interviewer wants a distinct code) with a
   field-specific message.
3. Update `ValidationErrorCode` in `types.ts` if a new code is added.
4. Add tests to `validation.test.ts`: valid 2-char shelf accepted,
   1-char/3-char/lowercase rejected, with an exact `code`/`field`
   assertion.

**Tests:** New cases in `validation.test.ts`'s "structural rules" block,
following the exact pattern of the existing pickup-code regex tests.

**Verification:** `npm run test` (Vitest); manually type a bad shelf ID
into the running app and confirm the banner shows the new message.

**Interview explanation:** "This is a structural rule, so it belongs in
`validateEvents()`, not `processHandover()` — it has nothing to do with
ARRIVE/COLLECT state, it's about whether the row is well-formed at all.
I'm reusing the existing per-row error-push pattern so it reports
alongside any other errors on the same row, per the full-table validation
contract."

---

### 2. Add a new derived summary statistic: "Average time on shelf" is not derivable (no timestamps exist) — use a derivable one instead: "Busiest shelf" (the shelf with the most parcels ever arrived)

**Difficulty:** Easy/Medium

**Files affected:** `src/lib/selectors.ts`, `src/components/
SummaryPanel.tsx`, `src/tests/domain/selectors.test.ts`

**Functions affected:** new `getBusiestShelf(result): { shelf: string;
count: number } | null`

**Implementation steps:**
1. Write `getBusiestShelf()` in `selectors.ts`, deriving from `[...result.
   pending, ...result.collected]` grouped by `.shelf` (same pattern as
   `getShelfOccupancy`), returning the shelf with the highest count (or
   `null` for an empty result — mirroring the `result === null` /
   zero-length distinction already established elsewhere).
2. Add a Vitest test against the canonical oracle's known shelf
   distribution.
3. Wire it into `SummaryPanel.tsx` as a 5th figure, or a small inline
   stat near the chart legend — decide placement with the interviewer,
   respecting "never a 2×2 grid" if kept in the 4-figure row.

**Tests:** `selectors.test.ts` — exact expected shelf + count against the
oracle; an empty-result case returning `null`.

**Verification:** `npm run test`; visually confirm in the running app
after Run Handover.

**Interview explanation:** "This is a pure derivation from the final
`HandoverResult`, same pattern as `getShelfOccupancy` — no new domain
field, no second store, consistent with every other selector in the
file."

---

### 3. Add a new event outcome type: `PARCEL_RECOLLECTED` for attempting to COLLECT a parcel that's already in the `collected` list (currently indistinguishable from `PARCEL_NOT_PENDING`)

**Difficulty:** Medium

**Files affected:** `src/lib/types.ts`, `src/lib/constants.ts`,
`src/lib/processor.ts`, `src/tests/domain/processor.test.ts`,
`src/components/OutcomeBadge.tsx` (via `OUTCOME_DESCRIPTIONS`'s
`satisfies Record<OutcomeType,string>` compile-time enforcement)

**Functions affected:** `processHandover()`'s COLLECT branch

**Implementation steps:**
1. Add `"PARCEL_RECOLLECTED"` to the `OutcomeType` union in `types.ts`.
2. Add it to `OUTCOME_DESCRIPTIONS` in `constants.ts` — TypeScript will
   actually refuse to compile without this, thanks to the `satisfies
   Record<OutcomeType, string>` guard, which is worth pointing out live.
3. Decide whether it belongs in `REJECTED_OUTCOMES` (almost certainly
   yes — it's still "nothing changed").
4. In `processor.ts`'s COLLECT branch, track collected parcel IDs (a new
   `collectedParcelIds: Set<string>`, mirroring `seenParcelIds`) and check
   it *before* falling through to the generic `PARCEL_NOT_PENDING` —
   decide and justify the check order relative to the existing two COLLECT
   checks (a new "third state-rejection reason" needs a position in the
   documented mandatory order — since PLAN.md doesn't define one for a
   type it doesn't know about, this is exactly the kind of "genuine
   specification ambiguity that materially changes the implementation"
   `CLAUDE.md` says to stop and ask about, in a real P11 context).
5. Add tests mirroring the existing COLLECT-state-rules block.

**Tests:** New cases in `processor.test.ts`'s "COLLECT state rules"
block: collecting an already-collected parcel with the right code →
`PARCEL_RECOLLECTED`, not `PARCEL_NOT_PENDING`.

**Verification:** `npm run test`; run a scenario in the UI where the same
parcel is collected twice.

**Interview explanation:** "This is the moment to demonstrate the
Rule-of-3 / stop-and-ask discipline `CLAUDE.md` calls for — introducing a
new outcome type changes the documented check order, which PLAN.md
states is mandatory but doesn't cover this new case. I'd flag that
explicitly rather than silently picking an order."

---

### 4. Add a "Filter Event Log to rejected only" toggle to `EventTimeline`

**Difficulty:** Medium

**Files affected:** `src/components/EventTimeline.tsx`

**Functions affected:** none in `src/lib/` — purely a presentation-layer
filter over already-computed `result.outcomes`

**Implementation steps:**
1. Add local `useState<boolean>` (`showRejectedOnly`) inside
   `EventTimeline.tsx` — this is presentation-only UI state (like the
   removed `runStatus` flag used to be), not `AppState` reducer state,
   since no other component needs to know about it.
2. Add a toggle button near the panel's `headerRight` slot.
3. Filter `result.outcomes` client-side before mapping to
   `TimelineNode`s when the toggle is on — `RejectionDetails` already
   does its own independent filter, so this doesn't touch that logic.
4. Make sure the empty-state ("no rejected events in this run") is
   handled distinctly from `outcomes-empty-run`/`outcomes-pre-run`.

**Tests:** New RTL test in `App.test.tsx` toggling the filter after a Run
and asserting the outcomes list length changes; optionally an E2E
addition.

**Verification:** `npm run test`; manually toggle in the browser.

**Interview explanation:** "This is UI-only state — it doesn't change
what `processHandover` computed, only what's currently visible, so it's
local `useState` in the component, not the shared reducer, following the
same reasoning as the (now-removed) `runStatus` cosmetic flag documented
in `docs/DECISIONS.md`."

---

### 5. Correct a pickup code format (change regex to require exactly 2 letters + 2 digits, e.g. `AB12`)

**Difficulty:** Easy

**Files affected:** `src/lib/constants.ts`,
`src/tests/domain/validation.test.ts`

**Functions affected:** none — only the regex constant changes;
`validateEvents()`'s call site is unchanged

**Implementation steps:**
1. Change `PICKUP_CODE_REGEX` to `/^[A-Z]{2}[0-9]{2}$/`.
2. Update the built-in fixture in `sampleData.ts` if any of its 6 codes
   (`K7M2, R4Q8, ZZZZ, T9C4, H2N6`) no longer match — **all of them would
   need changing**, since the current codes are mixed-position
   alphanumeric, not "2 letters then 2 digits." This is worth flagging
   live: changing this regex is not purely additive, it invalidates the
   canonical fixture and therefore every oracle-based test and the
   PLAN.md-documented acceptance scenarios themselves.
3. Update every hard-coded pickup code across
   `src/tests/domain/*.test.ts`, `e2e/handover.spec.ts`, and
   `src/tests/ui/App.test.tsx` that currently relies on the old fixture's
   codes.

**Tests:** Update the existing regex-acceptance/rejection tests in
`validation.test.ts` to the new pattern's boundary cases.

**Verification:** `npm run test && npm run test:e2e`.

**Interview explanation:** "This is a good example of why the built-in
fixture is called 'canonical' — changing a core validation rule can
invalidate the very oracle the spec defines correctness against. I'd
stop and confirm this is really what's wanted before touching it, per
`CLAUDE.md`'s 'never modify or reinterpret spec requirements' rule."

---

## 13. "WHY NOT?" QUESTIONS

- **Why not Redux?** Not required — the app is a single reducer's worth
  of state; PLAN.md explicitly says "No global state library unless
  justified in writing," and no justification exists because there's
  nothing here Redux would meaningfully improve. *Not required by P11 —
  not "Redux is bad."*
- **Why not Zustand?** Same reasoning — one component tree, one
  `useReducer`, no cross-tree state sharing need that a lighter global
  store would solve better than prop drilling already does here (the
  component tree is 2 levels deep at most).
- **Why not a backend?** *Explicitly prohibited by P11's Hard
  Constraints* — not a technical judgment call at all.
- **Why not a database?** Same — explicitly prohibited; see
  `docs/SYSTEM-DESIGN.md` for the hypothetical schema this *would* need
  in production.
- **Why not realtime (per-keystroke) processing?** Not required — and
  would conflict with PLAN.md's explicit "state separation" requirement
  (editing must not silently change the displayed prior result). *Not
  required by P11 — arguably actively wrong for this spec.*
- **Why not put processing inside React (a `useMemo` recomputing on every
  `rows` change)?** Would violate the same state-separation requirement,
  and would also blur the "domain logic has zero React imports"
  requirement if the memo depended on internal component state shape.
  *Not required by P11 — technically at odds with it.*
- **Why not use classes for the domain model?** Not required — the
  domain types are plain data (`interface`s) and the functions are pure;
  a class would add `this`-binding and encapsulation machinery with no
  benefit here, since there's no instance identity or mutable
  encapsulated state to protect. *Reasonable alternative style, not
  objectively inferior — but doesn't fit this particular
  discriminated-union-and-pure-function style as naturally.*
- **Why not maintain a separate parcel store (outside `HandoverResult`)?**
  Would duplicate state that's already fully derivable from `lastResult`
  — see the "source of truth" decision. *Not required by P11 — and
  actively creates the duplicated-state bug class PLAN.md's architecture
  avoids.*
- **Why not use a heavier charting library (e.g. full Recharts/
  Chart.js)?** Bklit was already the registry PLAN.md pointed at
  ("Bklit... viz only"); a heavier library would add more bundle weight
  for a single, already-optional chart. *Reasonable alternative — Bklit
  isn't uniquely correct, just already the one the stack specifies.*
- **Why not animate every event/state change?** PLAN.md scopes Motion
  usage to specific named moments (summary count-up, outcome appearance,
  pending parcel entering/leaving, validation feedback, reset) — animating
  everything would work against "app fully usable without animation" and
  add noise without semantic purpose. *Not required by P11 — animating
  everything is also arguably a worse UX for an operations console.*

---

## 14. Edge Cases

| Edge case | Expected behavior | Where tested |
|---|---|---|
| Empty input table | Valid; `0/0/0`, real summary, not placeholders | `validation.test.ts`, `processor.test.ts`, `App.test.tsx`, `e2e/handover.spec.ts` test 4 |
| Duplicate Event ID | Whole run blocked, zero partial output, specific message naming the ID | `validation.test.ts`, `integration.test.ts`, `App.test.tsx`, `e2e/handover.spec.ts` test 5 |
| Invalid pickup code (wrong length/case/chars) | `INVALID_PICKUP_CODE`, blocks run | `validation.test.ts` (7 distinct regex cases), `App.test.tsx` |
| Unknown parcel COLLECT | `PARCEL_NOT_PENDING`, no state change | `processor.test.ts` |
| Wrong pickup code on a pending parcel | `PICKUP_CODE_MISMATCH`, parcel stays pending | `processor.test.ts`, corrected-E03 scenario |
| Repeated arrival of the same parcel ID | `PARCEL_ALREADY_SEEN`, checked before code collision | `processor.test.ts` |
| Active pickup-code collision | `ACTIVE_CODE_COLLISION`, second parcel excluded from pending | `processor.test.ts`, E06 scenario |
| Repeated collection (double-collect) | Currently `PARCEL_NOT_PENDING` (parcel is no longer in `pendingByParcelId` after the first collection) — see §12 walkthrough 3 for a proposed more-specific outcome | not separately distinguished from "never arrived" in the current outcome vocabulary |
| Leading/trailing whitespace in any field | Trimmed before validation and before use as the stored `Event` value | `validation.test.ts` — "trims whitespace from all fields" |
| Event order (non-ID-sorted) | Processed exactly in array/table order | `processor.test.ts` — "source-order processing" |
| Stale output while editing | Never changes until the next explicit Run | `App.test.tsx` — "editing does not mutate the displayed prior result" |
| Reset after a Run | Restores exact 6-row fixture, clears result/errors/selection to pre-run state | `App.test.tsx`, `e2e/handover.spec.ts` test 6 |
| Editing after a successful run | Board/summary/timeline stay exactly as last computed; only re-computed on the next Run | `App.test.tsx` |
| COLLECT row with blank student/shelf | Valid — only ARRIVE requires them | `validation.test.ts`, `processor.test.ts` |
| A pickup code reused after its original holder is collected | Accepted — the code is freed from `parcelIdByActiveCode` on COLLECT | `processor.test.ts` — "accepts a new arrival once its pickup code has been freed" |

---

## 15. AI-Assisted Development

**IMPORTANT:** questions below marked "Prepare this answer yourself" have
no repository evidence to draw from — do not improvise a fabricated
history; answer from your own actual recollection of the session.

- **What prompts did you use?** See `docs/PROMPTS.md` — it logs 3 real
  prompts used during this project (initial assessment; core domain
  engine Phases 1-4/6; full UI+Motion+Bklit+Playwright+docs Phases 7-16),
  written contemporaneously, not reconstructed after the fact per its own
  header note.
- **How did you translate P11 into technical requirements?**
  `docs/PROMPTS.md` #1 documents that `docs/P11-SPEC.md` did not actually
  exist in the repo despite being named as the source of truth in
  `CLAUDE.md` — this was flagged as a blocker (per `CLAUDE.md`'s own
  "stop and ask" rule) rather than guessed at, and the user explicitly
  redirected to treat `docs/PLAN.md` as the de facto spec.
- **What did AI generate vs. what did you manually change?** *Prepare
  this answer yourself* — no repository evidence distinguishes AI-authored
  vs. human-edited lines at that granularity.
- **What AI recommendation did you reject?** *Prepare this answer
  yourself.*
- **How did you verify AI-generated code?** `docs/PROMPTS.md` #3
  documents "verifying with real tool runs (not assumed) at each step:
  `tsc -b`, `vitest run`, `playwright test`, and a headless Chromium
  smoke check with screenshots" as the stated verification method for the
  UI/testing/docs pass.
- **How did you prevent hallucinated requirements/APIs?** `docs/PROMPTS.md`
  #3 documents two concrete, named instances: `npm install bklit` 404'd,
  so its actual distribution mechanism (a shadcn registry URL) was
  discovered via web search rather than assumed; and the installed shadcn
  CLI's generated output was read directly to confirm it targets
  `@base-ui/react`, not the Radix primitives older shadcn documentation
  assumes — both are direct applications of PLAN.md's "Library
  Verification Rule" ("Before using any package: inspect... verify actual
  current API... Never fabricate imports").
- **How did you keep P11 constraints intact across a long agentic pass?**
  `CLAUDE.md`'s Hard Constraints and `docs/PLAN.md`'s Prohibited
  "Improvements" list were both available as always-loaded project
  instructions throughout — the "Rule of 3" (stop after 3 failed fix
  attempts, never weaken tests/suppress errors/add `any`) is stated
  explicitly in `CLAUDE.md`'s Agent Workflow section, and `docs/PROMPTS.md`
  #2 notes "No Rule-of-3 stops were hit" during the domain-engine phase.
- **What was a useful AI decision?** `docs/PROMPTS.md` #3's two verified-
  not-assumed library discoveries (above) are directly evidenced. Beyond
  those two: *prepare further examples yourself from your own recollection.*
- **What was a bad AI recommendation you had to catch/correct?** *Prepare
  this answer yourself* — no repository evidence of a rejected/corrected
  AI suggestion exists to cite (the only "correction" evidenced in the
  repo is the chart implementation superseding an earlier ring-chart
  approach — see `decisions.md`'s Bklit chart entry — but there's no
  direct evidence that was an AI mistake being caught vs. a deliberate
  design iteration).
- **Where did AI departed from its own default style, and why?**
  `docs/PROMPTS.md` #3 documents the "add comments everywhere" instruction
  as a deliberate, explicit departure from the assistant's own default
  no-comment style, scoped to this project because the user needs to
  explain the code live in an interview — visible throughout `src/lib/`,
  `src/app/`, and `src/components/`'s doc comments.

---

## 16. Hypothetical Productionization / System Design

**All questions in this section are HYPOTHETICAL.** The current
repository contains none of the following — no backend, database, Redis,
cache, queue, WebSocket, or authentication code exists anywhere in
`src/`. Everything below is discussed only as a conceptual extension,
matching `docs/SYSTEM-DESIGN.md`'s own explicit framing ("conceptual
production architecture — not implemented").

- **What if this supported 100,000 events?** `processHandover()`'s O(n)
  full-replay-per-Run approach would still complete in well under a
  second at 100K events on modern hardware — the more likely bottleneck
  first would be `EventTable`'s unvirtualized `<table>` rendering 100K
  DOM rows. In a hypothetical production version, `docs/
  SYSTEM-DESIGN.md`'s `parcels` materialized-projection approach
  (incrementally updated per event, not replayed) is the right answer —
  see its Event Sourcing Trade-off section.
- **What if multiple desks used it?** `docs/SYSTEM-DESIGN.md`'s data
  model already scopes every table by `desk_id`, and notes cross-desk
  operations never require a distributed transaction since each desk's
  events are independent — sharding by `desk_id`/`hostel_id` is
  discussed there under Horizontal Scaling.
- **What if handovers needed persistence?** `docs/SYSTEM-DESIGN.md`'s
  Data Model / Event Sourcing sections propose an append-only `events`
  Postgres table as the source of truth, with `parcels` as a derived,
  mutable read-projection — directly mirroring this app's in-memory
  `Event[] → HandoverResult` relationship, just durable.
- **What if multiple volunteers edited simultaneously?** The
  double-collection race is the specific concurrency bug
  `docs/SYSTEM-DESIGN.md`'s Concurrency section designs for — a
  transactional `UPDATE ... WHERE state = 'PENDING'` compare-and-swap, so
  the losing request gets an honest `PARCEL_NOT_PENDING` rather than a
  double-collected parcel or a 500.
- **What if we needed audit history (who collected what, when)?** The
  event-sourced design already carries this by construction — see
  `docs/SYSTEM-DESIGN.md`'s Security section on why event sourcing was
  chosen specifically because the audit trail is a hard requirement
  regardless.
- **What if this became a production service — what would the API look
  like?** `docs/SYSTEM-DESIGN.md`'s API Design section sketches
  `POST /desks/{deskId}/events` (idempotent on `eventId`, append-only, no
  `PUT`/`DELETE`) and `GET /desks/{deskId}/board`.

---

## 17. Rapid Fire

Q: What is the source of truth?
A: The ordered, editable event log (`AppState.rows`).

Q: When does processing occur?
A: After complete-table validation, only when Run Handover is dispatched.

Q: Does a rejected state-dependent event mutate state?
A: No — every rejection branch is `outcomes.push(...); continue;`.

Q: Does event ID determine processing order?
A: No — source (array) order does.

Q: What does `processHandover([])` return?
A: `{ outcomes: [], pending: [], collected: [] }` — a valid empty result,
not an error.

Q: What's the difference between `lastResult === null` and `lastResult.
outcomes.length === 0`?
A: `null` = no run yet (reset/first-load); a real zero-length result = a
completed run over an empty table.

Q: What check comes first for ARRIVE — already-seen or code collision?
A: `PARCEL_ALREADY_SEEN`.

Q: What check comes first for COLLECT — not-pending or code mismatch?
A: `PARCEL_NOT_PENDING`.

Q: What regex validates a pickup code?
A: `/^[A-Z0-9]{4}$/` — 4 chars, each independently a letter or digit.

Q: Is `K7M2` a valid pickup code?
A: Yes — mixed alphanumeric is explicitly valid, not "all-letters XOR
all-digits."

Q: Does COLLECT require a student or shelf value?
A: No — only a valid pickup code.

Q: Does ARRIVE require a student and shelf value?
A: Yes, both, non-empty.

Q: What happens on a structural validation failure?
A: The whole run is blocked; `lastResult` is explicitly set to `null`;
zero outcomes, zero board rows.

Q: What global state library does the app use?
A: None — one `useReducer` in `App.tsx`.

Q: Where does the cross-highlight selection state live?
A: `AppState.selectedParcelId`, a single shared reducer field.

Q: Does clicking a selected parcel again deselect it?
A: Yes — `SELECT_PARCEL` toggles.

Q: What clears `selectedParcelId`?
A: A successful `RUN` and a `RESET`.

Q: Is `src/lib/` allowed to import React?
A: No — zero React/DOM/browser imports; verified by direct inspection.

Q: What testing layers exist?
A: Vitest (domain), React Testing Library (component/UI), Playwright
(E2E + accessibility + keyboard-nav).

Q: How many Playwright acceptance scenarios does PLAN.md require, and how
many exist?
A: 6 required; `e2e/handover.spec.ts` has exactly 6, numbered 1-6.

Q: What library provides the chart, and is it an npm package?
A: Bklit — not an npm package, a shadcn registry
(`https://ui.bklit.com/r/{name}.json`); its source is copied into
`src/components/charts/`.

Q: Is the chart eagerly loaded on first paint?
A: No — `React.lazy()` + `result !== null` gating in `SummaryPanel.tsx`
defers fetching its module until after the first Run.

Q: What shadcn primitive library backs `Button`/`Select`?
A: `@base-ui/react`, confirmed by reading the generated source — not
Radix, despite older shadcn documentation assuming Radix.

Q: Does the app have a backend?
A: No — explicitly prohibited by `CLAUDE.md`'s Hard Constraints.

Q: Where is the hypothetical production architecture documented?
A: `docs/SYSTEM-DESIGN.md`, explicitly marked "not implemented."

Q: What CSS framework/version is used?
A: Tailwind CSS v4, via `@tailwindcss/vite` and a single `@import
"tailwindcss"` in `src/index.css`.

Q: Does the app support light mode?
A: No — a single committed dark "operations console" identity; the
`dark:` variant infrastructure exists in the CSS but is never applied.

Q: What triggers the app to skip animated transitions?
A: The OS-level `prefers-reduced-motion` setting, honored via
`<MotionConfig reducedMotion="user">` at the root.

Q: Is there a `docs/P11-SPEC.md` in this repository?
A: No — it was never supplied; `docs/PLAN.md` is used as the de facto
spec throughout, per `docs/PROMPTS.md`'s documented first action.

---

## 18. MUST-KNOW CHECKLIST

Answer each without looking at the code before the interview.

**Problem**
1. What does Parcel Desk process, end to end?
2. What are the two event actions, and what does each require as input?
3. What's the difference between a structural error and a state
   rejection?
4. Name all four state-rejection outcome types and what triggers each.
5. Why is an empty table a valid run, not an error?

**Architecture**
6. Where does all application state live, and in what form?
7. What is `src/lib/`'s one hard architectural rule?
8. Why is there no backend, and where is that constraint written down?
9. What are `rows` and `lastResult`, and why are they separate fields?
10. What is `selectedParcelId` and which three components read it?

**Domain logic**
11. What is the mandatory check order for ARRIVE?
12. What is the mandatory check order for COLLECT?
13. Why must events process in source order, not ID order?
14. What does "fresh state every invocation" mean for `processHandover`?
15. Does `processHandover` ever mutate its input array?

**Data structures**
16. What are the three lookup structures inside `processHandover`, and
    what does each answer?
17. Why is `seenParcelIds` a `Set` rather than an array?
18. What's the one O(n) operation in the per-event hot path, and why?

**React**
19. What triggers a Run, from the click to the state update, in one
    sentence?
20. What does editing a table cell dispatch, and does it touch
    `lastResult`?
21. What does Reset actually call, under the hood?
22. Why is the chart lazy-loaded?
23. What CSS custom property drives the app's one accent color, and what
    two roles does it serve?

**Testing**
24. Name the three testing layers and what each one is best at catching.
25. What are the 6 required Playwright acceptance scenarios, in one
    phrase each?
26. Why does the Vitest suite avoid `toBeDefined()`?

**AI-assisted development**
27. What genuine blocker did the initial assessment find regarding the
    P11 spec, and how was it resolved?
28. Name one specific library-verification catch made during
    development (be ready with the actual detail, not a generality).
29. What explicit style departure did this project make from the
    assistant's own default, and why?

**Trade-offs**
30. Why full-table validation instead of per-row?
31. Why is `HandoverResult | null` used instead of an all-zero default
    plus a boolean flag?
32. Name one thing this app deliberately does NOT do that a production
    version would need, and why it's out of scope here specifically.

**Live modification**
33. If asked to add a new validation rule live, which file do you touch
    first, and why not `processor.ts`?
34. If asked to add a new rejection outcome type, what three places does
    TypeScript force you to update (and why does it force you)?
35. If asked to add a UI-only toggle (e.g. "show rejected only"), where
    does that state live, and why not in the shared reducer?
