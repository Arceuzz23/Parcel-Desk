# Prompt History — Parcel Desk

Every prompt the candidate (Aryan Choudhary) gave to the AI assistant (Claude Code) while building this project, reproduced **verbatim** and in exact chronological order, extracted directly from the session transcripts (not reconstructed from memory or paraphrased). This is the full, unabridged version of the summarized log in `docs/PROMPTS.md`.

**How this file was built:** every user-authored message across this project's three Claude Code session transcripts was extracted programmatically (filtering out tool-result payloads, which are not prompts), sorted by timestamp, and reproduced exactly as typed — including typos. Two entries were excluded as not being candidate-authored text and are listed as footnotes instead: one is the `run` skill's own bundled instructions (the skill was invoked mid-session; its boilerplate is not something the candidate typed), and one is a harness-generated context-compaction summary (produced automatically when the session's context window filled). Timestamps are converted from the transcripts' UTC to IST to match the timezone used by the project's git commit history.

**What this is not:** this is not an edited highlight reel. Short, mundane prompts ("how to run this?", "yes if the whole project is built end to end as specified") are included alongside the long, structured design/implementation briefs, because an accurate picture of AI-prompting strategy includes the short clarifying turns, not only the impressive ones.

---


## 1. Seed the project's own instruction files

**Timestamp:** 2026-08-23 02:57:00 IST  
**Context / outcome:** Supplies the exact content later saved as `CLAUDE.md`, `docs/PLAN.md`, `docs/DECISIONS.md` (initial version), `docs/SYSTEM-DESIGN.md`, and `docs/PROMPTS.md` — this is the project brief the candidate had already drafted (correcting an earlier, over-condensed version) before any implementation began. Matches the current repo's `docs/PLAN.md` almost verbatim.

````text
You're right — my condensed `PLAN.md` lost the full phase-by-phase detail (all 55 sections of validation rules, exact acceptance tests, architecture diagrams) from this document. Let me fix that properly: `CLAUDE.md` stays lean (that's correct per Claude Code's own guidance — it's a behavioral contract, not documentation), but `docs/PLAN.md` should carry the full extensive plan, not a summary. Here's the corrected split.
`CLAUDE.md` (repo root — unchanged, still lean)

```md
# Parcel Desk — Claude Code Project Instructions

## Source of Truth
`docs/P11-SPEC.md` is the authoritative functional specification. Never modify or
reinterpret its requirements. If ambiguous in a way that changes behavior, stop and ask.

## Hard Constraints — IMPORTANT
MUST NOT contain: backend, database, API route, Redis, Docker, network service,
authentication, notifications, bookings, delivery routing. Browser-only, in-memory,
zero network calls at runtime. Conceptual production architecture lives exclusively
in `docs/SYSTEM-DESIGN.md` — never implemented.

## Architecture
Editable event input → full-table validation → pure TypeScript `processHandover()`
→ HandoverResult → React UI (shadcn + Motion + Bklit).
Domain logic (`src/lib/`) MUST have zero React/DOM/browser API imports.

## Stack
Vite, React, TypeScript (strict), Tailwind, shadcn/ui, Motion, Bklit (viz only),
Vitest, RTL, Playwright + Playwright MCP (dev-time only). No Next.js. No global
state library unless justified in writing.

## Agent Workflow
Full phase list, exact validation rules, event-processor logic, acceptance tests,
and Playwright scenarios: see `docs/PLAN.md` — read it fully before Phase 0.
Work one phase at a time. Inspect before modifying. Git commit after every
completed phase. Rule of 3: after 3 failed fix attempts on the same error, stop
and report — never weaken tests, suppress errors, or add `any` to escape.

## Testing
Never weaken a test to make implementation pass. Disagreements between test and
spec resolve against `docs/P11-SPEC.md`, documented in `docs/DECISIONS.md`.

## Docs
@docs/P11-SPEC.md
@docs/PLAN.md
@docs/DECISIONS.md
@docs/SYSTEM-DESIGN.md
@docs/PROMPTS.md

```

`docs/PLAN.md` (the full master plan — this is what was missing)

```md
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

EVENT TABLE → INPUT VALIDATION → (INVALID → VALIDATION RESULT) | (VALID → EVENT PROCESSOR) ↓ HANDOVER RESULT ↓ ↓ ↓ OUTCOMES PENDING COLLECTED ↓ SUMMARY → UI (shadcn / Motion / Bklit)

```

## Project Structure

```

src/ ├── app/App.tsx ├── components/ (Header, EventTable, EventOutcomes, HandoverBoard, │ SummaryPanel, ValidationBanner, EmptyState, ShelfMap, ui/[shadcn]) ├── lib/ (types.ts, constants.ts, sampleData.ts, validation.ts, │ processor.ts, selectors.ts, utils.ts) ├── tests/domain/ ├── main.tsx, index.css docs/ (PLAN.md, PROMPTS.md, DECISIONS.md, SYSTEM-DESIGN.md, TEST-EVIDENCE/)

```
No abstraction for abstraction's sake. Domain logic concentrated in `lib/`.

## Domain Types
`Event, EventAction ("ARRIVE"|"COLLECT"), EventOutcome, OutcomeType,
PendingParcel, CollectedParcel, HandoverResult, HandoverSummary,
ValidationError`. Strict TS, no `any`, discriminated unions where they
improve correctness, no raw outcome strings scattered through the app.

## Built-in Events (canonical fixture — never modify)

```

E01 ARRIVE P01 Asha K7M2 A1 E02 ARRIVE P02 Bilal R4Q8 B1 E03 COLLECT P01 — ZZZZ — E04 ARRIVE P03 Chen T9C4 A2 E05 COLLECT P02 — R4Q8 — E06 ARRIVE P04 Divya H2N6 B2

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

E01 ARRIVED · E02 ARRIVED · E03 PICKUP_CODE_MISMATCH · E04 ARRIVED · E05 COLLECTED · E06 ARRIVED Pending: P01, P03, P04 · Collected: P02 Summary → Pending 3, Collected 1, Rejected 1

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

```

`docs/DECISIONS.md`
md

```md
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
```

