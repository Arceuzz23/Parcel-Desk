# Implementation Plan — Hostel Parcel-Desk Handover Board

## Role
Lead senior frontend engineer + implementation agent. Build strictly and literally
per `docs/P11-SPEC.md`. Not just "working UI" — demonstrate precise requirement
interpretation, framework-independent domain logic, deterministic processing,
strong TypeScript, comprehensive testing, polished UX, purposeful animation,
meaningful visualization, disciplined AI-assisted engineering.

## Chosen Implementation
Browser-based React + TypeScript, in-memory state. (Spec permits CLI/notebook/
desktop too — browser chosen for the required editable table + interactive
Run Handover action.)

## Hard Constraints (see CLAUDE.md for the absolute list)
No backend, API, DB, Redis, Docker, network service, auth, notifications,
bookings, delivery routing. All state in memory. Event log is source of truth.

## Technology Stack
Vite, React, TypeScript (strict), Tailwind, shadcn/ui, Motion, Bklit, Vitest,
RTL, Playwright (+ MCP dev-time only), Vercel-compatible static build.
No Next.js. No global state library without written justification.

## Library Verification Rule
Before using any package: inspect package.json, verify installed version,
verify actual current API, adapt to installed version rather than an assumed
API. Never fabricate imports — especially for Bklit, Motion, shadcn/ui.

## Bklit Usage
Visualization layer only, never the primary UI. One meaningful chart max
(pending vs collected split, or shelf occupancy) derived from HandoverResult.
No independent chart state. Omit if it doesn't improve understanding.

## Motion Usage
Presentation-only, zero coupling to domain logic. Use for: summary count
transitions, event outcome appearance, pending-parcel entering board,
collected-parcel leaving pending, validation feedback, reset transitions.
Respect `prefers-reduced-motion` — app fully usable without animation.

## Core Architectural Principle
`processHandover(events)` must be callable with zero React/DOM/browser/Motion/
Bklit/shadcn imports. Pure TypeScript. React only consumes its output.

## Target Architecture

```
EVENT TABLE
   ↓
INPUT VALIDATION
   ↓
(INVALID → VALIDATION RESULT) | (VALID → EVENT PROCESSOR)
   ↓
HANDOVER RESULT
   ↓         ↓          ↓
OUTCOMES  PENDING   COLLECTED
   ↓
SUMMARY → UI (shadcn / Motion / Bklit)
```

## Project Structure

```
src/
├── app/App.tsx
├── components/ (Header, EventTable, EventOutcomes, HandoverBoard,
│                SummaryPanel, ValidationBanner, EmptyState, ShelfMap, ui/[shadcn])
├── lib/ (types.ts, constants.ts, sampleData.ts, validation.ts,
│         processor.ts, selectors.ts, utils.ts)
├── tests/domain/
├── main.tsx, index.css
docs/ (PLAN.md, PROMPTS.md, DECISIONS.md, SYSTEM-DESIGN.md, TEST-EVIDENCE/)
```
No abstraction for abstraction's sake. Domain logic concentrated in `lib/`.

## Domain Types
`Event, EventAction ("ARRIVE"|"COLLECT"), EventOutcome, OutcomeType,
PendingParcel, CollectedParcel, HandoverResult, HandoverSummary,
ValidationError`. Strict TS, no `any`, discriminated unions where they
improve correctness, no raw outcome strings scattered through the app.

## Built-in Events (canonical fixture — never modify)

```
E01 ARRIVE  P01 Asha   K7M2 A1
E02 ARRIVE  P02 Bilal  R4Q8 B1
E03 COLLECT P01 —      ZZZZ —
E04 ARRIVE  P03 Chen   T9C4 A2
E05 COLLECT P02 —      R4Q8 —
E06 ARRIVE  P04 Divya  H2N6 B2
```
Single canonical fixture, cloned (not mutated) into editable React state.
Reset restores it exactly.

## Validation Contract (full-table, pre-processing)
- **Event ID**: trim, non-empty, unique → else `INVALID_EVENT` / `DUPLICATE_EVENT_ID`
- **Parcel ID**: trim, non-empty
- **Action**: exactly `ARRIVE` or `COLLECT` → else `INVALID_EVENT`
- **Pickup code**: `^[A-Z0-9]{4}$` — 4 chars, each independently uppercase
  letter OR digit (mixed alphanumeric valid, e.g. `K7M2`) → else `INVALID_PICKUP_CODE`.
  Write a unit test confirming this before relying on it.
