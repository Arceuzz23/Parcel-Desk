# Interview Presentation — Parcel Desk

A 30–40 minute interview flow. Grounded in the actual repository — see
`DEVELOPMENT.md` for the evidence-classified development history,
`flow.md` for the verified execution trace, `questions.md` for exhaustive
Q&A prep, and `decisions.md` (root — the current, actively-maintained
decisions log; the older `docs/DECISIONS.md` covers a subset at less
depth and is stale on the chart implementation, see `DEVELOPMENT.md` §7)
for the "why" behind each design choice. This document is the *agenda and
delivery script*; those files are the *reference material* to fall back
on when a question goes deeper than the timing below allows.

**Suggested timing (30–40 min total):**

| Section | Time |
|---|---|
| 1. Opening | 60–90 sec |
| 2. Problem Statement | 3 min |
| 3. Requirements | 3 min |
| 4. Live Demo | 5 min |
| 5. Architecture | 5 min |
| 6. Domain Logic | 7 min |
| 7. Testing | 4 min |
| 8. AI-Assisted Development | 5 min |
| 9. Trade-offs / Challenges | 3 min |
| 10–12. Live-mod prep, held in reserve | 3 min |
| 13–15. Q&A / buffer | remainder |

---

## 1. Opening (60–90 seconds)

Engineer voice, not marketing copy:

> "Parcel Desk is a hostel parcel-desk handover board — it takes a day's
> worth of ARRIVE and COLLECT events, validates the whole table up front,
> runs them through a deterministic domain engine, and produces a final
> board of what's pending, what's collected, and an exact outcome for
> every single event — including the ones that get rejected.
>
> It's built as a browser-only, in-memory React app — no backend, no
> database, by requirement, not by accident. The most important
> architectural decision is that the entire domain engine —
> `processHandover()` — is plain TypeScript with zero React or DOM
> imports. It's testable in milliseconds with no browser at all, and the
> UI is nothing more than a renderer for whatever it returns.
>
> What's interesting here isn't the UI polish — it's the discipline around
> a few rules that look simple but have real edge cases: processing must
> happen in *source order*, never sorted by event ID; a malformed row
> blocks the *entire* run, not just itself; and a completed run over an
> empty table has to look *different* from never having run at all. I can
> walk through why each of those matters."

---

## 2. Problem Statement (3 min)

- **Input:** an editable table of events, each with an Event ID, an
  Action (`ARRIVE` or `COLLECT`), a Parcel ID, and — depending on the
  action — a student name, a 4-character pickup code, and a shelf ID.
- **Actions:**
  - `ARRIVE` — a parcel is placed on a shelf. Requires student, pickup
    code, shelf.
  - `COLLECT` — a student picks up a parcel by presenting a pickup code.
    Student/shelf may be blank; only the pickup code matters.
- **Processing:** the whole table is validated first (structural
  correctness — is this even a well-formed row); only if the *entire*
  table passes does the event engine run, in the table's own order,
  applying a fixed decision tree per event.
- **Output:** an exact outcome per event (`ARRIVED`, `COLLECTED`, or one
  of four specific rejection reasons), a final pending list, a final
  collected list, and summary counts.
- **Constraints (say explicitly):** no backend, no database, no network
  calls, no auth, no persistence — everything lives in one browser tab's
  memory and resets on reload.
- **Why event order matters:** rejection reasons like "this parcel already
  arrived" or "this pickup code is already in use" are only meaningful
  relative to *what actually happened earlier in the real sequence* — not
  relative to some arbitrary sort of the free-text Event ID field. Sorting
  by ID first would silently change the meaning of the run.

---

## 3. Requirements

**Required by P11 (via `docs/PLAN.md`, treated as the de facto spec — see
§8 for why):**
- Editable event table; a Run Handover action; per-event outcomes; a final
  handover board; summary counts (pending/collected/rejected); specific
  validation messages; a built-in sample with Reset; whole-table
  structural validation; the exact ARRIVE/COLLECT check-order rules;
  source-order processing; the reset-vs-empty-run visual distinction; a
  6-scenario acceptance test suite.