`docs/SYSTEM-DESIGN.md`
Keep the full conceptual production architecture here (load balancer → stateless API → Postgres + Redis → event/audit store → async workers), covering capacity estimation, API design, DB schema, caching strategy, concurrency (double-collection race), idempotency (event ID as key), event sourcing trade-off discussion, horizontal scaling, failure handling, observability, security. Header every section: "Conceptual production architecture — not implemented, P11 explicitly excludes backend/network services."
`docs/PROMPTS.md`
Log real prompts as you go (don't fabricate) — this is your evidence for the "AI Prompting Strategy" grading criterion.
````

## 2. Phase 0 — read-only repository assessment

**Timestamp:** 2026-08-23 03:09:17 IST  
**Context / outcome:** First implementation-adjacent instruction. Triggered the discovery that `docs/P11-SPEC.md` (named in `CLAUDE.md` as the source of truth) did not exist in the repo — logged as prompt #1 in `docs/PROMPTS.md`.

````text
Read CLAUDE.md, docs/P11-SPEC.md, and docs/PLAN.md.

Do not modify anything yet.

Inspect the repository and determine its current state.

Then report:
1. repository state
2. required setup
3. dependencies needed
4. potential technical risks
5. the next implementation phase

Do not implement anything until the assessment is complete.
````

## 3. Kickoff implementation — Phases 1, 2, 3, 4, 6

**Timestamp:** 2026-08-23 03:17:50 IST  
**Context / outcome:** Scaffold + domain model + validation + event processor + domain tests, explicitly deprioritizing docs/visual polish/Motion/Bklit/Playwright until the domain engine works. Produced commit `07a00f3`.

````text
Read CLAUDE.md and the original P11 problem statement.

We are starting implementation NOW.

Do not spend tokens giving me a long assessment or explaining what you
are going to do. Inspect the repository briefly, then START WRITING
CODE.

Follow the implementation phases defined in CLAUDE.md, but execute
them efficiently.

Your immediate objective is:

PHASE 1 — PROJECT SETUP
PHASE 2 — DOMAIN MODEL
PHASE 3 — VALIDATION
PHASE 4 — EVENT PROCESSOR
PHASE 6 — DOMAIN TESTS

Prioritize getting the core application working over documentation
or visual polish.

First establish the Vite + React + TypeScript project and required
frontend/testing dependencies.

Then immediately implement the core domain model and event-processing
engine.

The domain engine is the highest priority.

Implement:

- Event types
- EventAction
- Event outcomes
- PendingParcel
- CollectedParcel
- HandoverResult
- Validation errors
- Complete-table validation
- ARRIVE processing
- COLLECT processing
- pending/collected/seen/active-code state
- deterministic source-order processing
- selectors/summary

Use the exact P11 rules and acceptance scenarios from the original
problem statement.

Then write the Vitest tests for the domain logic.

The built-in six-event example MUST be tested as the canonical oracle.

Also test:

1. Corrected E03 pickup code
2. E06 active-code collision
3. Empty input
4. Duplicate event ID
5. Invalid pickup code
6. Source-order processing
7. Successful collection
8. Failed collection
9. Duplicate parcel
10. Other structural validation cases required by P11

IMPORTANT:

Do NOT implement:

- backend
- API
- database
- Redis
- Docker
- authentication
- network service

Those are explicitly outside the P11 implementation.

Do NOT spend time on:

- SYSTEM-DESIGN.md
- README polish
- visual polish
- Motion
- Bklit
- Playwright
- deployment

until the domain engine and its tests are working.

After implementing the core logic:

1. Run the domain tests.
2. Run TypeScript/build checks.
3. Fix issues.
4. Commit the completed work as a Git checkpoint.
5. Then proceed to the next implementation phase.

Do not stop after merely describing what should be done.

WRITE THE CODE NOW.

Only stop and ask me if you hit the Rule-of-3 condition or a genuine
specification ambiguity that materially changes the implementation.
````

## 4. Continue through remaining phases without stopping

**Timestamp:** 2026-08-23 03:26:45 IST  
**Context / outcome:** The explicit "add comments everywhere" instruction, scoped to this project because the candidate needs to explain the code live in an interview. Produced commit `0080805` (Phases 7-12) and follow-on commits through Phase 16. Logged as prompt #3 in `docs/PROMPTS.md`.

````text
Continue straight through the remaining phases without stopping, but add comments everywhere because in my interview i have to do live changes/modifications so i need to be thorough with the code
````

## 5. "how to run this?"

**Timestamp:** 2026-08-23 04:03:32 IST  
**Context / outcome:** A direct clarifying question — answered by walking through `npm run dev`.

````text
how to run this?
````

## 6. Confirms scope before a demo/verification pass

**Timestamp:** 2026-08-23 04:04:19 IST  
**Context / outcome:** Short confirmation that the whole project should already be built end-to-end as specified, before further verification proceeds.

````text
yes if the whole project is built end to end as specified
````

## 7. Focused final polish pass (functionality lock-in)

**Timestamp:** 2026-08-23 04:08:11 IST  
**Context / outcome:** Explicitly forbids redesign/architecture changes; asks for acceptance-scenario verification, chart-total clarity, Shelf Map derivation check, accessibility/responsive/keyboard/reduced-motion checks, and a console-warning sweep. Produced commit `6e1d1a3`.

````text
The core implementation is now working and visually solid.

Do NOT redesign the application or change the architecture.

Perform a focused final polish pass only.

1. Verify the canonical six-event P11 sample remains the reset/default
   state.
2. Verify all acceptance scenarios still pass.
3. Check that the summary visualization does not misleadingly imply
   that 4 is the total number of processed events when rejected events
   exist.
4. Strengthen the visual hierarchy so the Final Handover Board is the
   primary result.
5. Add subtle purposeful Motion transitions where they improve
   comprehension.
6. Verify the Shelf Map is genuinely derived from final pending state.
7. Verify Bklit is used meaningfully if it is currently included.
8. Check accessibility, responsive behavior, keyboard navigation and
   reduced-motion behavior.
9. Check browser console for warnings/errors.
10. Run all tests and build.

Do not add backend, database, Redis, Docker, API, authentication,
or any other functionality outside P11.

Do not perform a large refactor.

Do not change domain behavior unless a test demonstrates that the
current behavior violates the P11 specification.

If everything already satisfies these requirements, leave it alone.
````

## 8. Major visual design pass — "Operations Console" identity

**Timestamp:** 2026-08-23 04:14:30 IST  
**Context / outcome:** A 31-section design brief moving the UI away from a "generic AI-generated dark SaaS dashboard" toward a purpose-built logistics console, while explicitly preserving all P11 domain behavior. Produced commit `9f11e21`.

````text
The functionality is now solid. We need a major VISUAL DESIGN PASS,
not a feature expansion.

The current UI is functional but looks like a generic AI-generated
dark SaaS dashboard. We need to give it a distinctive visual identity
while preserving all existing P11 behavior and architecture.

DO NOT rewrite the domain logic.
DO NOT add backend/database/API/Redis/Docker.
DO NOT add random features.
DO NOT simply add gradients, glassmorphism, shadows, or more cards.

New visual direction:

"HOSTEL PARCEL DESK / OPERATIONS CONSOLE"

The application should feel like a purpose-built logistics/operations
interface rather than a generic SaaS dashboard.

CORE DESIGN PRINCIPLE:

Make the application's state machine visually understandable.

The user should be able to visually follow:

Event → Parcel → Shelf → State → Summary

Everything should feel like one connected system.

1. REWORK THE VISUAL HIERARCHY

Make the Final Handover Board the visual hero.

Hierarchy:

Header
→ Handover status / summary
→ Current Handover Board / Shelf Map
→ Event Replay Timeline
→ Editable Event Log

The event table should be an editing mechanism, not the visual hero.

2. REMOVE GENERIC DASHBOARD FEEL

Reduce the number of individual cards.

Avoid:

- generic SaaS cards
- excessive rounded containers
- giant gradients
- excessive shadows
- glassmorphism
- neon effects
- random decorative elements
- unnecessary charts

Use strong typography, whitespace, dividers, alignment, and hierarchy.

3. CREATE A DISTINCTIVE VISUAL IDENTITY

Use a dark graphite/ink base rather than absolute black.

Use one strong operations-oriented accent color.

Use semantic success/rejection colors sparingly.

Introduce extremely subtle environmental texture/grid/lighting if
appropriate.

The design should feel tactile and operational, not futuristic AI.

4. REDESIGN THE SUMMARY

Do not use four generic cards.

Create a typographic operational summary:

03 PENDING
01 COLLECTED
02 REJECTED
06 EVENTS

Large numbers.
Small labels.
Strong alignment.
Minimal containers.

If a visualization is retained, ensure it represents ALL processed
events correctly and does not misleadingly imply that 4 is the total
when 6 events were processed.

5. MAKE THE SHELF MAP A MAJOR VISUAL ELEMENT

Turn the shelf map into a proper spatial shelf visualization.

Show shelf positions and occupied/unoccupied states.

Pending parcels should appear as physical parcel-like cards/labels
inside their corresponding shelf.

Example:

A1 → P01 / ASHA
A2 → P03 / CHEN
B2 → P04 / DIVYA

The visualization MUST derive entirely from final pending state.

There must be no second source of parcel state.

6. MAKE PARCELS FEEL LIKE PARCELS

Use compact parcel-label/card treatments.

Display:

Parcel ID
Student
Shelf
Pickup code

The visual language should resemble physical parcel labels or an
operations board.

Do not use cartoonish illustrations.

7. CREATE AN EVENT REPLAY TIMELINE

Instead of treating outcomes only as rows, create a visual timeline:

E01 → E02 → E03 → E04 → E05 → E06

with:

ARRIVED
ARRIVED
REJECTED
ARRIVED
COLLECTED
ARRIVED

Use Motion.dev to animate event replay when Run Handover is pressed.

The animation should communicate actual state transitions.

8. CONNECT THE UI

The Event Log, Event Timeline, Parcel Board, Shelf Map and Summary
must feel like views of the SAME state.

Hovering/selecting an event should highlight its parcel.

Selecting a parcel should identify/highlight its source event.

Selecting a shelf should identify the parcel occupying it.

Do not create duplicate state to achieve this.

Use IDs/references into the existing domain result.

9. MAKE STATE TRANSITIONS VISUAL

When an ARRIVE event succeeds:

Event → Parcel appears on shelf.

When COLLECT succeeds:

Parcel moves from Pending → Collected.

When an event is rejected:

Show the rejection reason and visually communicate that state
remained unchanged.

For example:

PICKUP_CODE_MISMATCH
expected K7M2
received ZZZZ
STATE UNCHANGED

This should be visually clear.

10. RUN HANDOVER SHOULD FEEL LIKE AN OPERATION

When clicked:

Show a concise processing/replay state.

Replay events sequentially with Motion.

Update the board as events are processed.

Finish with:

HANDOVER COMPLETE

Then settle into the final state.

Do not make the animation excessively slow.

Respect prefers-reduced-motion.

11. MICRO-INTERACTIONS

Add subtle interactions:

- parcel hover
- shelf hover
- event hover
- selected event ↔ selected parcel
- successful collection transition
- rejection feedback
- summary number transition

Keep animations restrained and professional.

12. TYPOGRAPHY

Create stronger typographic hierarchy.

Use a distinctive display treatment for:

PARCELDESK
major counts
section headings

Use a highly readable UI font for data and controls.

Do not use typography purely for decoration.

13. BKLIT

Use Bklit only where it genuinely improves the visualization.

Do not add generic analytics charts.

Prefer using visualization to communicate actual parcel/shelf/handover
state.

14. RESPONSIVENESS

Preserve desktop quality.

Ensure the redesigned board remains usable on tablet/narrow screens.

15. ACCESSIBILITY

Preserve:

- keyboard navigation
- visible focus
- semantic structure
- contrast
- reduced motion
- non-color-only status communication

16. MOST IMPORTANT

Do not make this look like:

"another dark AI SaaS dashboard."

Make it look like:

"a real internal operations tool designed specifically for a hostel
parcel desk."

Before changing code, inspect the current implementation and identify
which existing components can be restyled/recomposed instead of
rewritten.

Do not modify domain behavior.

After implementation:

- run all tests
- run build
- check browser console
- verify all P11 acceptance scenarios
- verify no warnings
- verify the UI remains functional

If the current implementation already does something well, preserve it.

Focus the work on VISUAL DESIGN, INTERACTION DESIGN, and INFORMATION
HIERARCHY.
````

## 9. (reference screenshot attached, no caption text)

**Timestamp:** 2026-08-23 04:32:35 IST  
**Context / outcome:** An image-only message — a screenshot handed to the agent as visual reference, no accompanying text.

````text
[Image: original 390x2216, displayed at 352x2000. Multiply coordinates by 1.11 to map to original image.]
````

## 10. Reference-image-driven final UI implementation pass

**Timestamp:** 2026-08-23 05:48:58 IST  
**Context / outcome:** Points at `reference/final-ui.png` as the visual source of truth (layout/typography/color/composition) while explicitly keeping the P11 problem statement as the functional source of truth, and explicitly forbidding fabricated data or invented features. Produced commit `82b864d`.

````text
IMPORTANT VISUAL REFERENCE

The repository contains the definitive visual reference at:

reference/final-ui.png

You MUST inspect this image before implementing the UI.

Use it as the visual source of truth for:

- layout
- proportions
- spacing
- typography
- font
- colors
- background
- borders
- component placement
- chart placement
- Event Log placement
- Handover Board placement
- Shelf Map placement
- Event Timeline placement
- button styling
- overall visual hierarchy

Do not invent a different design after inspecting it.

The screenshot is a visual reference only.
The P11 problem statement remains the functional source of truth.

Do not reproduce the screenshot using hardcoded pixel positioning.
Recreate the design using proper responsive React components and CSS.


# FINAL IMPLEMENTATION PROMPT — PARCEL DESK
## P11 Frontend Implementation + Exact Visual Recreation

We are now implementing the FINAL UI for the P11 problem.

The attached/reference screenshot is the definitive VISUAL DESIGN
REFERENCE for the application.

The original P11 problem statement remains the definitive FUNCTIONAL
SPECIFICATION.

You must follow both:

1. P11 specification → determines what the application is allowed to
   do and how the event-processing logic works.

2. The supplied final UI screenshot → determines the visual composition,
   layout, hierarchy, typography, colors, spacing, background,
   component arrangement, and overall visual language.

DO NOT invent a different design.

DO NOT redesign the interface.

DO NOT "improve" the visual direction into another SaaS dashboard.

Your job is to reproduce the supplied design as faithfully as possible
while connecting it to the existing P11 implementation.

============================================================
## 1. ABSOLUTE FUNCTIONAL CONSTRAINT
============================================================

This is the P11 problem.

The actual implementation MUST remain frontend-only and in-memory.

DO NOT introduce:

- backend
- API
- database
- PostgreSQL
- Redis
- authentication
- network services
- Docker
- persistence
- cloud services
- user accounts
- notifications
- booking systems
- delivery routing
- external data sources

The event log is the source of truth for a single in-memory handover
run.

All derived UI state must come from the existing domain-processing
logic.

Do not create a second parcel state store inside the UI.

Do not duplicate domain logic inside React components.

The existing pure TypeScript event processor remains authoritative.

============================================================
## 2. VISUAL SOURCE OF TRUTH
============================================================

The supplied screenshot is the target design.

Reproduce its:

- overall composition
- two-column layout
- section positioning
- proportions
- typography hierarchy
- font
- dark checked/grid background
- colors
- borders
- spacing
- button treatment
- table styling
- metric styling
- timeline styling
- shelf map styling
- handover board styling
- rejection styling
- footer
- responsive behavior as closely as practical

The final application should look like the supplied screenshot, not
like a generic interpretation of it.

If you have to choose between your own design preference and the
reference screenshot, ALWAYS choose the reference screenshot.

============================================================
## 3. KEEP THE EXISTING FONT EXACTLY
============================================================

THIS IS CRITICAL.

The current project already has the desired typography.

DO NOT replace the font.

DO NOT introduce a new Google Font.

DO NOT use Inter, Roboto, Geist, Manrope, Poppins, Space Grotesk, or
another substitute unless that font is already the project's existing
font.

Preserve the current font family and font stack exactly.

Preserve the existing:

- letter spacing
- uppercase treatment
- heading weight
- monospace/data treatment
- metric typography
- table typography

The screenshot's typography is an intentional part of the design.

DO NOT change it simply because another font seems more modern.

============================================================
## 4. KEEP THE BACKGROUND EXACTLY
============================================================

THIS IS ALSO CRITICAL.

The current dark checked/grid background is part of the product's
identity.

KEEP IT.

The background should remain:

- very dark
- subtle
- technical
- grid/checkered
- low contrast
- non-distracting

DO NOT replace it with:

- gradients
- glassmorphism
- plain black
- animated particle backgrounds
- glowing blobs
- purple/blue AI gradients
- star fields
- excessive noise
- a completely different texture

The grid should remain subtle enough that content remains dominant.

If the existing implementation already contains the correct background,
preserve its implementation rather than recreating it unnecessarily.

============================================================
## 5. OVERALL PAGE STRUCTURE
============================================================

The final page should use the following composition:

HEADER
↓
TOP STATUS / METRICS + EVENTS-OVER-TIME VISUALIZATION
↓
LEFT: HANDOVER BOARD
RIGHT: EVENT LOG
↓
LEFT: SHELF MAP
RIGHT: EVENT LOG continues / occupies its panel
↓
LEFT: EVENT TIMELINE + REJECTED EVENTS
↓
FOOTER

The major visual concept is:

                 ┌─────────────────────┐
                 │ STATUS │ DATA CHART │
                 └─────────────────────┘

                 ┌──────────┬───────────┐
                 │          │           │
                 │ HANDOVER │ EVENT LOG │
                 │  BOARD   │           │
                 │          │           │
                 ├──────────┤           │
                 │ SHELF MAP│           │
                 │          │           │
                 ├──────────┤           │
                 │ TIMELINE │           │
                 │ + ERRORS │           │
                 └──────────┴───────────┘

The right-side Event Log should remain a major persistent panel.

This avoids unnecessary vertical scrolling on a standard desktop
viewport.

============================================================
## 6. HEADER
============================================================

Reproduce the screenshot's header.

Brand:

PARCEL DESK

Subtitle:

HOSTEL OPERATIONS CONSOLE

Supporting text:

Run the handover to process events and view the final board state.

On the right:

[ ▶ RUN HANDOVER ]    [ RESET ]

IMPORTANT:

Do NOT add:

- settings icon
- profile icon
- notifications
- fake user information
- fake "Desk A"
- fake "Handover 07"
- fake session metadata
- fake timestamps
- fake operational information

Those are not required by P11.

Only display information that is actually derived from the application
or explicitly required by the problem.

============================================================
## 7. TOP METRICS
============================================================

Use the four large metrics shown in the reference:

PENDING
COLLECTED
REJECTED
EVENTS

They should be visually strong, simple, and editorial.

Example:

02              01              02              06
PENDING         COLLECTED       REJECTED        EVENTS

Do NOT place additional small metric boxes next to or underneath these.

Do NOT add redundant metric cards.

Do NOT add another Pending/Collected/Rejected visualization beside
these metrics.

The four primary metrics are sufficient.

Use the same semantic visual language:

Pending   → existing amber/orange accent
Collected → existing green accent
Rejected  → existing red accent
Events    → neutral/light

The values must be derived from the actual handover result.

============================================================
## 8. EVENTS-OVER-TIME VISUALIZATION
============================================================

The right side of the top section should contain the
"EVENTS OVER TIME (RUN)" visualization from the reference.

This replaces the earlier circular/donut visualization.

It should occupy the otherwise unused horizontal header space.

The visualization should represent the actual event-processing run.

Use:

- horizontal event sequence
- E01 ... E06 or however many events exist
- Pending
- Collected
- Rejected

with the same visual treatment shown in the reference.

The chart MUST NOT invent data.

It must be derived from actual event-processing results.

The chart should update when Run Handover is executed.

Before a run, display an appropriate empty state rather than fabricated
historical data.

Use Motion.dev for subtle chart transitions where appropriate.

Do not animate merely for decoration.

============================================================
## 9. HANDOVER BOARD
============================================================

The Handover Board is one of the most important sections.

Heading:

HANDOVER BOARD

Subtitle:

Who's still on the shelf, who's been collected.

Divide it into:

PENDING
COLLECTED

Pending parcels should display:

- Parcel ID
- Student
- Pickup code
- Shelf

Collected parcels should display the relevant P11 information.

The board must be derived from the final processing result.

DO NOT create another state store.

DO NOT hardcode parcels.

DO NOT invent parcel information.

The visual treatment should match the reference:

- clean parcel cards
- restrained borders
- dark surfaces
- amber pending accent
- green collected accent
- strong Parcel ID
- secondary metadata

Do not add excessive decorative containers.

============================================================
## 10. SHELF MAP
============================================================

The Shelf Map should appear underneath the Handover Board.

Heading:

SHELF MAP

Subtitle:

Live view of where pending parcels are kept.

Show the shelves required by the actual event data.

Occupied shelves should display their pending parcel.

Empty shelves should remain visually identifiable as empty.

The shelf map MUST be derived directly from the final pending board.

There must be exactly one source of truth.

The shelf visualization should preserve the visual language of the
reference:

- compact shelf cells
- occupied indicator
- empty state
- parcel information
- dark grid/surface
- amber emphasis for occupied pending shelves

Do not turn this into a giant 3D scene.

The parcel/shelf relationship should remain clear.

============================================================
## 11. EVENT TIMELINE
============================================================

Create the horizontal event timeline shown in the reference.

Example:

E01 • P01 → E02 • P02 → E03 • P01 → E04 • P03
→ E05 • P02 → E06 • P04

Each event should visually communicate its outcome:

ARRIVED
COLLECTED
PICKUP_CODE_MISMATCH
PARCEL_NOT_PENDING
etc.

Use:

- green for successful outcomes
- red for rejected outcomes
- neutral structure
- arrows between events

The timeline must be derived from the actual outcomes.

============================================================
## 12. REJECTED EVENTS
============================================================

Under the event timeline, show:

REJECTED EVENTS — STATE UNCHANGED

For each rejected event, show:

- Event ID
- rejection reason
- relevant explanation
- state-change consequence

For example:

E03
PICKUP_CODE_MISMATCH
expected K7M2 · received ZZZZ
Parcel P01 remains on shelf A1

and:

E06
PARCEL_NOT_PENDING
No pending parcel with this ID — nothing to collect.
No state change

The number of rejected events must dynamically match the result.

Do NOT show only one rejection if two exist.

Do NOT create a single "selected rejection" card that hides the others.

All rejected events should remain visible in the rejection list.

============================================================
## 13. EVENT LOG
============================================================

The Event Log should occupy the right side of the main application,
as shown in the reference.

Heading:

EVENT LOG

Subtitle:

Source of truth for the next run — edit freely.

Controls:

[ + ADD EVENT ]    [ RUN HANDOVER ]

The table should contain the required P11 fields:

- #
- Event ID
- Action
- Parcel ID
- Student
- Pickup Code
- Shelf
- delete action

Rows must remain editable.

Users must be able to:

- add events
- edit events
- delete events
- change ARRIVE/COLLECT
- modify IDs
- modify pickup codes
- modify shelf/student data where applicable

Do not change P11 validation behavior.

============================================================
## 14. RUN HANDOVER
============================================================

Run Handover is the primary action.

When clicked:

1. Validate the complete event table.
2. If validation fails, fail fast according to P11.
3. Do not produce partial output.
4. If valid, process events in source order.
5. Produce outcomes.
6. Update final board.
7. Update metrics.
8. Update shelf map.
9. Update timeline.
10. Update rejection information.
11. Update event visualization.

Use Motion.dev to make the transition visually polished.

The animation should communicate the actual state transitions.

Do NOT make the animation excessively long.

Do NOT animate fabricated events.

============================================================
## 15. MOTION / INTERACTION DESIGN
============================================================

Motion.dev should be used purposefully.

Do NOT simply make every card fade in.

Important interactions:

### ARRIVE

Event resolves successfully.

Parcel visually appears/highlights in the corresponding shelf.

### COLLECT

Successful collection should communicate:

Pending
   ↓
Collected

The parcel may visually transition between the two states.

### REJECTION

A rejected event should communicate:

Event attempted
   ↓
Rejected
   ↓
State unchanged

Use a subtle shake/highlight for the rejection.

### TIMELINE

Events may resolve sequentially during Run Handover.

### METRICS

Numbers can transition smoothly when results are produced.

### SHELF

The affected shelf can briefly highlight when its parcel is processed.

All animations must respect:

prefers-reduced-motion

Do not make the UI distracting.

============================================================
## 16. BKLIT
============================================================

Bklit may be used where it genuinely improves the data visualization.

Do not add random Bklit components simply to demonstrate the library.

The Events Over Time visualization should remain visually consistent
with the reference.

If Bklit is used, integrate it cleanly into the existing design rather
than allowing its default styling to change the visual language.

============================================================
## 17. NO UNNECESSARY UI
============================================================

Do NOT add:

- sidebar navigation
- tabs
- settings
- profile
- notifications
- fake timestamps
- fake desk identifiers
- fake handover numbers
- search
- filters
- pagination
- authentication
- analytics dashboards
- extra charts
- activity feeds
- maps
- unnecessary modals

Every UI element must have a clear purpose in the P11 workflow.

============================================================
## 18. RESPONSIVE DESIGN
============================================================

Desktop is the primary target because the supplied design is a
desktop operations console.

However, the layout must gracefully adapt to narrower screens.

On smaller screens:

- right Event Log can move below the primary board
- two-column areas can collapse
- table should remain usable
- controls should remain accessible
- no horizontal page overflow

Do not destroy the desktop composition merely to optimize for mobile.

============================================================
## 19. ACCESSIBILITY
============================================================

Preserve:

- keyboard navigation
- visible focus states
- semantic HTML
- accessible form labels
- accessible buttons
- adequate contrast
- status information not communicated solely through color
- reduced-motion support

Icons must have appropriate accessible labels where needed.

============================================================
## 20. DOMAIN ARCHITECTURE
============================================================

The architecture remains:

Editable Event Log
        ↓
Validation
        ↓
Pure TypeScript Event Processor
        ↓
Handover Result
        ↓
Selectors
        ↓
React UI

The domain layer MUST NOT import React.

Keep:

- validation
- reducer/event processing
- result derivation
- selectors

framework-independent.

React should render the result.

============================================================
## 21. TESTING
============================================================

Do not sacrifice existing tests.

All P11 domain tests must continue passing.

Verify:

- canonical six-event scenario
- corrected E03 pickup code
- active-code collision
- duplicate event ID
- invalid pickup code
- empty table
- source-order processing
- successful ARRIVE
- successful COLLECT
- failed COLLECT
- parcel-not-pending
- validation fail-fast behavior
- no partial output

Add UI/E2E tests where appropriate.

Playwright should verify the important user flow:

1. Load sample.
2. Run handover.
3. Verify metrics.
4. Verify board.
5. Verify shelf map.
6. Verify timeline.
7. Verify rejected events.
8. Modify an event.
9. Run again.
10. Verify updated result.
11. Reset.
12. Verify reset state.

============================================================
## 22. RESET
============================================================

The header RESET button must:

- restore the canonical initial event data
- clear processed results
- clear outcomes
- clear board state
- clear derived metrics
- clear timeline result
- return the UI to its initial state

It must NOT reload the page.

It must NOT persist anything.

It must NOT create a new backend state.

============================================================
## 23. IMPORTANT VISUAL DETAILS
============================================================

Preserve the following from the reference screenshot:

- dark checked/grid background
- existing font
- large editorial metric numbers
- restrained borders
- dark panel surfaces
- orange/amber primary accent
- green success accent
- red rejection accent
- white/gray neutral typography
- compact uppercase section labels
- clean two-column composition
- Event Log on the right
- Handover Board on the left
- Shelf Map on the left
- Event Timeline on the left
- Rejected Events below timeline
- Events Over Time chart in the top-right
- Run Handover button
- Reset button
- no settings icon
- no sidebar
- no fake navigation
- no unnecessary UI

Do not replace the background.

Do not replace the font.

Do not replace the overall visual identity.

============================================================
## 24. IMPORTANT: DO NOT TRUST THE SCREENSHOT FOR FUNCTIONAL LOGIC
============================================================

The screenshot is a VISUAL reference.

The P11 problem statement is the FUNCTIONAL reference.

If the screenshot contains example data that conflicts with the actual
P11 specification, follow the P11 specification.

Do not modify the event processor simply to make the screenshot's
example values work.

The visual layout must reproduce the screenshot, but the actual
application behavior must remain correct according to P11.

============================================================
## 25. IMPLEMENTATION APPROACH
============================================================

Before changing the application:

1. Inspect the current code.
2. Identify existing components.
3. Identify existing domain logic.
4. Identify existing styles/font/background.
5. Reuse existing functionality wherever possible.

Do NOT rewrite working domain logic just to achieve the new visual
design.

Prefer:

existing domain logic
        +
existing state
        +
new presentation components/styles

over a complete rewrite.

============================================================
## 26. VISUAL QUALITY BAR
============================================================

The final result should NOT look like:

- a generic admin dashboard
- a generic AI-generated SaaS application
- a template
- a collection of unrelated cards
- a Dribbble concept that doesn't actually work

It should feel like a real purpose-built internal operations tool.

The design language should communicate:

HOSTEL PARCEL DESK
+
LOGISTICS
+
STATE MACHINE
+
OPERATIONAL CLARITY

The visual polish must come from:

- typography
- spacing
- alignment
- hierarchy
- restrained color
- meaningful animation
- information relationships

NOT from excessive gradients or decorative effects.

============================================================
## 27. DO NOT OVERENGINEER
============================================================

Do not introduce unnecessary dependencies.

Do not introduce a new state-management library.

Do not introduce a new charting library if the current stack can
support the visualization.

Do not introduce Three.js.

Do not introduce a backend.

Do not introduce a database.

Do not introduce Docker.

Do not introduce unnecessary abstractions.

Keep the implementation understandable enough to explain during a
30–40 minute technical interview.

============================================================
## 28. GIT CHECKPOINTS
============================================================

At the successful completion of the implementation phase:

1. Run tests.
2. Run TypeScript checks.
3. Run production build.
4. Check browser console.
5. Verify no React warnings.
6. Verify no TypeScript warnings.
7. Verify no ESLint warnings.
8. Inspect git diff.
9. Commit the working implementation.

Use an appropriate commit message such as:

feat: implement final ParcelDesk operations UI

Do not commit broken code.

============================================================
## 29. ZERO-WARNING POLICY
============================================================

A successful build alone is NOT enough.

Before declaring completion:

- zero TypeScript errors
- zero ESLint warnings
- zero React key warnings
- zero browser console errors
- zero hydration warnings
- zero failed tests
- clean production build

============================================================
## 30. RULE OF 3 — ANTI-LOOP
============================================================

If you attempt to fix the same failing test, build error, type error,
or runtime issue three times without success:

STOP.

Do not attempt a fourth blind fix.

Report:

1. exact error
2. what you attempted
3. why it failed
4. what information is needed

Then ask the human.

Do not burn tokens repeatedly applying speculative fixes.

============================================================
## 31. FINAL INSTRUCTION
============================================================

DO NOT spend a long response explaining the plan.

We have already decided the architecture and visual direction.

Inspect the existing implementation briefly.

Then START IMPLEMENTING.

The objective is to make the current localhost P11 application match
the supplied final screenshot as closely as possible while preserving
the exact P11 functionality.

The screenshot is the visual target.

The P11 problem statement is the functional target.

The existing font MUST remain.

The existing dark checked/grid background MUST remain.

The Event Log belongs on the RIGHT.

The Handover Board, Shelf Map, Event Timeline and rejection details
belong on the LEFT.

The Events Over Time visualization belongs in the TOP RIGHT.

The four primary metrics belong in the TOP LEFT.

There must be NO settings icon.

There must be a RESET button.

There must be NO fake Desk A / Handover 07 / session metadata.

There must be NO sidebar.

There must be NO unnecessary metrics beside the main metrics.

There must be NO unnecessary UI.

BUILD IT NOW.
````

## 11. (reference screenshot attached, no caption text)

**Timestamp:** 2026-08-23 06:04:24 IST  
**Context / outcome:** A second image-only reference message during the same visual pass.

````text
[Image: original 820x2217, displayed at 740x2000. Multiply coordinates by 1.11 to map to original image.]
````

## 12. Final visual refinement pass (compact metrics, chart, line style)

**Timestamp:** 2026-08-23 06:10:47 IST  
**Context / outcome:** Explicitly "DO NOT rewrite the application" — a scoped visual refinement only. Produced commit `dd55023`.

````text
We are now doing a FINAL VISUAL REFINEMENT PASS.

DO NOT rewrite the application.
DO NOT change the architecture.
DO NOT change the domain logic.
DO NOT change the font.
DO NOT change the dark checked/grid background.
DO NOT introduce new UI.
DO NOT redesign the page.

The current implementation is very close.

Make ONLY the following corrections.

============================================================
1. TOP METRICS MUST BE ONE HORIZONTAL ROW
============================================================

The four metrics must appear horizontally in a single row:

03        01        01        06
PENDING   COLLECTED REJECTED  EVENTS

Do NOT arrange them as a 2x2 grid.

Do NOT give each metric a large individual card.

Use the same editorial metric style already established.

The metrics should occupy approximately the left 45–50% of the top
status panel.

The Events Over Time visualization occupies the right 50–55%.

============================================================
2. EVENTS OVER TIME MUST BE COMPACT
============================================================

The chart currently occupies too much vertical space.

Reduce its height significantly.

The entire top status section should feel like ONE compact horizontal
operations panel:

LEFT:
4 metrics

RIGHT:
Events Over Time

Do not let the chart dominate the page.

============================================================
3. DO NOT SMOOTH THE DATA
============================================================

This is important.

The current chart uses smooth/curved interpolation.

Remove that.

Events are discrete state transitions, so the chart must use straight
line segments between event points.

DO NOT use spline interpolation.
DO NOT use bezier curves.
DO NOT visually imply continuous movement between discrete events.

Use discrete points connected by straight segments.

The x-axis should represent:

E01 E02 E03 E04 E05 E06

The values must be derived from the actual processing result.

For the canonical six-event example:

Pending:
E01 = 1
E02 = 2
E03 = 2
E04 = 3
E05 = 2
E06 = 3

Collected:
E01 = 0
E02 = 0
E03 = 0
E04 = 0
E05 = 1
E06 = 1

Rejected:
E01 = 0
E02 = 0
E03 = 1
E04 = 1
E05 = 1
E06 = 1

Do NOT hardcode these values in the implementation.

These values are provided only to verify that the chart behavior is
correct for the canonical sample.

============================================================
4. PRESERVE THE EXISTING VISUAL LANGUAGE
============================================================

Keep exactly:

- current font
- current font weights
- current letter spacing
- current dark checked/grid background
- current amber/orange
- current green
- current red
- current neutral gray
- current borders
- current panel styling
- current button styling

Do not replace anything with a new design system.

============================================================
5. PRESERVE THE CURRENT MAIN LAYOUT
============================================================

Keep:

TOP:
Metrics + Events Over Time

BELOW:

LEFT                         RIGHT
──────────────────────────────────────
Handover Board               Event Log
Shelf Map                    Event Log
Event Timeline
Rejected Events

The Event Log remains a large right-side panel.

Do not move it below the board.

============================================================
6. KEEP THE EXISTING GOOD COMPONENTS
============================================================

Do NOT rewrite:

- Handover Board
- Shelf Map
- Event Timeline
- Rejected Events
- Event Log
- event processor
- validation
- state management

Only adjust the layout necessary to achieve the approved composition.

============================================================
7. FINAL VISUAL TARGET
============================================================

The top should visually read approximately as:

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  03       01       01       06    │ EVENTS OVER TIME       │
│  PENDING  COLLECTED REJECTED EVENTS│                       │
│                                    │  ─╮                    │
│                                    │   ╰─╮                  │
│                                    │     ╰──╮               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Then:

┌──────────────────────────────┬──────────────────────────────┐
│ HANDOVER BOARD               │ EVENT LOG                    │
│                              │                              │
│ Pending       Collected      │ editable event table        │
│                              │                              │
├──────────────────────────────┤                              │
│ SHELF MAP                    │                              │
│                              │                              │
├──────────────────────────────┤                              │
│ EVENT TIMELINE               │                              │
│                              │                              │
│ REJECTED EVENTS              │                              │
└──────────────────────────────┴──────────────────────────────┘

The page should feel compact, dense, intentional and operational.

============================================================
8. DO NOT ADD ANYTHING
============================================================

No:

- settings
- sidebar
- navigation
- fake metadata
- additional metrics
- additional charts
- new cards
- new sections
- new functionality

This is a refinement pass, NOT a redesign.

After making these changes:

1. run the tests
2. run the production build
3. check the browser console
4. verify the canonical six-event scenario
5. verify the chart values
6. verify that the four metrics are horizontal
7. verify that the chart uses straight segments
8. verify that the page remains compact

Then stop.
````

## 13. Final layout refinement — one-viewport desktop composition

**Timestamp:** 2026-08-23 06:21:37 IST  
**Context / outcome:** A detailed layout-compaction brief targeting a dense, non-scrolling 1440x900 desktop composition. Produced commit `7d614c9`.

````text
FINAL LAYOUT REFINEMENT — ONE-VIEWPORT DESKTOP COMPOSITION

We are now doing the FINAL layout refinement pass.

The current implementation is visually very close to the approved design.

DO NOT redesign it.

DO NOT rewrite the architecture.

DO NOT change the domain logic.

DO NOT change the font.

DO NOT change the dark checked/grid background.

DO NOT introduce new functionality.

The remaining issue is primarily VERTICAL COMPOSITION.

The goal is:

ON A STANDARD DESKTOP VIEWPORT, THE ENTIRE APPLICATION SHOULD FIT
IN ONE VIEW WITHOUT PAGE-LEVEL VERTICAL SCROLLING.

Think of this as a dense operations console rather than a long webpage.

============================================================
1. PRIMARY GOAL — EVERYTHING FITS IN ONE DESKTOP VIEW
============================================================

The current page requires vertical scrolling.

Fix the layout so that the important application content fits inside
one standard desktop viewport.

Target approximately:

1440 × 900

and similar desktop dimensions.

DO NOT solve this by simply using:

overflow: hidden

or clipping content.

Everything must actually fit.

Do not hide content.

Do not create inaccessible content below the viewport.

On smaller screens where the layout genuinely cannot fit, responsive
scrolling is acceptable.

The "one page" requirement applies to the primary desktop experience.

============================================================
2. NEW FINAL DESKTOP COMPOSITION
============================================================

Use this exact high-level composition:

                         HEADER
                            │
                            ▼
                  METRICS + DATA CHART
                            │
                            ▼
              ┌─────────────┬─────────────┐
              │             │             │
              │ HANDOVER    │ SHELF MAP   │
              │ BOARD       │             │
              │             │             │
              ├─────────────┤─────────────┤
              │             │             │
              │ EVENT       │ EVENT LOG   │
              │ TIMELINE    │             │
              │             │             │
              │ REJECTIONS  │             │
              │             │             │
              └─────────────┴─────────────┘

More precisely:

LEFT COLUMN:
1. Handover Board
2. Event Timeline
3. Rejected Events

RIGHT COLUMN:
1. Shelf Map
2. Event Log

This is the final intended information architecture.

============================================================
3. HEADER
============================================================

Keep the current header exactly in spirit.

Left:

PARCEL DESK
HOSTEL OPERATIONS CONSOLE
Run the handover to process events and view the final board state.

Right:

[ ▶ RUN HANDOVER ] [ RESET ]

Do NOT add:

- settings
- profile
- navigation
- fake desk information
- fake handover number
- fake timestamps
- notifications
- extra controls

The header should remain compact.

Reduce unnecessary vertical padding if required to achieve the
one-viewport composition.

============================================================
4. TOP STATUS SECTION
============================================================

Keep the top status section.

It must contain:

LEFT:
four metrics in ONE horizontal row.

RIGHT:
Events Over Time visualization.

Layout:

┌────────────────────────────────────────────────────────────┐
│                                                            │
│ 03       01       01       06    │ EVENTS OVER TIME       │
│ PENDING  COLLECTED REJECTED EVENTS│                       │
│                                                            │
└────────────────────────────────────────────────────────────┘

Do NOT use a 2x2 metric grid.

Do NOT create individual giant cards for the metrics.

Do NOT add redundant metric visualizations.

The four metrics remain:

PENDING
COLLECTED
REJECTED
EVENTS

Keep the established colors:

Pending   = amber/orange
Collected = green
Rejected  = red
Events    = neutral

============================================================
5. MAKE THE TOP SECTION MORE COMPACT
============================================================

The current top metrics/chart section is too tall.

Reduce:

- top/bottom padding
- unnecessary whitespace
- chart height
- metric vertical spacing

Do NOT reduce the typography to an unreadable size.

The top section should feel like a compact command/status panel.

The chart should visually occupy approximately the same vertical
territory as the metrics.

============================================================
6. EVENTS OVER TIME CHART
============================================================

Keep the Events Over Time visualization.

Keep it on the RIGHT side of the top section.

Keep:

- Pending
- Collected
- Rejected
- E01...E06 event sequence
- existing color system

Use straight line segments between discrete event points.

DO NOT use smooth spline interpolation.

DO NOT make it look like continuous analog data.

Events are discrete state transitions.

Keep the chart compact.

Reduce its height substantially compared with the current version.

Do not allow the chart to dominate the entire top section.

Do not introduce another chart.

============================================================
7. LEFT COLUMN — HANDOVER BOARD
============================================================

The Handover Board must be the first major section in the LEFT
column.

Heading:

HANDOVER BOARD

Subtitle:

Who's still on the shelf, who's been collected.

Keep:

PENDING
COLLECTED

Keep the current parcel-card design.

Each parcel should show:

- Parcel ID
- Student
- Pickup code
- Shelf

Keep the existing parcel icons.

Do NOT introduce 3D objects.

Do NOT make the cards taller.

Make the cards compact enough that the entire board fits comfortably
above the timeline.

The board should remain visually prominent.

============================================================
8. RIGHT COLUMN — SHELF MAP FIRST
============================================================

THIS IS THE IMPORTANT STRUCTURAL CHANGE.

Move the Shelf Map from underneath the Handover Board to the
TOP of the RIGHT column.

The RIGHT column should begin with:

SHELF MAP

followed by:

EVENT LOG

The Shelf Map should be compact.

Use a horizontal arrangement:

A1     A2     B1     B2

Each shelf should show:

- shelf ID
- occupied/empty state
- parcel information if occupied

Example:

A1        A2        B1        B2
OCCUPIED  OCCUPIED  EMPTY     OCCUPIED

Keep the existing visual style.

Do NOT create a large shelf illustration.

Do NOT make the shelf map unnecessarily tall.

The entire shelf map should consume only the amount of vertical space
needed to communicate shelf state.

============================================================
9. RIGHT COLUMN — EVENT LOG
============================================================

The Event Log remains a major persistent panel.

It should sit BELOW the Shelf Map.

Heading:

EVENT LOG

Subtitle:

Source of truth for the next run — edit freely.

Keep:

[ + ADD EVENT ]

Remove the duplicate:

[ RUN HANDOVER ]

because the primary Run Handover action already exists in the header.

There should be ONE primary Run Handover action in the application.

The Event Log must continue to support:

- adding events
- editing events
- deleting events
- changing action
- editing event ID
- editing parcel ID
- editing student
- editing pickup code
- editing shelf

Do not change any validation or domain behavior.

The six canonical rows should comfortably fit inside the panel without
requiring an inner vertical scrollbar.

Compact the row height slightly if necessary.

Do NOT make the table text tiny.

============================================================
10. LEFT COLUMN — EVENT TIMELINE DIRECTLY BELOW BOARD
============================================================

Move the Event Timeline directly underneath the Handover Board.

The visual hierarchy should become:

HANDOVER BOARD
        ↓
EVENT TIMELINE
        ↓
REJECTED EVENTS

The timeline should be compact and horizontal.

Example:

E01 → E02 → E03 → E04 → E05 → E06

Each event should show:

- Event ID
- Parcel ID
- outcome

Successful outcomes remain green.

Rejected outcomes remain red.

Keep the existing visual language.

Do NOT make each timeline card excessively tall.

The six events should comfortably fit in one horizontal row on desktop.

============================================================
11. REJECTED EVENTS
============================================================

Place Rejected Events immediately underneath the Event Timeline.

Heading:

REJECTED EVENTS — STATE UNCHANGED

Show ALL rejected events.

Do not show only one.

Each rejected event should show:

- event ID
- rejection reason
- explanation
- consequence

For example:

E03  PICKUP_CODE_MISMATCH
expected K7M2 · received ZZZZ
Parcel P01 remains on shelf A1

If there are two rejected events, both must appear.

Keep this section compact.

The rejection rows should be short horizontal rows rather than large
cards.

============================================================
12. REMOVE THE FOOTER
============================================================

Remove the current footer:

"All changes are in-memory only. No data is persisted."

Remove:

"Handover complete."

Remove:

"Built for hostel operations, by students."

These are not required by P11 and consume valuable vertical space.

The in-memory behavior should remain documented in the code/docs,
not occupy permanent UI space.

Do NOT replace the footer with another section.

============================================================
13. FINAL PAGE HEIGHT TARGET
============================================================

The intended desktop page should visually fit approximately like:

HEADER
~70–80px

TOP STATUS
~160–190px

MAIN CONTENT
remaining viewport

Within main content:

LEFT:
Handover Board
Event Timeline
Rejected Events

RIGHT:
Shelf Map
Event Log

There should be enough breathing room to feel polished, but no large
unused vertical gaps.

Do not stack the left column into excessive-height cards.

Do not let empty space between sections grow unnecessarily.

============================================================
14. DO NOT OVER-COMPRESS
============================================================

Important:

"One viewport" does NOT mean:

- microscopic fonts
- 8px buttons
- cramped tables
- unreadable labels
- removing meaningful whitespace

First reduce:

1. unnecessary panel padding
2. unnecessary margins
3. oversized chart height
4. oversized card heights
5. redundant controls
6. redundant footer

Only then make small spacing adjustments.

Maintain readability.

============================================================
15. PRESERVE THE VISUAL IDENTITY
============================================================

ABSOLUTELY PRESERVE:

- current font
- current font family
- current font weights
- current letter spacing
- current dark checked/grid background
- current amber/orange accent
- current green accent
- current red accent
- current neutral colors
- current borders
- current parcel icons
- current overall aesthetic

Do NOT introduce:

- gradients
- glassmorphism
- purple/blue AI styling
- new fonts
- neon effects
- excessive shadows
- giant rounded cards
- 3D scenes
- sidebar
- settings
- fake metadata
- new navigation

The current visual identity is approved.

Only refine the composition.

============================================================
16. FUNCTIONAL RULE
============================================================

DO NOT MODIFY THE P11 EVENT PROCESSING LOGIC.

Do not change:

- validation
- reducer
- event outcomes
- state transitions
- source ordering
- duplicate event handling
- pickup-code validation
- parcel state
- final board derivation

This is a PRESENTATION/LAYOUT refinement.

The existing functionality must remain intact.

============================================================
17. RESPONSIVE BEHAVIOR
============================================================

Desktop:

Use the two-column layout described above.

Smaller desktop/tablet:

Columns may collapse when genuinely necessary.

Mobile:

A vertical layout is acceptable.

Do NOT force the desktop two-column layout onto narrow screens.

However, do NOT compromise the primary desktop viewport merely to
optimize for mobile.

============================================================
18. FINAL DESKTOP INFORMATION ARCHITECTURE
============================================================

The final desktop application should read naturally in this order:

HEADER
  ↓
CURRENT HANDOVER STATUS
  ↓
┌──────────────────────┬──────────────────────┐
│                      │                      │
│ HANDOVER BOARD       │ SHELF MAP            │
│                      │                      │
├──────────────────────┤──────────────────────┤
│ EVENT TIMELINE       │ EVENT LOG            │
│                      │                      │
│ REJECTED EVENTS      │                      │
│                      │                      │
└──────────────────────┴──────────────────────┘

This should be the dominant composition.

============================================================
19. DO NOT REWRITE GOOD WORK
============================================================

Inspect the current implementation first.

Reuse the current:

- components
- state
- domain logic
- styling
- chart
- event table
- parcel cards

Make surgical layout changes.

Do NOT rebuild the application from scratch.

Do NOT create duplicate components.

Do NOT introduce unnecessary dependencies.

============================================================
20. FINAL VERIFICATION
============================================================

After implementing:

1. Run the complete test suite.
2. Run TypeScript checks.
3. Run the production build.
4. Check browser console.
5. Verify no React warnings.
6. Verify no TypeScript warnings.
7. Verify no ESLint warnings.
8. Load the canonical six-event sample.
9. Verify all four metrics.
10. Verify the chart.
11. Verify Handover Board.
12. Verify Shelf Map.
13. Verify Event Timeline.
14. Verify ALL rejected events.
15. Verify Event Log.
16. Verify Run Handover.
17. Verify Reset.
18. Verify that the standard desktop viewport does NOT require
    page-level vertical scrolling.
19. Verify that no content is clipped.
20. Verify that the Event Log does not require its own scrollbar for
    the canonical six-event scenario.

IMPORTANT:

Do not solve the no-scroll requirement by hiding overflow.

Actually make the layout fit.

============================================================
21. FINAL RULE
============================================================

This is a refinement pass.

Do not redesign.

Do not add features.

Do not add decorative UI.

Do not change the approved visual identity.

Simply make the current application:

MORE COMPACT
MORE BALANCED
MORE USABLE
MORE DENSE
AND FULLY VISIBLE IN ONE DESKTOP VIEWPORT.

Start implementing immediately.
````

## 14. Targeted fix: Event Log horizontal scrollbar

**Timestamp:** 2026-08-23 06:32:32 IST  
**Context / outcome:** A tightly scoped table-layout fix (19 explicit requirements, explicit "make only this targeted change and stop"). Produced commit `6dd168c`.

````text
Do one very small refinement to the Event Log only.

DO NOT redesign the page.
DO NOT change the layout.
DO NOT change the font.
DO NOT change the background.
DO NOT remove the delete functionality.
DO NOT change any P11 behavior.

The current Event Log table creates a horizontal scrollbar because the
combined column widths exceed the available width of the right-side
Event Log panel.

The application is intentionally designed as a one-screen desktop
operations console, so the Event Log must fit entirely inside its panel
without horizontal scrolling.

Fix the table layout.

Requirements:

1. KEEP the delete button/action column.
2. KEEP every editable field.
3. KEEP all current functionality.
4. DO NOT reduce the overall page width.
5. DO NOT create horizontal scrolling inside the Event Log.
6. DO NOT create horizontal page scrolling.
7. Keep the existing font size and typography as much as possible.
8. Compress column widths and internal cell padding instead.
9. Give the delete column a compact fixed width of approximately 32–36px.
10. Make SHELF compact.
11. Make PICKUP CODE compact.
12. Make STUDENT compact.
13. Make ACTION compact while keeping the select usable.
14. Make ID and PARCEL compact.
15. Use a controlled table layout such as table-layout: fixed where
    appropriate.
16. Ensure inputs/selects respect their column width with min-width: 0
    and width: 100%.
17. Prevent inputs from forcing their parent columns wider.
18. Preserve readable text and the current visual hierarchy.
19. If text needs truncation, use sensible truncation rather than
    overflowing the panel.

Target:

EVENT LOG
┌──────────────────────────────────────────────────────────────┐
│ #  ID  ACTION  PARCEL  STUDENT  PICKUP CODE  SHELF  DELETE  │
├──────────────────────────────────────────────────────────────┤
│ 1  E01 ARRIVE  P01     Asha     K7M2         A1      🗑     │
│ 2  E02 ARRIVE  P02     Bilal    R4Q8         B1      🗑     │
│ 3  E03 COLLECT P01     —        ZZZZ         —       🗑     │
│ ...                                                          │
└──────────────────────────────────────────────────────────────┘

The entire table must fit within the Event Log panel at the current
desktop viewport.

Do not solve this by simply shrinking the entire application.

Do not solve this by removing the delete button.

Do not solve this by adding another scrollbar.

After the change:

- run the app
- verify the table fits without horizontal scrolling
- verify every input remains editable
- verify the select remains usable
- verify delete still works
- verify the canonical six-event scenario still works
- run the production build

Make only this targeted change and stop.
````

## 15. Read-only bundle-size investigation

**Timestamp:** 2026-08-23 06:47:33 IST  
**Context / outcome:** Explicitly forbids modifying files or recommending `chunkSizeWarningLimit` be raised — diagnosis only, ahead of any fix.

````text
Perform a read-only bundle-size investigation.

The production build currently reports:

"[plugin builtin:vite-reporter]
Some chunks are larger than 500 kB after minification."

Do NOT modify any files yet.

Determine:

1. Which generated chunk exceeds 500 kB.
2. Its exact size.
3. Which dependencies/modules contribute most to that chunk.
4. Whether the large bundle is caused by an unnecessarily imported library.
5. Whether any dependency is imported globally when it could be lazy-loaded.
6. Whether the charting library or animation library is responsible.
7. Whether code splitting would materially improve the bundle.
8. Whether dynamic import() would be appropriate for any non-critical UI.
9. Whether the warning can be eliminated without hurting the current UI.

Do NOT simply recommend increasing build.chunkSizeWarningLimit.

Return:
- chunk
- size
- likely cause
- recommended solution
- expected trade-offs

Do not change any files.
````

## 16. Diagnose a PowerShell reporter-plugin error blocking chunk-size output

**Timestamp:** 2026-08-23 06:56:09 IST  
**Context / outcome:** Asks the agent to isolate the real Vite `>500 kB` warning from unrelated PowerShell tooling noise, without changing the application.

````text
The Vite build succeeds, but the vite-reporter plugin is throwing a PowerShell NativeCommandError and I'm not getting the normal dist/assets chunk size output.

Do not change the application.

1. Inspect the Vite configuration.
2. Temporarily remove/disable the vite-reporter plugin only.
3. Run npm run build again.
4. Show me the exact generated dist/assets/*.js sizes and identify which chunk exceeds 500 KB.
5. Do not suppress the warning or increase chunkSizeWarningLimit yet.
````

## 17. Pastes the real chunk-size warning; "FIX THIS"

**Timestamp:** 2026-08-23 07:12:53 IST  
**Context / outcome:** The actual Vite warning output, pasted verbatim, followed by the fix request. Produced commit `229ff80` (lazy-loaded chart + react-vendor chunk split), after the agent rejected the shortcut of simply raising the warning threshold.

````text
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
FIX THIS
````

## 18. "have you pushed everything to github?"

**Timestamp:** 2026-08-23 07:19:11 IST  
**Context / outcome:** Deployment-status check.

````text
have you pushed everything to github?
````

## 19. Confirms push; requests .gitignore and README

**Timestamp:** 2026-08-23 07:19:39 IST  
**Context / outcome:** Produced commit `70c6c6d`.

````text
yes, also make a .gitignore and a readme.md
````

## 20. Documentation + interview-preparation pass — decisions.md / flow.md / questions.md

**Timestamp:** 2026-08-23 14:33:48 IST  
**Context / outcome:** A read-only "code-archaeology" task, explicitly restricted to creating exactly three files (`decisions.md`, `flow.md`, `questions.md`) with no application-code changes, and an explicit instruction to label unverified reasoning as "Reasonable alternative" or "Implementation inference" rather than invent history. This is the origin of the root-level `decisions.md`/`flow.md`/`questions.md` files referenced throughout `DEVELOPMENT.md`/`PRESENTATION.md`.

````text
# FINAL DOCUMENTATION + INTERVIEW PREPARATION PASS
# P11 — HOSTEL PARCEL-DESK HANDOVER BOARD

You are now performing a documentation and interview-preparation pass
over the EXISTING implementation of the P11 Hostel Parcel-Desk
Handover Board.

============================================================
CRITICAL RULE — DO NOT MODIFY THE APPLICATION
============================================================

This is a READ-ONLY CODE-ARCHAEOLOGY task.

DO NOT modify:

- React components
- TypeScript/JavaScript source
- CSS
- Tailwind configuration
- Vite configuration
- package.json
- dependencies
- tests
- Playwright configuration
- build configuration
- UI
- domain logic
- state management

DO NOT refactor anything.

DO NOT fix anything.

DO NOT optimize anything.

DO NOT redesign anything.

The ONLY files you are allowed to create or modify are:

    decisions.md
    flow.md
    questions.md

Everything must describe the CURRENT implementation.

Do not document what the application SHOULD have.

Document what it ACTUALLY HAS.

============================================================
SOURCE OF TRUTH
============================================================

Use the following sources in this order:

1. The P11 problem statement
2. The actual repository/source code
3. The actual tests
4. The actual package/dependency configuration
5. Git history, if useful
6. Existing project documentation

The P11 problem statement controls functional requirements.

The source code controls what was actually implemented.

The tests control what is actually verified.

Do not silently replace the P11 specification with general best
practices.

Do not claim something is a P11 requirement unless the P11 document
actually says so.

Clearly distinguish:

- P11 requirement
- implementation decision
- implementation detail
- inferred reasoning
- hypothetical productionization

============================================================
PHASE 1 — FULL REPOSITORY INSPECTION
============================================================

Before writing any documentation, inspect the relevant repository
thoroughly.

Inspect at minimum:

- package.json
- package-lock.json / lockfile
- index.html
- Vite configuration
- TypeScript configuration
- Tailwind configuration
- shadcn configuration
- src/
- all domain/logic files
- all React components
- all hooks
- all selectors
- all utility files
- all tests
- Playwright tests/configuration
- animation implementation
- chart implementation
- Bklit usage if present
- styling implementation
- README
- CLAUDE.md
- existing documentation
- git history where useful

Trace actual imports and function calls.

Do not rely solely on filenames.

You must understand:

- application entry point
- React mounting
- component tree
- state ownership
- event table state
- validation
- event processing
- reducer/state transitions
- derived state
- selectors
- summary calculation
- chart data
- shelf-map data
- timeline data
- rejection data
- animation triggers
- reset
- sample loading
- add/edit/delete
- testing architecture
- E2E architecture

Only after understanding the implementation should you write the
documentation.

============================================================
FILE 1 — decisions.md
============================================================

Create:

    decisions.md

Purpose:

Document the meaningful engineering decisions that resulted in the
CURRENT implementation.

The document must answer:

    WHY is the code structured this way?

For every meaningful decision, explain:

1. Decision
2. Context / problem
3. Chosen approach
4. Alternatives
5. Why the chosen approach makes sense
6. Trade-off accepted
7. Consequence
8. Actual files/functions involved

IMPORTANT:

Do not fabricate historical decisions.

If the repository or project history does not prove that an alternative
was actually considered, label it:

    "Reasonable alternative"

or:

    "Implementation inference"

Do not pretend the AI consciously considered an alternative if there is
no evidence of that.

============================================================
DECISIONS.MD — REQUIRED AREAS
============================================================

### 1. Overall Architecture

Investigate:

- Why frontend-only?
- Why no backend?
- Why no database?
- Why in-memory state?
- Why is the ordered event log the source of truth?
- Why is domain logic separated from UI?
- Why are processing functions pure, if they are?
- Why is there no network service?

Tie this to the actual P11 constraints.

P11 explicitly states that the ordered event log is the source of truth
and that backend/network services are not to be added.

Do not invent additional requirements.

---

### 2. State Management

Document:

- Where authoritative state lives.
- Why that state location was chosen.
- What is input state.
- What is processed output state.
- What is derived state.
- How reset works.
- How stale output is cleared.
- How duplicated state is avoided.
- Why the Handover Board is not an independent parcel store.

Explain the distinction between:

    SOURCE / INPUT STATE

and

    DERIVED / PROCESSED STATE

---

### 3. Domain Logic

Document:

- validation
- processing
- state transitions
- ARRIVE
- COLLECT
- rejected events
- source-order processing
- fresh state on every run
- pending ordering
- collected ordering

Explicitly discuss why structural validation occurs before processing,
because P11 requires complete-table validation before processing.

Also explain the distinction between:

STRUCTURAL INPUT ERRORS

and

STATE-DEPENDENT REJECTIONS

based on the actual implementation.

---

### 4. Data Structures

Identify the ACTUAL data structures used.

Examples only:

- Array
- Set
- Map
- Object
- reducer
- state object
- selectors

For each actual structure:

- what it stores
- why it is appropriate
- important operations
- complexity implications
- reasonable alternative
- trade-off

Do not claim a data structure is used unless it exists in the code.

---

### 5. Component Architecture

Document meaningful component decomposition.

Explain:

- why the Event Log is separated
- why the Handover Board is separated
- why Shelf Map is separated
- why Timeline is separated
- why Metrics are separated
- where state lives
- how props/callbacks move through components

---

### 6. Libraries

Document meaningful libraries actually installed and/or used.

Potential examples:

- React
- TypeScript
- Vite
- Tailwind
- shadcn/ui
- Motion.dev
- Bklit
- Vitest
- Playwright
- Playwright MCP
- chart library
- icon library

For each library actually used meaningfully:

- purpose
- why it fits this project
- reasonable alternative
- trade-off
- whether it is essential or replaceable

Do not claim "we chose X over Y" unless there is evidence.

---

### 7. UI Decisions

Document meaningful UI decisions:

- two-column layout
- Event Log placement
- Handover Board
- Shelf Map
- Timeline
- Metrics
- Events-over-time visualization
- editable table
- Reset
- Run Handover
- animation
- responsive behavior
- accessibility

Focus on engineering reasoning, not visual praise.

---

### 8. Animation

Explain:

- what is animated
- what triggers animation
- what state controls animation
- why Motion.dev is used
- whether animation affects domain logic

Explicitly establish whether animation is presentation-only.

---

### 9. Testing

Document:

- unit tests
- domain tests
- validation tests
- canonical/oracle scenario
- edge cases
- Playwright E2E
- why unit + E2E are both useful
- limitations of current coverage

---

### 10. Build / Tooling

Document actual decisions around:

- Vite
- TypeScript
- ESLint
- Vitest
- Playwright
- build configuration
- deployment if present

Only document what actually exists.

============================================================
DECISIONS.MD FORMAT
============================================================

Use:

# Engineering Decision Log

## Decision: <title>

### Context

...

### Decision

...

### Alternatives

- ...
- ...

### Why

...

### Trade-off

...

### Consequence

...

### Evidence

- `src/...`
- `src/...`
- `tests/...`

If the reasoning is inferred:

### Reasoning Classification

Implementation inference.

============================================================
FILE 2 — flow.md
============================================================

Create:

    flow.md

Purpose:

Document exactly HOW the application executes.

This is NOT a design document.

It is an execution/call-flow document.

It must answer:

    "When the application runs, what calls what,
     in what order, and how does data move through the system?"

============================================================
FLOW.MD — REQUIRED SECTIONS
============================================================

# Application Execution Flow

---

## 1. Application Boot

Trace exactly:

Browser
→ index.html
→ JavaScript entry
→ React mounting
→ root component
→ first rendered components

Use actual filenames and functions.

Example format:

    index.html
        ↓
    src/main.tsx
        ↓
    createRoot(...)
        ↓
    <App />
        ↓
    ...

Do not copy this example if the implementation differs.

---

## 2. Component Tree

Create the actual component hierarchy.

Example:

    App
    ├── Header
    ├── Metrics
    ├── EventChart
    ├── HandoverBoard
    ├── ShelfMap
    ├── Timeline
    ├── RejectedEvents
    └── EventLog

Use the ACTUAL hierarchy.

For important components document:

- responsibility
- props
- state
- callbacks
- children

---

## 3. Initial State

Explain exactly what happens on first load:

- initial events
- input state
- output state
- validation state
- metrics
- board
- chart
- timeline

Distinguish:

stored state

from:

derived values.

---

## 4. Event Editing Flow

Trace what happens when a user edits:

- Event ID
- Action
- Parcel ID
- Student
- Pickup Code
- Shelf

Document:

    UI
    ↓
    handler
    ↓
    state update
    ↓
    rerender
    ↓
    derived values

If realtime validation does NOT exist, explicitly say so.

Do not invent it.

---

## 5. Add Event Flow

Trace:

    Add Event
        ↓
    actual function
        ↓
    new event
        ↓
    state update
        ↓
    rerender

---

## 6. Delete Event Flow

Trace the exact call chain.

Include actual files/functions.

---

## 7. Run Handover — PRIMARY FLOW

This is the most important section.

Document the exact call sequence.

For example:

    User clicks Run Handover
        ↓
    handleRunHandover()
        ↓
    validateEvents(...)
        ↓
    validation result
        ↓
    if invalid → clear outputs
        ↓
    if valid → processEvents(...)
        ↓
    initialize state
        ↓
    iterate source-order events
        ↓
    process ARRIVE / COLLECT
        ↓
    generate outcomes
        ↓
    return result
        ↓
    update application state
        ↓
    selectors / derived values
        ↓
    UI rerender

But replace this with the ACTUAL call chain.

For every important call document:

- caller
- callee
- file
- purpose
- arguments
- return value

---

## 8. Validation Flow

Trace:

    Run Handover
        ↓
    complete-table validation
        ↓
    validation result

Cover:

- INVALID_EVENT
- DUPLICATE_EVENT_ID
- INVALID_PICKUP_CODE

Explain what happens after failure.

Explicitly document P11's rule that structural validation errors
produce no event outcomes or summary and clear previous output.

---

## 9. Event Processing Flow

Trace the actual implementation.

### ARRIVE

Show:

    event
      ↓
    parcel already seen?
      ↓
    active code collision?
      ↓
    accepted arrival
      ↓
    pending state
      ↓
    seen state
      ↓
    ARRIVED outcome

### COLLECT

Show:

    event
      ↓
    parcel pending?
      ↓
    pickup code matches?
      ↓
    remove pending
      ↓
    add collected
      ↓
    deactivate code
      ↓
    COLLECTED outcome

Use actual function names.

---

## 10. Output Derivation

Trace how the following are generated:

- pending count
- collected count
- rejected count
- pending board
- collected board
- shelf map
- timeline
- chart
- rejected events

For every output:

    INPUT
      ↓
    FUNCTION
      ↓
    DERIVED VALUE
      ↓
    COMPONENT

Explicitly state:

    STORED STATE

or

    DERIVED STATE

---

## 11. Reset Flow

Trace:

    Reset
      ↓
    function
      ↓
    restore six built-in events
      ↓
    clear validation
      ↓
    clear outcomes
      ↓
    clear handover
      ↓
    clear counts
      ↓
    rerender

Use actual implementation.

---

## 12. Unit Test Flow

Document:

- test files
- imported functions
- test setup
- assertions
- scenarios

Explain what each important test proves.

---

## 13. Playwright / E2E Flow

Trace the actual E2E execution:

    test
      ↓
    browser
      ↓
    page
      ↓
    UI action
      ↓
    application
      ↓
    assertion

Use actual test names and selectors.

---

## 14. Complete Canonical Execution Trace

Trace the built-in six-event scenario:

    Browser loads
        ↓
    sample events
        ↓
    Run Handover
        ↓
    validation
        ↓
    E01
        ↓
    E02
        ↓
    E03
        ↓
    E04
        ↓
    E05
        ↓
    E06
        ↓
    final result
        ↓
    state update
        ↓
    derived values
        ↓
    UI

For each major transition include:

- function
- file
- important state/data

---

## 15. File-to-File Call Graph

Create an application-level call graph.

Example:

    main.tsx
      ↓
    App.tsx
      ↓
    handleRunHandover()
      ↓
    validateEvents()
      ↓
    processEvents()
      ↓
    ...
      ↓
    setResult()
      ↓
    Metrics
    HandoverBoard
    ShelfMap
    Timeline
    Chart

Use the actual implementation.

Do not document every React internal call.

Focus on application-level calls.

============================================================
FILE 3 — questions.md
============================================================

Create:

    questions.md

Purpose:

Create an interview preparation guide based on:

- P11
- actual source code
- actual architecture
- decisions.md
- flow.md
- tests
- dependencies
- AI-assisted development requirements

This must NOT be a generic React interview question list.

Every important question should be plausibly askable about THIS project.

============================================================
QUESTIONS.MD STRUCTURE
============================================================

# Interview Questions — Parcel Desk

---

## 1. Problem Understanding

Questions such as:

- What problem does Parcel Desk solve?
- Why is the event log the source of truth?
- Why does source order matter?
- What is a structural validation error?
- What is a state-dependent rejection?
- Why does a rejection not mutate state?
- Why does every run start with empty state?
- Why is an empty event table valid?

For each:

### Answer

### Code

### Follow-up

### Strong follow-up answer

---

## 2. Architecture

Ask about the ACTUAL architecture:

- Why frontend-only?
- Why no backend?
- Why no database?
- Why in-memory state?
- Where is authoritative state?
- What is domain logic?
- What is presentation logic?
- Why separate processing from React?
- How do we avoid duplicated state?

---

## 3. Execution Flow

Generate questions from flow.md:

- What happens when the application loads?
- What happens when Run Handover is clicked?
- What calls validation?
- What calls processing?
- How does ARRIVE work?
- How does COLLECT work?
- How does the result reach the UI?
- How does Reset work?
- How does the chart receive data?
- How does Shelf Map receive data?

Include exact call chains.

---

## 4. Data Structures

Ask about actual data structures.

For each:

- Why this structure?
- Complexity?
- Alternative?
- Trade-off?

Do not discuss structures that aren't used.

---

## 5. Complexity

Analyze the actual implementation.

Generate questions about:

- processing complexity
- duplicate detection
- pickup-code collision detection
- lookup operations
- memory complexity
- repeated traversals
- scalability limits

Do not assume complexity.

Derive it from code.

---

## 6. Design Trade-offs

Generate questions directly from decisions.md.

For each major decision create:

### Interview Question

### Strong Answer

### Deeper Follow-up

### Follow-up Answer

### Common Mistake

---

## 7. Library Questions

For every meaningful library actually used:

- Why this library?
- What problem does it solve?
- What alternative exists?
- What trade-off exists?
- Could we remove it?
- What would change?

Include:

React, TypeScript, Vite, Tailwind, shadcn/ui, Motion.dev, Bklit,
Vitest, Playwright, Playwright MCP, charting libraries, etc. ONLY if
actually present.

---

## 8. Frontend Questions

Cover actual implementation:

- state ownership
- controlled inputs
- component decomposition
- derived state
- event table
- metrics
- chart
- shelf map
- timeline
- animation
- responsive layout
- accessibility
- reset

---

## 9. Testing Questions

Cover:

- unit testing
- validation tests
- processor tests
- canonical oracle
- edge cases
- E2E
- Playwright
- why unit + E2E
- missing test coverage

---

## 10. P11 Acceptance Criteria

Create questions for EVERY required acceptance criterion:

1. Built-in six-event scenario
2. Corrected E03 pickup code
3. E06 active-code collision
4. Empty table
5. Duplicate E06/E05 event ID
6. Synchronization
7. Source-order processing

For every criterion:

- what it means
- how implementation satisfies it
- where tested
- what could break it

---

# 11. LIVE MODIFICATIONS

This is especially important.

P11 explicitly says the candidate should be prepared to implement one
small modification, and possibly a second, using AI assistance.

Generate realistic modifications based on the ACTUAL codebase.

Divide into:

### EASY

### MEDIUM

### HARD

Possible categories:

- new validation rule
- new event outcome
- new metric
- new event filter
- new table column
- new derived statistic
- new rejection display
- new animation
- new chart behavior
- new edge-case test
- modified error presentation

Only suggest modifications compatible with P11.

Do NOT suggest adding:

- backend
- database
- authentication
- network service
- booking
- delivery routing
- notifications

as normal modifications.

---

# 12. LIVE MODIFICATION WALKTHROUGHS

For the 10 most likely modifications provide:

### Modification

### Difficulty

### Files affected

Use actual files.

### Functions affected

Use actual functions.

### Implementation Steps

3–7 steps.

### Tests

Exact tests to add/change.

### Verification

How to prove it works.

### Interview Explanation

What the candidate should say while implementing.

Do not invent file names.

---

# 13. "WHY NOT?" QUESTIONS

Generate questions such as:

- Why not Redux?
- Why not Zustand?
- Why not a backend?
- Why not a database?
- Why not realtime processing?
- Why not put processing inside React?
- Why not use classes?
- Why not maintain a separate parcel store?
- Why not use a heavier chart library?
- Why not animate every event?

For each answer:

Distinguish between:

    "Not required by P11"

and:

    "Technically inferior"

Do not call an alternative objectively bad when it is simply
unnecessary under the current constraints.

---

# 14. Edge Cases

Generate questions for:

- empty input
- duplicate IDs
- invalid pickup codes
- unknown parcel
- wrong pickup code
- repeated arrival
- active code collision
- repeated collection
- whitespace
- event order
- stale output
- reset
- editing after successful run

Include expected behavior and test location.

---

# 15. AI-Assisted Development

P11 evaluates AI-assisted development.

Generate questions around:

- What prompts did you use?
- How did you translate P11 into technical requirements?
- What did AI generate?
- What did you manually change?
- What AI recommendation did you reject?
- How did you verify AI-generated code?
- How did you prevent hallucinated requirements?
- How did you keep P11 constraints intact?
- How did you test generated code?
- What was a useful AI decision?
- What was a bad AI recommendation?

IMPORTANT:

Do NOT fabricate historical AI decisions.

If the repository/history does not provide evidence, write:

    "Prepare this answer yourself."

---

# 16. Hypothetical Productionization / System Design

The current project is intentionally frontend-only.

However, an interviewer may ask:

- What if this supported 100,000 events?
- What if multiple desks used it?
- What if handovers needed persistence?
- What if multiple volunteers edited simultaneously?
- What if we needed audit history?
- What if this became a production service?

Create a separate:

## Hypothetical Productionization

Clearly label every question as HYPOTHETICAL.

Do NOT imply that the current project contains:

- backend
- database
- Redis
- cache
- queues
- WebSockets
- authentication
- network services

Discuss those only as future architecture if constraints were relaxed.

---

# 17. Rapid Fire

Create 20–30 short questions.

Example:

Q: What is the source of truth?

A: The ordered editable event log.

Q: When does processing occur?

A: After complete-table validation when Run Handover is invoked.

Q: Does a rejected state-dependent event mutate state?

A: No.

Q: Does event ID determine processing order?

A: No. Source order does.

Use actual project behavior.

---

# 18. MUST-KNOW CHECKLIST

Create approximately 30–40 questions I should be able to answer
WITHOUT looking at the code before the interview.

Group:

- Problem
- Architecture
- Domain logic
- Data structures
- React
- Testing
- AI development
- Trade-offs
- Live modification

============================================================
QUESTIONS.MD ACCURACY RULE
============================================================

Every implementation-specific answer must be cross-checked against
the actual repository.

Every P11-specific answer must be cross-checked against the P11
document.

Every architectural answer must be cross-checked against decisions.md.

Every execution answer must be cross-checked against flow.md.

Remove generic questions that aren't relevant.

Mark hypothetical questions clearly.

Never invent project history.

============================================================
FINAL CROSS-DOCUMENT CONSISTENCY CHECK
============================================================

Before finishing, verify:

decisions.md
    = WHY

flow.md
    = HOW

questions.md
    = WHAT THE INTERVIEWER CAN ASK

They must describe the SAME CURRENT implementation.

If decisions.md says one thing but the code does another, trust the code
and correct the documentation.

If flow.md references a function that does not exist, inspect the code
and correct it.

If questions.md claims a feature exists that does not exist, remove or
correct the question.

============================================================
FINAL QUALITY STANDARD
============================================================

The documentation should allow a technically strong interviewer to ask:

    "Why did you choose this?"

    "Walk me through what happens when I click Run Handover."

    "Where is this state stored?"

    "What is the time complexity?"

    "Why is this a Set instead of an Array?"

    "What happens if validation fails?"

    "Why don't rejected events mutate state?"

    "Why isn't this processed in realtime?"

    "Why don't you have a backend?"

    "How would you scale this?"

    "Why did you use Motion.dev?"

    "What happens if I ask you to add X right now?"

And the candidate should be able to answer from these documents.

============================================================
FINAL ACTION
============================================================

Create/update ONLY:

    decisions.md
    flow.md
    questions.md

Do NOT modify application code.

After creating them:

1. Read all three files completely.
2. Verify every file/function reference.
3. Verify every P11 requirement mentioned.
4. Remove unsupported claims.
5. Remove duplicated content where unnecessary.
6. Ensure decisions.md focuses on WHY.
7. Ensure flow.md focuses on HOW.
8. Ensure questions.md focuses on INTERVIEW PREPARATION.
9. Ensure live modifications are based on the actual implementation.
10. Ensure hypothetical productionization is clearly separated.

Then provide only a concise summary:

- files created/updated
- major decisions documented
- major execution flows documented
- number/type of interview question categories
- number of live modifications
- any areas where the implementation was ambiguous

STOP.

DO NOT MODIFY SOURCE CODE.
````

## 21. Add a Motion.dev "OSS Hero"-style staggered entrance animation

**Timestamp:** 2026-08-23 14:53:15 IST  
**Context / outcome:** A tightly scoped animation brief (explicit stagger/spring parameters, explicit "do not change our existing layout", explicit reduced-motion/Playwright/accessibility non-regression checklist). This is the origin of the currently-uncommitted `entranceContainer`/`entranceItem` animation in `src/lib/motion.ts`/`src/app/App.tsx`.

````text
Add the Motion.dev "OSS Hero" style staggered spring entrance animation
to the existing Parcel Desk primary screen.

IMPORTANT:
Use the official Motion.dev OSS Hero example as the inspiration for the
animation mechanics, specifically its staggered spring entrance behavior.

Reference:
https://motion.dev/examples/react-hero-stagger

DO NOT copy the hero's visual design.
DO NOT turn Parcel Desk into a marketing hero.
DO NOT change our existing layout.

Adapt only the animation technique to our existing operations dashboard.

On initial application load, animate the major dashboard sections into
place sequentially:

1. Header / title
2. Summary metrics
3. Events Over Time chart
4. Handover Board
5. Shelf Map
6. Event Timeline
7. Event Log
8. Rejected Events if visible

Animation characteristics:

- opacity: 0 → 1
- subtle vertical movement: approximately 8–12px → 0
- spring-based entrance
- subtle stiffness/damping
- short stagger between sections
- approximately 60–100ms stagger
- total entrance should feel fast and polished
- no excessive bounce
- no large scaling
- no layout shift
- no animation that blocks interaction

The visual feeling should be:

"premium technical operations console"

NOT:

"marketing landing page"

Use Motion.dev / motion/react and the existing animation architecture.
Do not introduce another animation library.

Respect prefers-reduced-motion.

The animation must be presentation-only and must not affect:

- event processing
- validation
- state
- Run Handover
- Reset
- Event Log editing
- Playwright selectors
- accessibility

Also ensure the animation does not replay unnecessarily every time a
normal piece of application state changes. It should primarily represent
the initial application entrance.

After implementation:

- run tests
- run Playwright
- run production build
- verify the animation manually
- verify reduced-motion behavior
- verify no layout shift
- verify the UI remains interactive during/after the animation

Do not make any other visual changes.
````

## 22. "what kind of animations and interactive stuff can we do with the existing ui components"

**Timestamp:** 2026-08-23 15:11:15 IST  
**Context / outcome:** An exploratory question, answered directly — no implementation followed from this specific message.

````text
what kind of animations and interactive stuff can we do with the existing ui componenets
````

## 23. Final documentation + interview presentation pass — DEVELOPMENT.md / PRESENTATION.md

**Timestamp:** 2026-08-23 19:09:26 IST  
**Context / outcome:** A large, strictly-scoped documentation task: create exactly `DEVELOPMENT.md` and `PRESENTATION.md`, forbidding any application-code change, and requiring every historical claim to be labeled FACT / INFERENCE / "Historical evidence unavailable — prepare this section manually."

````text
# P11 — DEVELOPMENT PROCESS + INTERVIEW PRESENTATION DOCUMENTATION
# READ-ONLY DOCUMENTATION PASS

You are now creating the final documentation required for the P11
interview/submission.

The P11 requirements specifically ask the candidate to:

- Document the development process.
- Note which AI tools were used.
- Explain how AI tools influenced the work.
- Document iterations and improvements.
- Prepare code and supporting documentation.
- Present the solution in a 30–40 minute interview.
- Explain the approach and AI-assisted development.
- Discuss challenges.
- Explain how AI-generated suggestions were validated.
- Explain how code quality and originality were ensured.

Create two documents:

    DEVELOPMENT.md
    PRESENTATION.md

============================================================
CRITICAL RULE — DO NOT MODIFY APPLICATION CODE
============================================================

This is a documentation-only task.

DO NOT modify:

- React code
- TypeScript code
- CSS
- Tailwind
- Vite configuration
- package.json
- tests
- Playwright
- UI
- domain logic
- state management
- dependencies

ONLY create/update:

    DEVELOPMENT.md
    PRESENTATION.md

============================================================
CRITICAL ACCURACY RULE
============================================================

DO NOT FABRICATE DEVELOPMENT HISTORY.

The documentation must be based on evidence from:

1. Existing repository
2. Git history
3. Existing documentation
4. CLAUDE.md
5. decisions.md
6. flow.md
7. questions.md
8. package.json
9. source code
10. tests
11. Playwright configuration/tests
12. any existing prompts or AI-development notes

If the exact historical sequence cannot be established, say:

    "Historical evidence unavailable — prepare this section manually."

Do NOT invent:

- prompts that were never recorded
- AI decisions that cannot be established
- tools that were not used
- iterations that cannot be verified
- manual changes that cannot be verified
- reasons that were never documented

Distinguish clearly between:

    FACT
    INFERENCE
    PREPARATION NEEDED

============================================================
PART 1 — DEVELOPMENT.md
============================================================

Create:

    DEVELOPMENT.md

Purpose:

This document should explain HOW the project was developed and how AI
was incorporated into the engineering process.

It should read like a professional engineering development report,
NOT like an AI-generated diary.

============================================================
1. PROJECT OVERVIEW
============================================================

Briefly explain:

- Project name
- P11 problem
- Core objective
- Key constraints
- Final technology stack
- Final architecture

Explicitly mention that the application remains within the P11 scope.

The current architecture should be described accurately.

Do NOT introduce backend/database/network architecture as part of the
actual implementation.

============================================================
2. DEVELOPMENT APPROACH
============================================================

Explain the overall development methodology.

Cover the progression from:

P11 specification
    ↓
requirements extraction
    ↓
architecture/design decisions
    ↓
project scaffolding
    ↓
domain types
    ↓
validation
    ↓
event processing
    ↓
UI
    ↓
animation/visual refinement
    ↓
testing
    ↓
responsive verification
    ↓
production build
    ↓
deployment
    ↓
documentation

Only include stages that actually occurred.

For each stage explain:

- objective
- implementation
- AI involvement
- human involvement
- validation
- resulting improvement

============================================================
3. AI TOOLS USED
============================================================

Document the AI tools actually used.

At minimum investigate whether the project used:

- Claude Code
- ChatGPT
- Playwright MCP
- Motion.dev documentation/examples
- any other AI-assisted tooling

For each actual tool:

### Tool

### Purpose

### How it was used

### What it contributed

### What remained under human control

### Validation performed

### Limitations

Do NOT claim that a tool was used if there is no evidence.

============================================================
4. HOW AI INFLUENCED DEVELOPMENT
============================================================

This section is extremely important.

Explain that AI was used as an engineering assistant rather than an
unvalidated code generator.

Document actual examples of AI influence.

Potential categories to investigate:

- project scaffolding
- domain model
- validation logic
- reducer/event processing
- test generation
- UI implementation
- animation implementation
- responsive improvements
- documentation
- code auditing
- deployment

For every meaningful AI contribution explain:

    AI suggestion
        ↓
    human evaluation
        ↓
    accepted / modified / rejected
        ↓
    validation
        ↓
    final implementation

Only document examples supported by evidence.

============================================================
5. ITERATIONS AND IMPROVEMENTS
============================================================

Create a chronological development/iteration table.

Suggested format:

| Iteration | Problem | AI contribution | Human decision | Change | Validation |
|-----------|---------|-----------------|----------------|--------|------------|

Include meaningful iterations such as:

- initial implementation
- UI redesign
- visual refinement
- metric layout refinement
- chart refinement
- Event Log layout refinement
- removal of unnecessary controls
- one-screen optimization
- responsive refinement
- animation refinement
- testing refinement
- bundle/build investigation
- documentation/audit

Only include iterations actually supported by the project history.

============================================================
6. IMPORTANT AI DECISIONS
============================================================

Summarize meaningful decisions made with AI assistance.

For example:

- React/Vite architecture
- pure domain processing
- validation before processing
- source-order processing
- in-memory state
- Motion.dev
- component structure
- testing strategy

For each:

### Decision

### AI's contribution

### Human evaluation

### Final choice

### Why

### Trade-off

Reference decisions.md where appropriate.

============================================================
7. AI SUGGESTIONS THAT WERE REJECTED OR MODIFIED
============================================================

This is especially valuable for the interview.

Find actual examples where:

- AI proposed something outside P11
- AI proposed unnecessary complexity
- AI proposed a UI element that was removed
- AI proposed an architectural direction that was rejected
- AI implementation required correction
- AI generated something that was refined manually

For each:

### Original suggestion

### Why it was problematic

### Human intervention

### Final solution

### Engineering lesson

If no historical evidence exists, do not invent examples.

Instead state:

    Prepare examples from the actual development conversation.

============================================================
8. VALIDATION OF AI-GENERATED CODE
============================================================

Explain how AI-generated code was validated.

Cover actual mechanisms such as:

### Static validation

- TypeScript
- ESLint
- production build

### Automated testing

- Vitest
- unit tests
- edge cases

### E2E testing

- Playwright
- Playwright MCP
- canonical user workflows

### Manual validation

- canonical six-event scenario
- corrected pickup-code scenario
- active-code collision
- empty input
- duplicate event ID
- reset
- add/edit/delete
- responsive viewports
- visual inspection

For each validation mechanism explain:

    What it catches
    What it cannot catch

============================================================
9. CODE QUALITY STRATEGY
============================================================

Explain how code quality was maintained.

Cover actual practices:

- TypeScript strictness
- separation of domain logic
- pure functions
- component separation
- test coverage
- linting
- production build
- zero-warning goal
- readable naming
- controlled state
- avoiding duplicated state
- avoiding unnecessary dependencies

Do not claim practices that are not actually present.

============================================================
10. ORIGINALITY / HUMAN OVERSIGHT
============================================================

This section should prepare the candidate for:

    "How do we know you actually understand this code?"

Explain the mechanisms used to ensure understanding and originality.

Discuss:

- human review of AI-generated code
- understanding every important function
- testing AI-generated behavior
- rejecting unsupported requirements
- preserving P11 constraints
- documenting decisions
- documenting execution flow
- preparing for live modifications
- manually validating visual behavior

Do NOT claim the code was entirely manually written.

The correct framing is:

    AI-assisted implementation + human engineering judgment,
    validation, and ownership.

============================================================
11. CHALLENGES
============================================================

Document actual challenges encountered.

Potential areas to investigate:

- interpreting P11 constraints
- preventing overengineering
- preserving source-order semantics
- ensuring fail-fast validation
- keeping input/output state synchronized
- UI density
- one-screen constraint
- Event Log overflow
- chart representation
- animation
- responsive behavior
- build warnings
- AI-generated implementation issues

For each:

### Challenge

### Why it mattered

### Attempted solution

### Final solution

### Lesson learned

============================================================
12. P11 COMPLIANCE
============================================================

Create a checklist mapping the implementation to P11.

For example:

| P11 requirement | Implementation | Evidence |
|-----------------|----------------|----------|

Cover:

- editable event table
- Run Handover
- outcomes
- final pending board
- summary counts
- validation message
- sample/reset
- source-of-truth event log
- in-memory state
- no backend
- no network service
- no authentication
- no notifications
- no routing
- no bookings
- required edge cases

============================================================
13. FINAL DEVELOPMENT SUMMARY
============================================================

End DEVELOPMENT.md with a concise explanation:

    "How we built this project"

in approximately 8–12 steps.

This should be something the candidate can memorize before the
interview.

============================================================
PART 2 — PRESENTATION.md
============================================================

Create:

    PRESENTATION.md

Purpose:

This is a complete 30–40 minute interview presentation/playbook.

The candidate should be able to use it to prepare for the interview.

Do NOT write a generic presentation.

Base it on the actual implementation.

============================================================
PRESENTATION STRUCTURE
============================================================

Design a recommended 30–40 minute flow.

Use approximately:

1. Problem + context — 3 min
2. Requirements + constraints — 3 min
3. Product/demo overview — 5 min
4. Architecture — 5 min
5. Domain/event-processing logic — 7 min
6. Testing/validation — 4 min
7. AI-assisted development — 5 min
8. Trade-offs/challenges — 3 min
9. Live modification preparation — 3 min
10. Questions/buffer — remaining time

Adjust timing if the actual project requires it.

============================================================
1. OPENING
============================================================

Write an interview-ready opening.

It should explain in approximately 60–90 seconds:

- what Parcel Desk is
- what problem it solves
- what the core challenge was
- the most important architectural decision
- what makes the implementation interesting

Do NOT make it marketing language.

Make it sound like an engineer explaining a system.

============================================================
2. PROBLEM STATEMENT
============================================================

Give the candidate a concise explanation of P11.

Include:

- input
- actions
- processing
- output
- constraints

Explain why event order matters.

============================================================
3. REQUIREMENTS
============================================================

Provide a concise list of functional and architectural requirements.

Separate:

### Required by P11

from:

### Optional enhancements we implemented

This distinction is important.

============================================================
4. LIVE DEMO SCRIPT
============================================================

Write an exact demo sequence.

Example:

1. Start application.
2. Point out primary layout.
3. Explain Event Log as source of truth.
4. Explain metrics.
5. Explain Handover Board.
6. Explain Shelf Map.
7. Explain Timeline.
8. Click Run Handover.
9. Walk through outcomes.
10. Show rejected event.
11. Correct E03 pickup code.
12. Run again.
13. Show P01 moving Pending → Collected.
14. Demonstrate duplicate ID.
15. Show fail-fast validation.
16. Reset.

Only include actions actually supported by the application.

For every demo step provide:

### What to do

### What to say

### What interviewer should notice

============================================================
5. ARCHITECTURE PRESENTATION
============================================================

Create a concise explanation of the architecture.

The candidate should be able to draw/explain:

    Event Log
        ↓
    Validation
        ↓
    Event Processor
        ↓
    Result
        ↓
    Derived State
        ↓
    UI

Explain:

- source of truth
- state ownership
- domain layer
- presentation layer
- validation boundary
- processing boundary
- derived values

Reference flow.md.

============================================================
6. DOMAIN LOGIC PRESENTATION
============================================================

Explain how to present:

ARRIVE

and

COLLECT

including:

- checks
- state changes
- rejected outcomes
- ordering
- pickup-code handling
- fresh state on every run

Prepare a concise whiteboard explanation.

============================================================
7. TESTING PRESENTATION
============================================================

Give the candidate a 2–3 minute explanation of:

- unit tests
- integration/domain tests if present
- Playwright
- canonical scenario
- edge cases
- why testing was necessary for AI-generated code

Include exact examples.

============================================================
8. AI-ASSISTED DEVELOPMENT PRESENTATION
============================================================

This is a major section.

Prepare an interview-ready explanation answering:

### What AI tools did you use?

### Why did you use them?

### What did AI generate?

### What did you personally decide?

### How did you validate AI output?

### Did AI ever make a bad suggestion?

### How did you prevent AI from violating P11?

### How did you maintain code quality?

### How did you ensure originality/understanding?

The answer should emphasize:

    AI accelerated implementation.
    Human judgment controlled requirements, architecture,
    validation, trade-offs, and acceptance.

Do not imply that AI autonomously designed the entire project.

============================================================
9. CHALLENGES PRESENTATION
============================================================

Pick the 3–5 strongest REAL challenges.

For each provide:

### Challenge

### Why difficult

### Solution

### Trade-off

### What I learned

============================================================
10. IMPORTANT DESIGN DECISIONS TO PRESENT
============================================================

Select the 5–8 most interview-worthy decisions from decisions.md.

For each:

### Decision

### 30-second explanation

### 2-minute deep explanation

### Likely follow-up

### Strong follow-up answer

============================================================
11. SYSTEM DESIGN QUESTIONS
============================================================

Prepare answers for likely questions such as:

- Why no backend?
- Why no database?
- Why in-memory?
- Why not Redux/Zustand?
- Why not process events in realtime?
- What happens with 100,000 events?
- How would you persist this?
- How would multiple desks work?
- How would you handle concurrency?
- How would you add authentication?
- How would you add an audit log?
- How would you scale the system?

IMPORTANT:

Clearly distinguish current architecture from hypothetical
productionization.

============================================================
12. LIVE MODIFICATION STRATEGY
============================================================

Explain how the candidate should approach a live modification.

The process should be:

    Understand request
        ↓
    Identify affected behavior
        ↓
    Identify files/functions
        ↓
    Ask AI for implementation
        ↓
    Review AI output
        ↓
    Implement
        ↓
    Add/update test
        ↓
    Run test
        ↓
    Verify UI
        ↓
    Explain trade-off

Generate 5–10 likely modifications based on the actual code.

For each:

- interviewer prompt
- expected difficulty
- files involved
- implementation strategy
- test strategy
- explanation to interviewer

============================================================
13. RAPID-FIRE INTERVIEW PREPARATION
============================================================

Create a final list of the 30 most likely questions.

For each:

Q:
A:

Keep answers concise enough to memorize.

============================================================
14. PRESENTATION DO / DON'T
============================================================

Create a section:

### Do

- explain requirements first
- show source-of-truth model
- demonstrate state transitions
- explain validation boundary
- explain AI verification
- show tests
- discuss trade-offs

### Don't

- claim AI wrote everything
- claim features P11 doesn't require
- over-focus on visual design
- pretend hypothetical backend exists
- use buzzwords without implementation evidence
- say "AI decided" without explaining human validation
- spend 20 minutes clicking through UI without explaining engineering

============================================================
15. FINAL 30-SECOND CLOSING
============================================================

Write a strong closing statement summarizing:

- problem
- architecture
- correctness
- AI-assisted development
- validation
- engineering judgment

It should sound natural and interview-appropriate.

============================================================
FINAL CROSS-CHECK
============================================================

Before finishing:

1. Verify DEVELOPMENT.md against actual repository/history.
2. Verify PRESENTATION.md against actual implementation.
3. Verify P11 requirements against the actual P11 document.
4. Cross-reference decisions.md.
5. Cross-reference flow.md.
6. Cross-reference questions.md.
7. Remove fabricated history.
8. Mark unsupported historical claims as "Prepare manually."
9. Clearly separate P11 requirements from optional enhancements.
10. Clearly separate current implementation from hypothetical system
    design.
11. Ensure every demo step actually works.
12. Ensure every live modification is actually compatible with the
    current architecture.

============================================================
FINAL OUTPUT
============================================================

Create/update ONLY:

    DEVELOPMENT.md
    PRESENTATION.md

Do NOT modify application code.

Then report:

- DEVELOPMENT.md created/updated
- PRESENTATION.md created/updated
- development phases documented
- AI tools documented
- iterations documented
- validation methods documented
- presentation agenda created
- demo flow created
- live-modification scenarios created
- any historical information that could not be verified

STOP.
````

## 24. "create a promtp history.md for all the prompts you give - keep inn mind i have to show it to the interveiewer"

**Timestamp:** 2026-08-24 10:02:49 IST  
**Context / outcome:** The request that produced this document.

````text
create a promtp history.md for all the prompts you give - keep inn mind i have to show it to the interveiewer
````

---

## Excluded from the numbered log above

- **2026-08-23 03:38:34 IST** — (agent-invoked `run` skill, not a typed prompt): SKIPPED from the numbered log above — this JSONL entry is the `run` skill's own bundled instructions plus an agent-authored "User Request" (verify the dev server boots and Run Handover populates the UI), not text the candidate typed. Included here only as a footnote for completeness.
- **2026-08-23 19:13:13 IST** — (harness-generated context-compaction summary): SKIPPED from the numbered log above — this is a system-generated summary of the conversation-so-far, produced automatically when the session's context window filled, not a message the candidate typed.

---

## Summary

- **24 genuine candidate-authored prompts**, spanning 2026-08-23 02:57:00 IST through 2026-08-24 10:02:49 IST (most recent).
- Sourced from three session transcripts: an early planning session (`9e6ca5d4-...`), a documentation/interview-prep session (`534f1b9c-...`), and the main implementation session (`77ac41a5-...`).
- Cross-reference `docs/PROMPTS.md` for the project's own contemporaneous, narrative summary of a subset of these prompts (the first three), and `DEVELOPMENT.md` for how each prompt maps to a specific git commit and implementation stage.