- **ARRIVE** requires: non-empty student, valid pickup code, non-empty shelf
- **COLLECT** requires: valid pickup code only (student/shelf may be blank)

On structural failure: no partial processing, no outcomes, no board rows,
no summary, clear stale output, show validation message.

## Event Processor — `processHandover(events): HandoverResult`
Fresh state every invocation. Process in **source order** (never event-ID
order, never sorted).

**ARRIVE** (check order is mandatory):
1. Parcel ID in an earlier accepted arrival → `PARCEL_ALREADY_SEEN` (no change)
2. Another pending parcel holds same pickup code → `ACTIVE_CODE_COLLISION` (no change)
3. Otherwise → `ARRIVED`: add to pending, remember parcel ID, activate code

**COLLECT** (check order is mandatory):
1. Parcel not pending → `PARCEL_NOT_PENDING` (no change)
2. Pending but wrong code → `PICKUP_CODE_MISMATCH` (no change)
3. Correct → `COLLECTED`: remove from pending, add to collected, deactivate code

**Structural vs. state distinction is mandatory**: structural errors invalidate
the entire run with zero partial output; state rejections (`PARCEL_ALREADY_SEEN`,
`ACTIVE_CODE_COLLISION`, `PARCEL_NOT_PENDING`, `PICKUP_CODE_MISMATCH`) are valid
outcomes — processing continues.

Pending list preserves accepted-arrival order; collected list preserves
successful-collection order. Never alphabetical/parcel-ID sort.

## Canonical Oracle (built-in sample)

```
E01 ARRIVED · E02 ARRIVED · E03 PICKUP_CODE_MISMATCH · E04 ARRIVED ·
E05 COLLECTED · E06 ARRIVED
Pending: P01, P03, P04 · Collected: P02
Summary → Pending 3, Collected 1, Rejected 1
```

## Acceptance Tests
1. **Built-in** — as above.
2. **Correct E03** (`ZZZZ→K7M2`) → E03 `COLLECTED`; Pending P03,P04; Collected P01,P02; 2/2/0.
3. **E06 collision** (reset, `H2N6→T9C4`) → `ACTIVE_CODE_COLLISION`; P04 excluded; 2/1/2.
4. **Empty input** → 0/0/0, no rows, no stale outcomes. *(This is a completed
   run yielding zero — visually distinct from Reset, below.)*
5. **Duplicate event ID** (reset, `E06→E05`) → `DUPLICATE_EVENT_ID`; zero
   partial outcomes/board/summary.
6. **Reset vs. empty-run state** — Reset shows the 6 built-in events with
   **no result yet** (summary panel in pre-run empty state, not `0/0/0`).
   Running on an actually-empty table shows `0/0/0`. These must be visually
   distinguishable in the UI and covered by a Playwright assertion.

## Domain Test Suite (Vitest — exact assertions, no `toBeDefined()`)
Built-in oracle · corrected E03 · E06 collision · empty table · duplicate
event ID · source-order processing · invalid event · invalid pickup code ·
missing ARRIVE student/shelf/code · duplicate parcel (`PARCEL_ALREADY_SEEN`) ·
active-code collision · collect non-pending (`PARCEL_NOT_PENDING`) · wrong
code (`PICKUP_CODE_MISMATCH`) · successful collection · COLLECT with blank
student/shelf · reset-state vs. empty-run-state distinction.

## UI Design
Single screen: Header → Summary → Event Log → Validation/Outcomes → Final
Handover Board (the operational focus — never secondary to charts).
Professional, restrained, information-dense without clutter. No excessive
gradients/glassmorphism/decorative icons — every element must serve a purpose.

**Event table**: columns `# | Event ID | Action | Parcel ID | Student |
Pickup Code | Shelf | Actions`; add/edit/delete rows; shadcn Table/Button/
Input/Select/Badge/Alert; Action as a `<Select>`.

**Run Handover**: read events → validate → `processHandover()` → render.
Never mutate input events during processing.

**Reset**: restores exact 6 built-in events; clears validation, outcomes,
board, summary — per the reset-vs-empty-run distinction above.

**State separation**: editable input state ≠ last processed result. Editing
the table must not silently mutate the displayed prior result.

**Summary**: Pending/Collected/Rejected, prominent, subtle count-up Motion;
optional Bklit chart never replaces the numeric values.

**Outcomes**: source order, exact contract terms only (`ARRIVED`, `COLLECTED`,
`PARCEL_ALREADY_SEEN`, `ACTIVE_CODE_COLLISION`, `PARCEL_NOT_PENDING`,
`PICKUP_CODE_MISMATCH`) — never a generic "Error".