**Optional enhancements actually implemented (not P11-required, but built
because they fit the spirit of an "operations console" without violating
any Hard Constraint):**
- A Shelf Map (spatial view of pending parcels by shelf) — PLAN.md
  explicitly marks this optional ("omit if it doesn't improve
  understanding").
- An Events Over Time chart (Bklit area-chart) — PLAN.md allows "one
  meaningful chart max."
- A cross-highlight interaction (`selectedParcelId`) linking Handover
  Board, Event Timeline, and Shelf Map selections.
- Motion-based transitions (count-up numbers, FLIP pending→collected
  transition, staggered entrance) — explicitly scoped as presentation-only
  in PLAN.md.
- An automated accessibility sweep (axe-core) and a keyboard-only E2E
  flow, beyond the minimum 6 required Playwright scenarios.

If asked to draw the line sharply: **everything in the first list is
graded against; everything in the second list is a deliberate,
spec-permitted enhancement that can be pointed to as evidence of judgment,
not scope creep** (it was checked against PLAN.md's Prohibited
"Improvements" list, which forbids things like auth/backend/persistence —
none of the optional items above are on that list).

---

## 4. Live Demo Script

Every step below uses only things the app actually supports — verified
against `flow.md`'s traced execution and `e2e/handover.spec.ts`'s real
assertions.

| # | What to do | What to say | What the interviewer should notice |
|---|---|---|---|
| 1 | Load the app (`npm run dev`, navigate to `localhost:5173`) | "This is the pre-run state — the 6 built-in events, no result yet. Notice the sections staggering in on load — that's a one-time entrance animation, purely presentational, gated behind `prefers-reduced-motion`." | Summary figures show `—`, not `0` — the reset-vs-empty-run distinction starts here |
| 2 | Point at the Event Log | "This is the source of truth. Nothing else stores parcel state independently — every other panel is derived from running this table." | The table is the only editable input |
| 3 | Point at the pre-run Summary/Board/Timeline/Shelf Map | "Everything else is currently in its pre-run empty state, not zeros." | Shelf Map renders nothing at all pre-run (a deliberate `return null`, not an empty-state card) |
| 4 | Click **Run Handover** | "This validates the whole table, then runs the domain engine once." | Summary count-up animates; Timeline and Board populate together |
| 5 | Point at the outcomes list | "E01 through E06 in source order. E03 is rejected — `PICKUP_CODE_MISMATCH` — because it was submitted with the wrong code." | The exact contract term is shown, not a generic error |
| 6 | Click the rejected E03 node | "The Rejected Events detail explains exactly why — expected code vs. received code — and what the consequence is: P01 stays on the shelf." | Cross-highlight also lights up P01 on the Board and Shelf Map |
| 7 | Correct E03's pickup code in the table (`ZZZZ → K7M2`) | "I'm editing the input — watch that the board *doesn't* change yet." | Board/Summary/Timeline stay exactly as they were — proves state separation |
| 8 | Click **Run Handover** again | "Now it re-runs from a fresh, empty internal state — not incrementally." | E03 flips to `COLLECTED`; P01 moves from Pending to Collected with a FLIP transition |
| 9 | Edit Event 6's Event ID to `E05` (duplicate) | "This is a structural problem — a duplicate Event ID." | — |
| 10 | Click **Run Handover** | "The whole run is blocked — zero partial output, not 'skip the bad row.'" | Validation banner names the specific duplicate ID; Board/Summary revert to pre-run state, not stale old data |
| 11 | Click **Reset** | "This restores the exact 6-event fixture and clears everything back to pre-run — not to an empty-run `0/0/0`." | Summary shows `—` again, distinct from what an actual empty run would show |
| 12 | (Optional, time permitting) Delete all 6 rows, click Run Handover | "This is a real completed run over zero events — a legitimate `0/0/0`, not an error." | Compare directly against step 11's `—` state — the two must look different |

---

## 5. Architecture Presentation (5 min)

```
Event Log (source of truth, editable React state)
        ↓
validateEvents()      — full-table structural validation
        ↓
   invalid → ValidationError[] shown, lastResult explicitly cleared to null
   valid   → processHandover() — pure domain engine, fresh state per call
        ↓
HandoverResult { outcomes, pending, collected }   — the ONE stored result
        ↓
selectors.ts — getSummary / getShelfMap / getEventsOverTime (all DERIVED, nothing cached)
        ↓
React UI (shadcn/ui + Motion + one Bklit chart)
```

- **Source of truth:** `AppState.rows` (the editable table). Nothing else
  independently tracks parcel state.
- **State ownership:** exactly one `useReducer`, in `App.tsx`. Every other
  component is a pure function of its props — no component-local state
  holds anything that matters to correctness.
- **Domain vs. presentation layers:** `src/lib/` (types, validation,
  processor, selectors, sample data, constants) has zero React/DOM
  imports — verifiable directly by inspection, and enforced by the fact
  that the entire domain Vitest suite runs with no jsdom. `src/components/`
  and `src/app/` only *consume* `src/lib/`'s output.
- **Validation/processing boundary:** only `appReducer.ts`'s `RUN` case
  ever calls `validateEvents()` or `processHandover()` — nothing else in
  the app calls either.
- **Derived values:** everything on screen except 4 reducer fields
  (`rows`, `lastResult`, `validationErrors`, `selectedParcelId`) is
  recomputed fresh on every render from `lastResult` — nothing is cached
  in state. (Reference `flow.md` §3's stored-vs-derived table if asked for
  detail.)

---

## 6. Domain Logic Presentation (7 min, whiteboard-ready)

Draw two decision trees.

**ARRIVE:**
```
event arrives
  → seen before (this Parcel ID)?  → yes → PARCEL_ALREADY_SEEN, no change
  → pickup code already active on another pending parcel? → yes → ACTIVE_CODE_COLLISION, no change
  → otherwise → ARRIVED: push to pending, mark parcel seen, activate the code
```

**COLLECT:**
```
event arrives
  → parcel currently pending?  → no → PARCEL_NOT_PENDING, no change
  → pickup code matches the pending parcel's code? → no → PICKUP_CODE_MISMATCH, no change
  → otherwise → COLLECTED: remove from pending, add to collected, free the code
```

**Key points to narrate:**
- **Check order is mandatory, not incidental** — `PARCEL_ALREADY_SEEN`
  must be checked before `ACTIVE_CODE_COLLISION`; `PARCEL_NOT_PENDING`
  before `PICKUP_CODE_MISMATCH`. Two rejection reasons could theoretically
  both apply to the same event; the order decides which one is reported.
- **A rejection never mutates state** — every rejection branch pushes an
  outcome and `continue`s; none of them `return`/`throw`, and none of them
  touch `pending`/`collected`. This is what stops a wrong-code scan from
  accidentally collecting the wrong parcel.
- **Pickup codes are reusable** — once a parcel is collected, its code is
  freed from the active-code map, so a later ARRIVE can legitimately reuse
  it.
- **Fresh state every invocation** — `processHandover()` declares its
  `Set`/`Map`/array locals inside the function body. Running the same
  events twice produces two distinct-but-equal results; nothing leaks
  between runs. (If asked "what would break otherwise": a second Run after
  editing the table would incorrectly treat prior parcels as
  already-seen.)
- **Ordering guarantees:** the outcomes list preserves source order; the
  pending list preserves accepted-arrival order; the collected list
  preserves successful-collection order — all plain array pushes, never a
  sort.

---

## 7. Testing Presentation (2–3 min)

Three layers, each catching a different failure class:

- **Vitest (`src/tests/domain/`, 4 files)** — exact-assertion tests of the
  domain engine in isolation: the canonical 6-event oracle, corrected
  E03, E06 collision, empty input, duplicate event ID, the pickup-code
  regex's boundary cases, an out-of-order-ID test that specifically rules
  out a hidden sort-by-ID bug, and a purity test proving no shared state
  leaks across calls.
- **RTL (`src/tests/ui/App.test.tsx`)** — renders the real `<App />`,
  drives it through actual user interactions, and catches wiring bugs the
  domain suite can't see (e.g. a button that doesn't dispatch the right
  action) even if `processHandover()` itself is correct.
- **Playwright (`e2e/`, 3 files)** — `handover.spec.ts`'s 6 required
  acceptance scenarios in a real browser; `accessibility.spec.ts`'s
  axe-core sweep (WCAG 2 A/AA) across 3 states plus a reduced-motion
  check; `keyboard-nav.spec.ts`'s keyboard-only flow.

**Why this matters specifically for AI-generated code:** an agent can
produce plausible-looking logic that's subtly wrong on check order or
edge cases — a hidden sort-by-ID bug would still pass the canonical oracle
by coincidence (the built-in fixture's IDs already happen to be in order).
The dedicated out-of-order test exists specifically to catch that class of
error; it's not redundant with the oracle test, it's adversarial to it.

---

## 8. AI-Assisted Development Presentation (5 min)

- **What tools, and why:** Claude Code as the primary implementation
  agent, working phase-by-phase against `docs/PLAN.md`. See
  `DEVELOPMENT.md` §3 for the full tool table.
- **What AI generated:** essentially all source code, tests, and
  documentation across this project's history — scaffolding, the domain
  engine, the UI, the Motion/Bklit integration, the Playwright suite, the
  accessibility fixes, the bundle-size fix.
- **What the human decided:** the requirements-interpretation call
  (treating `docs/PLAN.md` as the de facto spec once `docs/P11-SPEC.md`
  turned out to be missing — the agent flagged this rather than guessing);
  every phase boundary; two full visual-redesign briefs; the explicit
  rejection of a lazy bundle-size fix (raising the warning threshold
  instead of actually deferring the load); the "add comments everywhere"
  instruction so the code stays explainable live.
- **How it was validated:** real tool runs at every step — `tsc -b`,
  `vitest run`, `playwright test`, headless-Chromium screenshot checks —
  never just "the agent said it worked."
- **Did AI ever suggest something bad?** Yes, concretely: it initially
  proposed increasing `chunkSizeWarningLimit` to silence a real >500 kB
  bundle warning — that was explicitly rejected in favor of finding and
  fixing the actual unused-weight problem (deferring the chart's load
  until it's needed). See `DEVELOPMENT.md` §7 for the full account.
- **How P11 violations were prevented:** `CLAUDE.md`'s Hard Constraints
  list and `docs/PLAN.md`'s Prohibited "Improvements" list were both
  always-loaded project instructions throughout the session — verified in
  the final product by direct inspection (no server code, no `fetch`
  calls, no auth, anywhere in `src/`).
- **How quality/originality were maintained:** a documented "Rule of 3"
  (stop after 3 failed fix attempts on the same error, never weaken tests
  or add `any` to escape) was part of the standing project instructions;
  `docs/PROMPTS.md` notes it was never triggered during the domain-engine
  phase specifically because the check-order logic matched the spec on
  first implementation. Ownership is demonstrated by being able to explain
  every check-order decision, every data-structure choice, and every
  known gap in the current codebase (see §9 and `DEVELOPMENT.md` §11) —
  not by claiming to have hand-typed every line.

**Do NOT imply AI autonomously designed the whole project** — every
architectural boundary (domain-vs-UI separation, validation-before-
processing, in-memory-only state) traces to an explicit constraint in
`CLAUDE.md`/`docs/PLAN.md` that a human put there before any code was
written.

---

## 9. Challenges Presentation (3–5 strongest, 3 min)

1. **Fail-fast (whole-table) validation vs. UX convenience** — Why
   difficult: blocking an entire run on one bad row in a large table is a
   real cost. Solution: implemented exactly as the spec requires anyway,
   because the structural-vs-state-rejection distinction only holds
   together if a malformed row can never silently become "just skipped."
   Trade-off: accepted worse single-typo UX for guaranteed correctness
   semantics.
2. **Source-order processing, and proving it** — Why difficult: the
   canonical fixture's IDs already happen to be in source order, so a
   naive test suite wouldn't catch a sort-by-ID regression. Solution: a
   dedicated out-of-order-ID test. Lesson: a "happy path" oracle test is
   not proof of a specific implementation detail.
3. **Bundle-size warning** — Why difficult: the easy fix (raise the
   warning threshold) doesn't solve the actual problem (real, unused
   weight loading on first paint). Solution: genuine `React.lazy()`
   deferral plus vendor-chunk splitting, verified by actually inspecting
   resulting chunk sizes (628 kB → 324 kB main chunk). Trade-off: slightly
   more build configuration for a real, measured improvement.
4. **Documentation drift after a redesign** — Why difficult: `docs/
   DECISIONS.md`'s chart-related entries describe an earlier Bklit
   ring-chart that was later replaced by an area-chart, and were never
   updated. Solution: disclosed explicitly in `DEVELOPMENT.md` rather than
   silently patched. Lesson: naming a real inconsistency is stronger
   interview evidence than pretending everything is perfectly in sync.
5. **One-viewport desktop density** — Why difficult: 6+ operationally
   meaningful sections (header, summary, board, timeline, shelf map, event
   log) easily overflow 1440×900 without `overflow: hidden` tricks.
   Solution: two dedicated layout-refinement passes reorganizing into a
   horizontal metrics row and a two-column grid. Trade-off: more layout
   iteration time for a genuinely dense, non-scrolling desktop
   composition.

---

## 10. Important Design Decisions to Present (5–8, from `docs/DECISIONS.md`)

1. **Domain logic isolated from React.**
   *30-sec:* `src/lib/` has zero React/DOM imports — testable standalone.
   *2-min:* enables exact-assertion Vitest tests with no jsdom, and means
   the UI can be restyled (as it was, twice) without risking a change to
   what `processHandover()` computes.
   *Likely follow-up:* "Why not put processing in a `useMemo`?"
   *Strong answer:* would violate the state-separation requirement
   (editing shouldn't recompute the displayed result) and blur the
   React-free boundary.

2. **`HandoverResult | null` for `lastResult`, not a value + `hasRun`
   boolean.**
   *30-sec:* `null` is enforced by TypeScript itself — every consumer must
   narrow before reading fields.
   *2-min:* a second boolean flag could go stale independently of the
   result it's supposed to describe; `null` structurally can't.
   *Likely follow-up:* "Isn't that repetitive — every consumer needs its
   own null check?"
   *Strong answer:* yes, and it's an intentional trade for making the
   reset-vs-empty-run distinction impossible to accidentally collapse.

3. **Source-order processing, never sorted.**
   *30-sec:* plain `for...of` over the input array, no `.sort()`.
   *2-min:* rejection reasons depend on real sequence, not the free-text
   ID field; proven with an out-of-order-ID test.
   *Likely follow-up:* "What if two events have literally identical
   timestamps in a real system?" *Strong answer:* this app has no
   timestamps at all — order is exactly and only "position in the table,"
   which sidesteps that question entirely; a real system would need an
   explicit tie-break rule.

4. **Single shared `selectedParcelId` cross-highlight field.**
   *30-sec:* one reducer field drives selection across Board/Timeline/
   Shelf Map.
   *2-min:* avoids three independently-synchronized local selection
   states; toggles on re-click; cleared on Run/Reset since a stale
   selection against a replaced board is meaningless.
   *Likely follow-up:* "What if you needed to select a validation-error
   row that has no parcel?" *Strong answer:* the current design doesn't
   support that — it's parcel-keyed by design; extending it would mean a
   union type or a second field, a legitimate open design question.

5. **No global state library.**
   *30-sec:* one `useReducer`, no Redux/Zustand.
   *2-min:* the component tree is 2 levels deep at most; nothing here
   needs cross-tree state sharing beyond what one shared field already
   provides.
   *Likely follow-up:* "What would make you reach for one?" *Strong
   answer:* if state needed to be read/written from components with no
   shared ancestor short of the root, or if update logic needed
   middleware (logging, undo) beyond a plain reducer.

6. **Bklit chosen for exactly one chart, lazy-loaded.**
   *30-sec:* the spec allows "one meaningful chart max"; Bklit's area-chart
   plots pending/collected/rejected over the run, deferred until a result
   exists.
   *2-min:* the chart pulls in a real d3/visx dependency chain (~94 kB
   minified) that's genuinely unused pre-Run — `React.lazy()` gated on
   `result !== null` means that weight is never fetched on first paint.
   *Likely follow-up:* "Why not a heavier library like Recharts?"
   *Strong answer:* Bklit was already the registry the spec pointed at;
   no material reason to add more weight for one optional chart.

---

## 11. System Design Questions (explicitly hypothetical productionization)

**Always separate current architecture from this section verbally** — say
"in the current app..." vs. "if this became a production service...".

- **Why no backend?** Not a technical judgment call — explicitly
  prohibited by the assignment's Hard Constraints.
- **Why no database?** Same; `docs/SYSTEM-DESIGN.md` sketches a
  hypothetical Postgres schema, marked "not implemented."
- **Why in-memory?** "Zero network calls at runtime" implies no
  persistence layer either; a reload returns to the built-in fixture.
- **Why no Redux/Zustand?** One reducer, shallow tree — nothing a global
  store would meaningfully improve here.
- **Why no real-time sync?** Not required, and would conflict with the
  spec's explicit state-separation requirement (editing must not silently
  change the displayed result).
- **What if this supported 100,000 events?** `processHandover()`'s O(n)
  full-replay approach would still complete well under a second — the
  actual first bottleneck would be `EventTable` rendering 100K
  unvirtualized DOM rows. A production version would use `docs/
  SYSTEM-DESIGN.md`'s incrementally-updated projection instead of full
  replay per run.
- **What about persistence?** `docs/SYSTEM-DESIGN.md` proposes an
  append-only `events` table as the source of truth, with a derived,
  mutable `parcels` read-projection — directly mirroring this app's
  in-memory `Event[] → HandoverResult` relationship, just durable.
- **What about multiple desks?** `docs/SYSTEM-DESIGN.md`'s data model
  scopes every table by `desk_id`; cross-desk operations never need a
  distributed transaction since each desk's events are independent.
- **What about concurrent collection (a double-collect race)?**
  `docs/SYSTEM-DESIGN.md`'s Concurrency section designs a transactional
  compare-and-swap (`UPDATE ... WHERE state = 'PENDING'`) so the losing
  request gets an honest rejection rather than a double-collected parcel.
- **What about an audit log?** The event-sourced design already carries
  this by construction — the append-only log *is* the audit trail.
- **Auth?** Explicitly out of scope for this assignment; would sit in
  front of the hypothetical API in `docs/SYSTEM-DESIGN.md`, never
  discussed as implemented.

---

## 12. Live Modification Strategy

**Process to narrate before touching code:**
1. Understand the request — restate it back.
2. Identify the affected behavior (structural validation? state
   rejection? presentation only?).
3. Identify the specific file(s)/function(s) — say them out loud before
   editing.
4. Implement (with or without AI assistance — narrate which).
5. Add/update a test that would have failed before the change.
6. Run the test.
7. Verify in the running UI, not just the test output.
8. State the trade-off out loud, even if it's "none material."

**5–10 likely modifications (grounded in the actual current file
structure — see `questions.md` §11–§12 for full walkthroughs of the first
few):**

1. **Add a shelf-ID format rule** (Easy) — `src/lib/validation.ts` +
   `constants.ts` + `validation.test.ts`. It's structural, so it belongs
   in `validateEvents()`, not `processHandover()`.
2. **Add a derived stat, e.g. "busiest shelf"** (Easy/Medium) —
   `src/lib/selectors.ts` + `SummaryPanel.tsx` + `selectors.test.ts`. Pure
   derivation from `HandoverResult`, same pattern as `getShelfOccupancy`.
3. **Change the pickup-code format** (Easy code change, high blast
   radius) — `constants.ts`'s regex, but flag immediately that this
   invalidates the canonical fixture's codes and therefore every
   oracle-based test — a "stop and confirm" moment, not a silent edit.
4. **Add a new rejection outcome** (Medium) — `types.ts`'s `OutcomeType`
   union, `constants.ts`'s `OUTCOME_DESCRIPTIONS` (TypeScript's `satisfies
   Record<OutcomeType,string>` will refuse to compile without it — worth
   demonstrating live), then `processor.ts`'s check order — explicitly
   flag that a new check needs a documented position in the mandatory
   order, which the spec doesn't define for a type it doesn't know about.