**Validation UI**: specific — event + field + issue (e.g. "E06 · Event ID ·
Duplicate event ID: E05"), not "Something went wrong."

**Empty states**: "No events yet / Add an event to begin." and "No pending
parcels / The desk is clear."

**Shelf map (optional)**: derives entirely from final pending state, no
second store, omit if it clutters the primary screen.

**Accessibility**: semantic HTML, labels, keyboard nav, visible focus,
adequate contrast, reduced-motion support, non-color-only status indicators.

**Responsiveness**: desktop/laptop primary; tablet/narrow browser supported
(horizontal scroll acceptable for the table); must not visibly break on
mobile even though untargeted.

## Testing Layers
- **Vitest** — business rules, exact assertions
- **RTL** — rendering, interactions, validation display, reset, empty states
- **Playwright** — full user flows, minimum 6 scenarios (5 above + reset/
  empty-run distinction). Playwright MCP for dev-time debugging only —
  never a runtime or CI dependency.

## Code Quality
Pure/small functions, descriptive names, explicit types, no `any`, no
`@ts-ignore`, no silent `catch {}`, no mutation, business rules only in
the domain layer.

## Performance
Deliberately small app — no Redux/Zustand/virtualization/Web Workers/
caching systems. Correctness and clarity over premature optimization.

## Phases (git checkpoint after each)
0. **Inspection** — repo/package.json/config/deps/Node version/package
   manager/existing P11 doc. Produce assessment before touching code.
1. **Scaffolding** — Vite+React+TS+Tailwind+shadcn+Motion+Bklit+Vitest+RTL+
   Playwright installed; `npm run dev` and `npm run build` verified.
2. **Domain model** — types, constants, sampleData (cloned fixture).
3. **Validation** — full-table pre-validation + regex tests, stable before proceeding.
4. **Event processor** — exact check order, verified against canonical oracle.
5. **Selectors** — summary, pending/collected lists, optional shelf occupancy.
6. **Domain test suite** — full Vitest coverage above.
7. **UI shell** — static shadcn layout, no animation yet.
8. **UI integration** — wire editable state → validate → process → render.
9. **Motion layer** — purposeful only, reduced-motion respected.
10. **Bklit visualization** — one chart max, derived, no new state.
11. **Optional shelf map** — only if it doesn't clutter the screen.
12. **Playwright suite** — all 6 scenarios, exact UI-state assertions.
13. **Polish** — accessibility, empty states, responsiveness, console cleanliness.
14. **Documentation** — PLAN.md (this), PROMPTS.md, DECISIONS.md,
    SYSTEM-DESIGN.md, TEST-EVIDENCE/, README.
15. **Deployment** — push to GitHub, import to Vercel (auto-detects Vite),
    verify live build matches local, all acceptance criteria pass in prod.
    Optional: GitHub Actions running Vitest + Playwright on push.
16. **Final specification audit** — re-verify every item below against
    `docs/P11-SPEC.md` line by line, and re-run `npm run build`,
    `npm run test`, `npx playwright test` with zero TypeScript/lint/console errors.

## Final Specification Audit Checklist
Editable table · Run Handover · outcomes · final board · summary counts ·
validation message · sample/reset · complete-table validation · duplicate
event ID · invalid pickup code · invalid event · ARRIVE behavior · COLLECT
behavior · state-rejection continuation · source-order processing · pending
ordering · collected ordering · empty-table behavior · built-in oracle ·
corrected E03 · E06 collision · empty input · duplicate event ID ·
reset-vs-empty-run distinction · synchronized UI state.

## Prohibited "Improvements"
No login, accounts, notifications, email, QR codes, search server,
persistence, multi-hostel/multi-desk, auth, role management, APIs, cloud
storage, analytics backend, real-time sync. Document any such idea only as
a future concept in `docs/SYSTEM-DESIGN.md` — never implement.

## Completion Standard
Not complete merely because it compiles. Required chain: Specification →
Implementation → Unit tests → UI tests → E2E tests → Build → Manual
inspection → Specification audit → Complete.

## First Action
Do NOT code yet. Produce: (A) current repo state, (B) required setup
changes, (C) proposed phases, (D) technical risks, (E) dependencies to
install, (F) any genuine spec ambiguity. Then begin Phase 0 only, run its
checks, git checkpoint, report, and wait before Phase 1.