5. **Add a "filter to rejected only" toggle** (Medium) — pure
   presentation-layer `useState` inside `EventTimeline.tsx`, *not* the
   shared reducer, since no other component needs to know about it.
6. **Support multi-select in the cross-highlight** (Hard) — would extend
   `selectedParcelId: string | null` to `string[]`, without breaking
   existing single-select toggle tests.
7. **Add "undo last Run"** (Hard) — would need a history stack on
   `AppState`, carefully, without violating "editing doesn't mutate the
   displayed result."

**Explicitly out of bounds for a live-mod request:** backend, database,
auth, real-time sync, notifications, bookings, delivery routing,
multi-desk persistence — name these as spec-prohibited immediately if
asked, rather than attempting them.

---

## 13. Rapid-Fire Interview Prep

*(Full 30+ pair list lives in `questions.md` §17 — below is a
presentation-ready subset. Use `questions.md` directly if more depth is
needed live.)*

1. Q: Source of truth? A: The editable event log.
2. Q: When does processing happen? A: Only on Run Handover, after full
   validation.
3. Q: Does a rejection mutate state? A: No — push outcome, continue.
4. Q: Does event ID determine order? A: No — source (array) order does.
5. Q: `processHandover([])`? A: `{outcomes:[],pending:[],collected:[]}` —
   valid, not an error.
6. Q: `lastResult === null` vs. an empty result? A: No run yet vs. a
   completed zero-event run.
7. Q: ARRIVE check order? A: Already-seen, then code collision.
8. Q: COLLECT check order? A: Not-pending, then code mismatch.
9. Q: Pickup code regex? A: `/^[A-Z0-9]{4}$/`, mixed alphanumeric valid.
10. Q: Does COLLECT need a student/shelf? A: No, only a valid code.
11. Q: Global state library? A: None — one `useReducer`.
12. Q: Is `src/lib/` allowed to import React? A: No.
13. Q: Testing layers? A: Vitest, RTL, Playwright.
14. Q: Required Playwright scenarios? A: 6, and `handover.spec.ts` has
    exactly 6.
15. Q: Is the chart eagerly loaded? A: No — lazy, gated on `result !==
    null`.
16. Q: Does the app have a backend? A: No — explicitly prohibited.
17. Q: Is there a real `docs/P11-SPEC.md`? A: No — never supplied;
    `docs/PLAN.md` is the de facto spec, a documented finding from the
    first working session.

---

## 14. Presentation Do / Don't

**Do:**
- Explain requirements (and the missing-spec finding) before touching the
  demo.
- Show the source-of-truth model — one editable log, everything else
  derived.
- Demonstrate at least one real state transition live (pending →
  collected).
- Explain the validation boundary explicitly (structural vs. state
  rejection).
- Explain how AI output was verified (`tsc -b`, `vitest run`, `playwright
  test` — real runs, not assumptions).
- Show at least one real test failing-then-passing if time allows.
- Discuss at least one real trade-off (fail-fast validation's UX cost;
  the `HandoverResult | null` repetition cost).

**Don't:**
- Claim AI wrote everything with no human decisions — it isn't true (see
  `DEVELOPMENT.md` §10) and it's a weaker answer than the accurate one.
- Claim any non-P11 feature (auth, persistence, notifications) exists —
  none do.
- Spend disproportionate time on visuals over the domain engine — the
  operational board is the point, not secondary to the chart.
- Pretend a hypothetical backend/database exists — `docs/SYSTEM-DESIGN.md`
  is explicitly conceptual, never implemented.
- Use unsupported buzzwords ("event-sourced," "microservice") to describe
  the actual shipped app — reserve those terms for the explicitly
  hypothetical System Design section.
- Say "AI decided X" without explaining what validated that decision.
- Spend 20 minutes clicking through the UI without an engineering
  explanation attached to each click.

---

## 15. Final 30-Second Closing

> "So: Parcel Desk solves a deterministic event-processing problem — turn
> a day's ARRIVE/COLLECT log into an exact final board — with a domain
> engine that's completely independent of the UI around it. The
> architecture keeps validation, processing, and presentation in three
> clean layers, each individually testable, and the test suite — unit,
> component, and end-to-end — exists specifically to catch the subtle
> ordering and edge-case bugs that this kind of rules engine is prone to.
> It was built with heavy AI assistance for implementation speed, but
> every architectural boundary, every requirements call, and every
> accepted trade-off was a decision I made and can defend — including the
> couple of rough edges I've been upfront about rather than hiding."
