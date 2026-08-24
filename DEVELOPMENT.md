# Development Process — Parcel Desk

This document reconstructs how this project was actually built, using the
repository's own history as evidence. It follows a strict accuracy rule:
**every claim is labeled FACT (directly verifiable from git history, code,
or checked-in docs), INFERENCE (a reasonable reading of that evidence), or
PREPARATION NEEDED (no repository evidence exists — must be answered from
memory of the actual working session, not invented here).**

Primary evidence sources consulted to write this document: `git log`
(commit messages + per-commit file diffs, 15 commits total), `CLAUDE.md`,
`docs/PLAN.md`, `docs/DECISIONS.md`, `decisions.md` (root — see note
below), `docs/SYSTEM-DESIGN.md`, `docs/PROMPTS.md`, `flow.md`,
`questions.md`, `package.json`, `playwright.config.ts`, source under
`src/`, and the test suites under `src/tests/` and `e2e/`.

**Note on repository state at the time this document was written (FACT,
`git status`):** three files — `decisions.md`, `flow.md`, `questions.md`,
all at the repo root — exist in the working tree but are **not yet
committed** (they show as untracked/staged-new relative to the last
commit, `d381d067`). Four source files also carry **uncommitted
modifications** relative to that same commit: `src/app/App.tsx`,
`src/components/SummaryPanel.tsx`, `src/lib/motion.ts` (together
implementing an initial-load "entrance stagger" animation — see
`decisions.md`'s dedicated Animation decision for the full account), and
`e2e/accessibility.spec.ts` (timeout adjustments to accommodate that
longer entrance sequence). This document describes the repository as it
currently sits on disk (working tree), which is the accurate "what does
this app do right now" picture — but be ready to note, if asked, that this
specific set of changes has not yet been committed to git history.

**Two decisions logs exist, and they disagree in one place (FACT):**
`docs/DECISIONS.md` (committed, ~138 lines, written incrementally across
three early-to-mid commits) and the newer, more rigorous `decisions.md` at
the repo root (~1023 lines, uncommitted, structured as
Context/Decision/Alternatives/Why/Trade-off/Consequence/Evidence per
entry, with explicit "Reasoning Classification" notes distinguishing fact
from inference). `flow.md` and `questions.md` — both explicitly named as
required evidence sources for this documentation pass — cross-reference
`decisions.md` (the root file) by name throughout, not `docs/DECISIONS.md`.
`decisions.md` itself explicitly states its scope: it describes "the
current state of the repository... verified by reading source, tests, and
config directly," and calls out by name every place `docs/DECISIONS.md`
no longer matches the code (the clearest example: `docs/DECISIONS.md`
still describes a Bklit *ring-chart* that no longer exists in the
codebase — see §7 below, where this document's own independent reading of
the code arrived at the same finding `decisions.md` already documents in
more depth). Where the two disagree, this document follows `decisions.md`
as the current, verified source, per the "code and tests are the source
of truth" principle it states explicitly.

---

## 1. Project Overview

**Name:** Parcel Desk (repo/package name `hostel_parcel_desk`; UI title
"Parcel Desk — Hostel Operations Console").

**Problem (P11):** A hostel parcel desk needs to process a day's worth of
`ARRIVE`/`COLLECT` events — a parcel arriving onto a shelf, a student
collecting one — from a complete, editable event log, and produce a
deterministic final state: what's still pending, what's been collected,
and a per-event outcome for every row, including events that are rejected
because they conflict with the desk's state at that point in the replay.

**Objective:** Build this as a browser-based tool that demonstrates precise
requirement interpretation, a framework-independent domain engine,
deterministic processing, strong TypeScript, layered testing, and
disciplined AI-assisted engineering — not just "a working UI." (FACT —
`docs/PLAN.md`'s stated Role.)

**Governing spec note (FACT):** `CLAUDE.md` names `docs/P11-SPEC.md` as the
single source of truth. That file does not exist in this repository. This
was identified as a blocker at the very start of the project (see §2,
Stage 0) and the user explicitly redirected the agent to treat
`docs/PLAN.md` as the de facto specification for the remainder of the
project (`docs/PROMPTS.md` §1, `README.md`, `questions.md` §17 last entry).
Every requirement cited in this document therefore traces to `docs/PLAN.md`,
not to a `P11-SPEC.md`.

**Hard constraints (FACT, `CLAUDE.md` + `docs/PLAN.md`):** no backend, no
API route, no database, no Redis, no Docker, no network service at
runtime, no authentication, no notifications, no bookings, no delivery
routing. Browser-only, in-memory, zero network calls at runtime.
Conceptual production architecture is discussed only in
`docs/SYSTEM-DESIGN.md`, explicitly marked "not implemented."

**Confirmed scope compliance (FACT, verified by direct inspection):**
`src/` contains no server code, no `fetch`/`XMLHttpRequest`/WebSocket
calls, no database client, no auth code. The build (`npm run build` = `tsc
-b && vite build`) produces a static bundle in `dist/` with no server
component.

**Final stack (FACT, `package.json`):** Vite 8, React 19.2, TypeScript
(strict, `~6.0.2`), Tailwind CSS v4 (via `@tailwindcss/vite`), shadcn/ui
(CLI-generated, on `@base-ui/react` — see §6), Motion (`motion` package,
`motion/react` import — the rebranded Framer Motion), Bklit
(`src/components/charts/`, an area-chart, sourced from the shadcn-style
registry `ui.bklit.com`, not an npm dependency), `@number-flow/react`
(count-up digit animation), Vitest 4, React Testing Library, Playwright
1.62 + `@axe-core/playwright`, oxlint. No Next.js. No Redux/Zustand — a
single `useReducer` in `src/app/App.tsx` is the only application state
(FACT, `src/app/appReducer.ts`, `docs/DECISIONS.md`).

**Final architecture (FACT):**

```
Editable event table (React state)
        ↓
validateEvents()   — full-table structural validation (src/lib/validation.ts)
        ↓
processHandover()  — pure domain engine, fresh state per call (src/lib/processor.ts)
        ↓
HandoverResult { outcomes, pending, collected }
        ↓
selectors.ts — getSummary / getPendingParcels / getCollectedParcels / getShelfMap / getEventsOverTime
        ↓
React UI (shadcn/ui + Motion + one Bklit chart)
```

`src/lib/` (`types.ts`, `constants.ts`, `sampleData.ts`, `validation.ts`,
`processor.ts`, `selectors.ts`) has zero React/DOM/browser imports —
verified directly by inspection; it is importable and tested from plain
Node via Vitest with no jsdom required for the domain suite.
`src/lib/motion.ts` is presentation-only and deliberately kept separate
from this rule (its own doc comment states this explicitly).

---

## 2. Development Approach

The project was built as one continuous, same-day agentic session
(FACT — every commit timestamp is `2026-08-23`, spanning `03:12` to
`14:04` local time) using Claude Code, working phase-by-phase against
`docs/PLAN.md`'s explicit phase list, with git commits as checkpoints. The
stages below are derived directly from the 15-commit history plus
`docs/PROMPTS.md`'s session log; only stages with actual evidence are
listed.

### Stage 0 — Assessment (pre-Phase 0)

- **Objective:** Determine repo state and confirm the spec source before
  writing any code, per `CLAUDE.md`'s Agent Workflow ("Inspect before
  modifying") and `docs/PLAN.md`'s "First Action" instruction.
- **AI involvement:** Read `CLAUDE.md`, looked for `docs/P11-SPEC.md`,
  read `docs/PLAN.md`, reported repo state/setup/dependencies/risks.
- **Human involvement:** Issued the assessment prompt; when the agent
  flagged the missing spec file as a blocker, explicitly decided to treat
  `docs/PLAN.md` as the de facto spec.
- **Validation:** N/A — no code existed yet.
- **Resulting improvement:** Avoided the failure mode of silently
  guessing at an unwritten spec's contents. (FACT — `docs/PROMPTS.md` §1.)

### Stage 1 — Scaffolding + domain model, validation, processor, selectors, domain tests (PLAN.md Phases 1–4, 6)

- **Commit (FACT):** `07a00f3` — "Scaffold Vite+React+TS project;
  implement domain model, validation, event processor, selectors, and
  domain test suite (Phases 1-4, 6)" — 30 files, ~4000 insertions.
- **Objective:** Build the framework-independent domain engine first,
  before any UI, per PLAN.md's core architectural principle.
- **Implementation:** `src/lib/{types,constants,sampleData,validation,
  processor,selectors}.ts` plus `src/tests/domain/{integration,processor,
  selectors,validation}.test.ts`.
- **AI involvement:** Full implementation from PLAN.md's exact type list,
  validation contract, and mandatory check-order rules (per a long,
  explicit user prompt naming each phase — `docs/PROMPTS.md` §2).
- **Human involvement:** Authored the phase-by-phase prompt itself,
  explicitly forbidding backend/API/DB and scoping "stop and ask" to only
  Rule-of-3 failures or genuine spec ambiguity.
- **Validation:** Domain Vitest suite run against the canonical 6-event
  oracle from PLAN.md. `docs/PROMPTS.md` states this matched on the first
  implementation attempt with no Rule-of-3 stops.
- **Resulting improvement:** A pure, independently testable domain engine
  existed before any UI risk could couple business rules to component
  structure.

### Stage 2 — Full UI, Motion, Bklit chart, shelf map, Playwright suite (PLAN.md Phases 7–12)

- **Commit (FACT):** `0080805` — "Build full UI, Motion, Bklit chart,
  shelf map, and Playwright E2E suite (Phases 7-12)" — 53 files, ~10,273
  insertions. Includes shadcn init, initial Bklit `ring-chart` install,
  `e2e/handover.spec.ts` (the 6 required acceptance scenarios),
  `playwright.config.ts`, and `src/tests/ui/App.test.tsx` (RTL suite).
- **Objective:** Wire the validated domain engine to an interactive
  browser UI and cover it end-to-end.
- **AI involvement:** Full implementation, continuing straight through
  without stopping per the user's explicit instruction (`docs/PROMPTS.md`
  §3) to "add comments everywhere" because the code would need to be
  explained live in an interview — a deliberate departure from the
  assistant's own default no-comment style, scoped to this project only.
- **Validation:** `tsc -b`, `vitest run`, `playwright test`, and a
  headless-Chromium smoke check with screenshots after each UI-affecting
  change (`docs/PROMPTS.md` §3's stated method).

### Stage 3 — Accessibility pass, documentation, keyboard-nav (PLAN.md Phases 13–14, 16)

- **Commits (FACT):** `7eea8a6` — "Add automated accessibility sweep and
  fix 3 WCAG AA contrast failures (Phase 13)"; `26a38f3` — "Add
  documentation (README, DECISIONS, SYSTEM-DESIGN, PROMPTS,
  TEST-EVIDENCE) and a keyboard-nav check (Phases 14, 16)"; `6e1d1a3` —
  "Focused polish pass: clarify chart total, strengthen board hierarchy,
  verify motion/a11y (post-Phase-16)".
- **AI involvement:** Wrote the first `e2e/accessibility.spec.ts`
  (axe-core, WCAG 2 A/AA tags), found and fixed 3 real contrast failures
  by computing actual composited contrast ratios rather than adjusting
  colors by eye (`docs/DECISIONS.md`), authored `README.md`,
  `DECISIONS.md`, `SYSTEM-DESIGN.md`, `PROMPTS.md`, `TEST-EVIDENCE/`, and
  `e2e/keyboard-nav.spec.ts`.
- **Validation:** `playwright test` (axe-core violations must equal `[]`);
  visual/manual confirmation via headless Chromium screenshots.

### Stage 4 — Visual redesign: "Operations Console" (post-functional pass, not a numbered PLAN.md phase)

- **Commit (FACT):** `9f11e21` — "Visual redesign: Hostel Parcel Desk
  Operations Console (restyle + UI-only interaction, no domain changes)" —
  22 files, 940 insertions/450 deletions.
- **What changed (FACT, from diff stats):** `docs/DECISIONS.md` gained 78
  lines documenting the redesign's rationale; `EventOutcomes.tsx` was
  deleted and replaced by a new `EventTimeline.tsx`; a new
  `ParcelLabel.tsx` shared component was introduced; `appReducer.ts`
  gained 31 lines adding a `selectedParcelId` field for cross-view
  highlighting; `src/index.css` was substantially rewritten (+220 lines)
  for a dark graphite/amber "operations console" identity, replacing an
  earlier `prefers-color-scheme`-driven approach (per `docs/DECISIONS.md`'s
  "superseded" note).
- **AI involvement:** Full implementation from a detailed, 31-section user
  design brief (per conversation record — see §3 note on prompt-log
  coverage below; this specific brief is not captured verbatim in
  `docs/PROMPTS.md`).
- **Validation:** Existing domain/RTL/Playwright suites re-run; test
  selectors coupled to `ParcelLabel`'s old CSS classes broke as expected
  and were fixed once by switching to `data-testid="parcel-{id}"`
  (`docs/DECISIONS.md`), which is exactly the failure mode `data-testid`
  selectors exist to avoid in the rest of the suite.

### Stage 5 — Reference-image-driven final UI pass

- **Commit (FACT):** `82b864d` — "feat: implement final ParcelDesk
  operations UI (visual reference match)" — 84 files changed, 9,954
  insertions/1,603 deletions. Added `reference/final-ui.png`; added
  roughly 50 new `src/components/charts/*` files (a Bklit **area-chart**,
  superseding the earlier ring-chart — see §6's flagged inconsistency);
  deleted the old ring-chart files; added `Panel.tsx`,
  `EventsOverTimeChart.tsx`, `Footer.tsx`, `shimmering-text.tsx`; grew
  `selectors.ts` and `constants.ts`.
- **AI involvement:** Full implementation from a reference screenshot plus
  an explicit instruction not to trust the screenshot's example data for
  functional logic — only for visual layout — falling back to PLAN.md
  wherever the two conflicted (per conversation record; not captured
  verbatim in `docs/PROMPTS.md`).
- **Validation:** Same three-layer test suite; manual visual comparison
  against the reference image.

### Stage 6 — Layout compaction, table-overflow fix, bundle-size fix, docs refresh

- **Commits (FACT):** `dd55023`, `7d614c9` (two layout-refinement passes
  toward a dense, one-viewport desktop composition — deleted `Footer.tsx`
  among other changes); `6dd168c` — "Fix Event Log horizontal scrollbar
  with a fixed table layout"; `229ff80` — "Fix the >500 kB chunk warning:
  lazy-load the chart, split the React vendor chunk"; `70c6c6d` —
  "Refresh README and .gitignore to match the current implementation."
- **What the bundle-size fix actually did (FACT, verifiable in
  `vite.config.ts` and `SummaryPanel.tsx`):** `EventsOverTimeChart` is
  `React.lazy()`-loaded and gated behind `result !== null` — a real
  deferral, not a cosmetic wrapper, since the chart is genuinely unused
  until after the first Run Handover; `vite.config.ts`'s
  `build.rollupOptions.output.manualChunks` splits React/ReactDOM into a
  dedicated `react-vendor` chunk.
- **AI involvement:** Diagnosed a PowerShire/PowerShell reporter-plugin
  error as unrelated noise around the real `>500 kB` chunk warning (per
  conversation record), then implemented the two changes above and
  reported before/after chunk sizes.
- **Validation:** `npm run build` output inspected directly for resulting
  chunk sizes (not merely "build succeeds").

### Stage 7 — Untracked follow-up commit

- **Commit (FACT):** `d381d067` — "icon updated" — `public/favicon.svg`,
  +9/-1 lines. Authored by the same author identity as every other commit
  (`Aryan Choudhary`), but has **no corresponding record in this agent's
  own working session** — i.e., no evidence this was made by an AI agent
  in the recorded conversation. **PREPARATION NEEDED:** confirm and be
  ready to explain whether this was a direct manual edit or a separate,
  unrecorded AI-assisted change.

**Documentation-pass caveat (FACT):** `docs/PROMPTS.md`'s "Session log"
captures exactly 3 prompts, covering Stage 0 through Stage 2 only (its own
header states entries are "logged as work happens," not reconstructed
after the fact — meaning it was simply never appended to during Stages
3–7). Stages 3–7 above are reconstructed from git commit messages and
diffs (an explicitly valid evidence source per this document's brief),
not from a logged prompt. Their exact original prompt wording is not
preserved anywhere in the repository.

---

## 3. AI Tools Used

| Tool | Purpose | How used | What it contributed | What stayed under human control | Validation performed | Limitations |
|---|---|---|---|---|---|---|
| Claude Code (this agent) | Primary implementation agent for the entire project | Given phase-scoped prompts (`docs/PROMPTS.md`) and design briefs (per conversation record); wrote all source, tests, and docs across 14 of the 15 commits | Scaffolding, domain engine, validation, UI, Motion, Bklit integration, Playwright suite, accessibility fixes, bundle-size fix, documentation | Requirements interpretation authority (treating PLAN.md as the spec was a human decision after the agent flagged the gap); acceptance of every phase's output; the explicit "Rule of 3" and "never weaken tests" constraints in `CLAUDE.md` | `tsc -b`, `vitest run`, `playwright test`, headless-Chromium screenshot checks — real tool runs at each step, per `docs/PROMPTS.md` §3 | Cannot independently confirm a requirement is correct without a real spec document (see the missing `P11-SPEC.md` finding); output quality depends entirely on prompt precision |
| Playwright MCP | Dev-time UI debugging (per `CLAUDE.md`/`docs/DECISIONS.md`, explicitly scoped as dev-time only) | **PREPARATION NEEDED** — no specific in-session usage transcript of Playwright MCP is preserved in the checked-in docs to cite concretely; its role is architecturally documented (`docs/DECISIONS.md`: "Playwright MCP is a dev-time tool, not a runtime or CI dependency") but a specific example of it catching something is not evidenced in the repo | N/A without further evidence | N/A | N/A | Never a runtime or CI dependency, by explicit project rule |
| Web search (via the agent) | Verifying real library APIs before using them (PLAN.md's "Library Verification Rule") | Used twice, evidenced concretely: (1) discovering that `bklit` is a shadcn *registry* URL, not an npm package, after `npm install bklit` 404'd; (2) confirming shadcn's CLI output targets `@base-ui/react`, not Radix | Prevented two classes of hallucinated-import bugs | Decision to actually verify rather than assume came from the explicit Library Verification Rule in `docs/PLAN.md` | Read the generated `button.tsx`/`select.tsx` source directly to confirm the primitive library, rather than trusting documentation | Search results still require the human/agent to read generated output rather than trust the search result itself — which is what happened here |
| ChatGPT / other AI tools | — | **PREPARATION NEEDED** — no evidence in the repository of any tool besides Claude Code being used for implementation | — | — | — | — |
| Motion.dev examples/docs | Source pattern for the initial-load entrance animation | `src/lib/motion.ts`'s own doc comment explicitly credits "Motion.dev's OSS Hero stagger example (motion.dev/examples/react-hero-stagger)" as the adapted source for `entranceContainer`/`entranceItem`, re-tuned (smaller travel, overdamped spring, shorter stagger) for an operations console rather than a marketing hero | A verified, cited external pattern rather than an invented animation approach | Judgment to re-tune the pattern's parameters for this app's tone | Manual/visual verification of the resulting motion; `e2e/accessibility.spec.ts`'s reduced-motion test confirms the app remains fully usable if this animation is skipped entirely | Comment-level citation only — no evidence of directly reading Motion.dev's source code beyond the pattern shape |

---

## 4. How AI Influenced Development

Concrete, evidenced examples (real → not fabricated):

- **Scaffolding:** AI proposed and executed the full Vite+React+TS+Tailwind
  scaffold in commit `07a00f3`, following PLAN.md's stack list exactly
  (React 19, TS strict, no Next.js). Human control: the stack itself was
  spec-mandated, not an AI choice to accept or reject.
- **Domain model:** AI derived `Event`/`EventOutcome`/`PendingParcel`/
  `CollectedParcel`/`HandoverResult`/`ValidationError` (see `src/lib/
  types.ts`) directly from PLAN.md's named type list — accepted as-is;
  matches the spec's type names exactly.
- **Validation:** AI implemented `validateEvents()`'s exact rule set and
  the `PICKUP_CODE_REGEX = /^[A-Z0-9]{4}$/` — verified against PLAN.md's
  explicit note that mixed-alphanumeric (e.g. `K7M2`) must be valid, not
  "all-letters XOR all-digits" (`docs/DECISIONS.md` records this as a
  confirmed reading, not an assumption).
- **Processor/check order:** AI implemented the mandatory ARRIVE check
  order (`PARCEL_ALREADY_SEEN` → `ACTIVE_CODE_COLLISION`) and COLLECT
  check order (`PARCEL_NOT_PENDING` → `PICKUP_CODE_MISMATCH`) exactly as
  PLAN.md specifies — validated by the canonical 6-event oracle passing on
  first attempt (`docs/PROMPTS.md` §2).
- **Test generation:** AI wrote the domain Vitest suite (43 tests per
  `docs/PROMPTS.md` §2), the RTL suite (`App.test.tsx`), and the
  Playwright suite (`e2e/handover.spec.ts`'s 6 named acceptance scenarios,
  `accessibility.spec.ts`, `keyboard-nav.spec.ts`) — all accepted, later
  extended (e.g. contrast-fix follow-ups) rather than rewritten.
- **UI:** AI built the full component tree (`Header`, `SummaryPanel`,
  `HandoverBoard`, `EventTimeline`, `ShelfMap`, `EventTable`, shared
  `ParcelLabel`/`Panel`/`EmptyState` leaves) — human control was exercised
  through two full redesign passes (Stage 4, Stage 5) that replaced the
  initial visual approach without touching the underlying domain
  contracts.
- **Animation:** AI proposed the Motion patterns (`layoutId` FLIP,
  `AnimatePresence`, `staggerChildren`, the credited Motion.dev-derived
  entrance stagger) — accepted, and explicitly bounded by
  `MotionConfig reducedMotion="user"` at the root so animation never
  becomes a functional dependency (verified by the dedicated
  reduced-motion E2E test).
- **Responsive improvements:** AI implemented the `xl:grid-cols-[...]`
  two-column layout with single-column fallback below `xl`
  (`src/app/App.tsx`) — accepted as the final layout after the two
  layout-refinement commits (Stage 6).
- **Documentation:** AI authored `README.md`, `docs/DECISIONS.md`,
  `docs/SYSTEM-DESIGN.md`, `docs/PROMPTS.md`'s session log, and this
  document — accepted, with `docs/DECISIONS.md` in particular actively
  maintained/appended across multiple stages (16 → 66 → 144 lines across
  three commits).
- **Code auditing:** AI ran a read-only bundle-size investigation before
  making any change (per conversation record and the explicit "Do not
  modify any files yet" instruction it was given), then implemented a
  verified fix rather than the rejected shortcut of raising
  `chunkSizeWarningLimit` (see §7).
- **Deployment:** AI authored `.gitignore`/`README.md` refresh and
  confirmed all 15 commits were pushed to
  `github.com/Arceuzz23/Parcel-Desk` (per conversation record).

---

## 5. Iterations and Improvements

| Iteration | Problem | AI contribution | Human decision | Change | Validation |
|---|---|---|---|---|---|
| 1 | `docs/P11-SPEC.md` named as source of truth but absent from the repo | Flagged as a blocker per CLAUDE.md's "stop and ask" rule instead of guessing | Explicitly redirected: treat `docs/PLAN.md` as the de facto spec | No code change — a scope decision | N/A (pre-code) |
| 2 | Bklit is referenced as a viz library but `npm install bklit` fails | Web-searched and discovered it's a shadcn registry (`https://ui.bklit.com/r/*.json`), not an npm package | Accepted the corrected installation method | Installed via `npx shadcn add https://ui.bklit.com/r/ring-chart.json` (later superseded — see Iteration 5) | Package actually resolved and rendered |
| 3 | shadcn/ui documentation commonly assumes Radix primitives | Read the CLI's actual generated `button.tsx`/`select.tsx` output rather than assuming | Accepted `@base-ui/react` as the real primitive library | `docs/DECISIONS.md` records the verified fact | Direct source inspection |
| 4 | `e2e/accessibility.spec.ts`'s axe-core sweep found 3 real WCAG AA contrast failures | Computed actual composited contrast ratios (not by-eye adjustment) and hand-tuned `--destructive`/`--status-rejected`/`--status-success` to hex literals | Accepted the fix; the sweep itself was added proactively | Color tokens changed in `src/index.css`; one contrast failure (rejected badge tint) needed a second, brighter pass (`#f26f6a` → `#ff8d87`) after axe-core still failed the composited-background case | `e2e/accessibility.spec.ts` — `results.violations` equals `[]` |
| 5 | Visual redesign replaced the shared parcel component's CSS structure | Rewrote `ParcelLabel` and the surrounding board/shelf-map markup | User drove two consecutive redesign passes (Stage 4, Stage 5) via detailed design briefs | Test selectors coupled to old CSS classes broke; fixed once by switching to `data-testid="parcel-{id}"` everywhere | Full Playwright suite re-run after the fix |
| 6 | Chart implementation was originally a Bklit `ring-chart` (pending/collected only, rejected excluded by design) | Implemented the ring chart first (Stage 2), then replaced it with an `EventsOverTimeChart` (Bklit area-chart) plotting all three series (pending/collected/rejected) over the run (Stage 5) | Driven by the reference-image redesign pass | ~50 new chart-support files added, old ring-chart files deleted (`82b864d`) | Re-run test suite; `docs/DECISIONS.md`'s chart-related entries were **not** updated after this swap — a documented inconsistency, see §6 |
| 7 | `>500 kB` chunk warning after the full UI build | Ran a read-only investigation first (explicitly instructed not to modify files or just raise the warning limit), then implemented `React.lazy()` gated on `result !== null` plus a `manualChunks` react-vendor split | Rejected the "just increase `chunkSizeWarningLimit`" shortcut explicitly | Main chunk: 628.48 kB → 324.16 kB; new `react-vendor` chunk: 191.17 kB; new async `EventsOverTimeChart` chunk: 114.84 kB | `npm run build` output inspected directly for resulting chunk sizes |
| 8 | Event Log table caused a horizontal scrollbar | Diagnosed and fixed with `table-layout: fixed`, a fixed delete-column width, `min-w-0` on cell contents | Scoped explicitly to "the Event Log only," 19 stated requirements | `EventTable.tsx` restructured (+26/-16 lines) | Visual/manual check; existing table-driven tests unaffected |

---

## 6. Important AI Decisions

| Decision | AI's contribution | Human evaluation | Final choice | Why | Trade-off |
|---|---|---|---|---|---|
| React 19 + Vite (no Next.js) | Proposed as the spec-mandated stack | Accepted — PLAN.md explicitly names this stack and forbids Next.js | React + Vite | Static, framework-free build matches the "no backend/network service" constraint; no SSR/server routes to accidentally introduce | Loses Next.js's built-in routing/SSR conveniences the app doesn't need anyway |
| Pure domain processing (`processHandover`) with zero React imports | Proposed and implemented as PLAN.md's core architectural principle | Accepted as-is | `src/lib/` is plain TypeScript, unit-testable in Node | Enables exact-assertion testing with no DOM/jsdom for the domain suite; UI can be restyled without risking a change to computed results | Requires manually re-deriving all UI-facing values via `selectors.ts` rather than colocating logic with components |
| Validation-before-processing, whole-table gate | Implemented per PLAN.md's validation contract | Accepted; reaffirmed after the Rule-of-3-scoped "stop and ask" clause was never triggered here | `appReducer.ts`'s `RUN` case calls `processHandover` only if `validateEvents` returns `valid: true` | Keeps the structural-vs-state-rejection distinction airtight — a malformed row can never silently become "just skipped" | Worse UX for a large table with one typo (a large table is entirely blocked by one bad row) — accepted deliberately per `questions.md` §6's documented answer to this exact follow-up |
| Source-order processing (never sorted) | Implemented as a plain `for...of` loop, no `.sort()` | Accepted; verified with a dedicated out-of-order-ID test specifically because the built-in fixture's IDs happen to already be in order | `processHandover()` iterates events in array order | `PARCEL_ALREADY_SEEN`/`ACTIVE_CODE_COLLISION` genuinely depend on real event sequence, not the free-text Event ID field | None material — this is a correctness requirement, not a trade-off |
| In-memory state only (`useReducer`, no persistence) | Implemented per the explicit "zero network calls at runtime" constraint | Accepted | `AppState` lives entirely in one `useReducer`; a page reload returns to the built-in fixture | Matches the Hard Constraints list exactly | No session persistence — acceptable since P11 excludes persistence entirely |
| Motion (`motion/react`) for animation | Proposed for `AnimatePresence`/`layoutId` FLIP support plain CSS transitions don't provide | Accepted | Motion used exactly where PLAN.md scopes it (count-up, outcome appearance, pending→collected transition, validation feedback, reset, entrance) | Presentation-only, zero domain coupling — verified: `src/lib/motion.ts` has no knowledge of `Event`/`HandoverResult` | Extra dependency weight for something the app doesn't functionally need — acknowledged directly in `questions.md`'s Library Questions table |
| Component structure: one component per PLAN.md-named screen section plus two shared leaves (`Panel`, `ParcelLabel`) | Proposed and implemented | Accepted; `ParcelLabel` deliberately kept non-Motion so animation ownership stays with each caller | Current `src/components/` tree (see `flow.md` §2) | Avoids three separate visual definitions of "what a parcel looks like" across Board/Shelf Map | None material |
| Testing strategy: 3 layers (Vitest/RTL/Playwright), no visual regression testing | Proposed and implemented all 3 | Accepted; limitations acknowledged directly in `docs/DECISIONS.md`/`questions.md` rather than glossed over | Current test suite (7 files, listed in §8) | Matches PLAN.md's required layering exactly | No screenshot-diff testing, no automated `Select` pointer-interaction coverage in RTL, no zero-warnings gate wired into the `test` script itself — documented gaps, not hidden ones |

*(Reference: `decisions.md` (root) contains the full Context/Decision/
Alternatives/Why/Trade-off/Consequence/Evidence writeup for every decision
above, plus additional lower-level ones — data-structure choices in the
processor, the `HandoverResult | null` typing for `lastResult`, the
`selectedParcelId` cross-highlight field, build/tooling choices, and the
absence of CI configuration — not duplicated here to avoid redundancy; see
that file directly. `docs/DECISIONS.md` covers a subset of the same
ground at less depth and is stale on the chart implementation — see §7.)*

---

## 7. AI Suggestions Rejected or Modified

- **Original suggestion (evidenced):** silence the `>500 kB` chunk-size
  warning by raising Vite's `build.chunkSizeWarningLimit`.
  **Why problematic:** treats the symptom, not the actual unused-weight
  problem (the chart's d3/visx dependency chain being loaded on first
  paint even though it's unused pre-Run).
  **Human intervention:** the user's own instruction explicitly forbade
  this shortcut ("Do NOT simply recommend increasing
  build.chunkSizeWarningLimit") before the agent could propose it.
  **Final solution:** genuine deferral via `React.lazy()` gated on
  `result !== null`, plus a `manualChunks` react-vendor split.
  **Engineering lesson:** a build warning about size is often a proxy for
  "this code doesn't need to load yet," not just a number to suppress.

- **Original approach (evidenced):** an earlier Bklit **ring-chart**
  (`HandoverChart.tsx`, per `docs/DECISIONS.md`'s still-present entry)
  deliberately excluded the `rejected` outcome type from the visualization
  ("rejected events never touch the board").
  **Why superseded:** the later reference-image-driven redesign (Stage 5)
  replaced it with an `EventsOverTimeChart` (Bklit area-chart) that plots
  all three series — pending, collected, *and* rejected — as a running
  time series over the run (confirmed directly in `SummaryPanel.tsx`'s
  `ChartLegend`, `README.md`'s "Bklit area-chart" description, and
  `decisions.md`'s dedicated chart entry).
  **Final solution:** the area-chart is what ships today.
  **Note (FACT — a real, currently-live documentation gap, already
  self-identified in the repository):** `docs/DECISIONS.md`'s Bklit-related
  entries were never updated after this swap — they still describe the
  superseded ring-chart, its `rejected`-exclusion rationale, and
  `HandoverChart.tsx` by name, none of which match the current codebase.
  This is not a new discovery made only for this document: `decisions.md`
  (the newer, root-level decisions log — see the note at the top of this
  document) already flags the identical inconsistency explicitly, under a
  "Note — discrepancy with `docs/DECISIONS.md`" heading, and even marks its
  own claim that the ring-chart was *deliberately replaced* (rather than
  simply never having existed) as an "implementation inference... there is
  no explicit commit message stating 'replace ring-chart with area-chart'
  to cite directly." This document's independent reading of the same code
  arrived at the same conclusion.
  **Engineering lesson:** a documentation file that isn't touched during a
  later redesign will drift from the code — worth catching in a real
  review, and worth being able to explain honestly rather than hide in an
  interview. It's also worth noting that this specific project already
  demonstrates the *correction* of that drift, in `decisions.md`, as
  evidence of an actual self-auditing pass having happened.

- **What did AI generate vs. what did you manually change? What AI
  recommendation did you reject (beyond the two evidenced above)? What was
  a bad AI recommendation you had to catch/correct beyond these two?**
  **PREPARATION NEEDED** — `questions.md` §15 itself flags these exact
  questions as needing to be "prepared from your own actual recollection
  of the session," explicitly stating no further repository evidence
  exists to cite. Do not improvise additional examples for these beyond
  the two above.

---

## 8. Validation of AI-Generated Code

**Static:**
- TypeScript strict mode, `tsc -b` as the first step of `npm run build` —
  catches type errors, and specifically an exhaustiveness check in
  `appReducer.ts` (`default: const _exhaustive: never`) that would fail
  to compile if a new `AppAction` variant were added without a
  corresponding `case`. Also: `OUTCOME_DESCRIPTIONS` in `constants.ts` is
  typed `satisfies Record<OutcomeType, string>`, making it a compile
  error to add a new `OutcomeType` without a description.
- `oxlint` (`npm run lint`). What it catches: common JS/TS lint issues.
  What it cannot catch: business-rule correctness, exact check-order
  requirements, or anything TypeScript's type system doesn't encode.

**Automated (Vitest):** `src/tests/domain/{processor,validation,selectors,
integration}.test.ts` (FACT, 4 files) assert exact values — never
`toBeDefined()`, per PLAN.md's explicit requirement — against the
canonical oracle, corrected-E03, E06-collision, empty-input,
duplicate-event-ID, out-of-order-ID (source-order proof), and every
outcome type. What they catch: any regression in check order, validation
rules, or derived selector output, in milliseconds, with no DOM. What they
cannot catch: whether the UI actually wires a button click to the correct
dispatch, or whether a real browser renders the result correctly.

**RTL (`src/tests/ui/App.test.tsx`):** renders the real `<App />` in
jsdom; asserts initial reset-state placeholders, a full Run producing
correct outcomes/board/summary, an emptied-table run producing explicit
`0/0/0`, a duplicate-ID edit blocking the run with a specific banner
message, an invalid pickup code producing a specific banner message,
editing-after-Run not mutating the displayed result, Reset restoring the
6 rows, and Add Event appending a 7th blank row. What it catches: reducer
wiring bugs invisible to the domain suite alone. What it cannot catch:
real-browser layout/CSS issues, real pointer/keyboard timing.

**E2E (Playwright, dev-time/CI only per `docs/DECISIONS.md`):**
- `e2e/handover.spec.ts` — the 6 required acceptance scenarios, named
  `test("1. ...")` through `test("6. ...")`, run against a real
  `npm run dev` server (`playwright.config.ts`'s `webServer`).
- `e2e/accessibility.spec.ts` — `AxeBuilder({page}).withTags(["wcag2a",
  "wcag2aa"]).analyze()` across pre-run/post-run/validation-error states,
  asserting zero violations; plus a `reducedMotion: "reduce"` project
  variant asserting the app still fully populates and every scanned
  element reaches `opacity: 1`. What it catches: mechanical WCAG A/AA
  issues (contrast, missing labels, ARIA misuse) cheaply on every run.
  What it does **not** replace (stated directly in the test file's own
  comment): manual keyboard-nav / screen-reader verification.
- `e2e/keyboard-nav.spec.ts` — drives edit → Run → Reset via
  `page.keyboard.press` only, asserting focus and final state.

**Manual verification (per conversation record and `docs/PROMPTS.md`
§3):** headless-Chromium smoke checks with screenshots after every
UI-affecting change; the canonical six-event scenario, corrected
pickup-code scenario, active-code collision scenario, empty input, and
duplicate event ID were each exercised live in a running dev server, not
only through automated assertions.

---

## 9. Code Quality Strategy

Practices actually present in the codebase (verified by direct
inspection, not aspirational):

- TypeScript strict mode throughout; no `any` found in `src/lib/`; no
  `@ts-ignore` present.
- Domain/presentation separation enforced structurally, not just by
  convention — `src/lib/` has zero React/DOM imports (verifiable via
  import inspection).
- Pure functions in the domain layer: `processHandover()` declares fresh
  local state on every call (verified: `Set`/`Map`/array locals inside the
  function body, no module-level mutable state) — proven by a dedicated
  "purity" Vitest test (`expect(first).not.toBe(second);
  expect(first).toEqual(second)`).
- Component separation: one component per named screen section
  (`Header`, `SummaryPanel`, `HandoverBoard`, `EventTimeline`, `ShelfMap`,
  `EventTable`), two shared presentational leaves (`Panel`, `ParcelLabel`)
  — `App.tsx` is the only component holding React state; every other
  component is a pure function of its props (`flow.md` §2).
- No duplicated state: every board/summary/chart/shelf-map view reads
  `lastResult` directly or derives from it via `selectors.ts` — none holds
  an independent copy (`questions.md` §2's "How do we avoid duplicated
  state?").
- Naming: exact PLAN.md contract terms used verbatim as `OutcomeType`
  values (`ARRIVED`, `COLLECTED`, `PARCEL_ALREADY_SEEN`,
  `ACTIVE_CODE_COLLISION`, `PARCEL_NOT_PENDING`, `PICKUP_CODE_MISMATCH`) —
  never a generic "Error" string anywhere in the UI.
- Controlled inputs: every `EventTable` cell is a controlled
  `<Input>`/`<Select>` dispatching `UPDATE_FIELD` — no uncontrolled refs.
- Zero-warning intent: `npm run build`'s chunk-size warning was treated as
  a real problem to fix (Stage 6), not suppressed via a raised limit.
- No unnecessary dependencies: Bklit's chart is loaded from a registry
  source rather than adding a full charting library as an npm dependency;
  `@number-flow/react` was reused (already a transitive dependency) rather
  than hand-rolling a second number-tweening implementation.

**Known, documented gaps (not hidden):** no visual regression testing; the
RTL suite doesn't cover the `Select` dropdown's real pointer-based
open/close interaction (acknowledged directly in that test file's own
comment, per `decisions.md`'s Testing entry); no `tsc -b`/lint
zero-warnings check wired into the `test` script itself; no CI
configuration exists in the repository at all (`decisions.md`'s
Build/tooling decision — confirmed by the absence of any
`.github/workflows/` directory). `docs/DECISIONS.md`'s Bklit chart entries
are stale relative to the current area-chart implementation (see §7).

---

## 10. Originality / Human Oversight

**Framing for "how do we know you actually understand this code?":** this
project is AI-assisted implementation plus human engineering judgment,
validation, and ownership — not "entirely manually written," and also not
"AI designed this autonomously." Concretely:

- The **requirements interpretation** decision (treating `docs/PLAN.md` as
  the de facto spec after the named `docs/P11-SPEC.md` was found missing)
  was a human call, made only after the agent surfaced the gap rather than
  guessing past it.
- Every **phase boundary** was a human-issued instruction (PLAN.md's phase
  list, executed in explicit prompts — `docs/PROMPTS.md`), not an
  AI-initiated scope decision.
- Every **redesign pass** (Stage 4's "Operations Console" restyle, Stage
  5's reference-image match, Stage 6's layout compaction and Event Log
  fix) was driven by a specific, detailed human design brief — the AI
  implemented against explicit visual/interaction requirements, it did
  not invent the visual direction unprompted.
- The **rejection of the chunk-warning shortcut** (§7) is direct evidence
  of human-set engineering standards overriding the easier AI path.
- **Comment density** throughout `src/lib/`, `src/app/`, and
  `src/components/` was a deliberate human instruction ("add comments
  everywhere... because in my interview i have to do live
  changes/modifications") specifically so the person presenting this code
  can explain it live — the comments exist *for* human comprehension and
  live-modification readiness, which is itself evidence the codebase was
  built to be understood, not just accepted as a black box.
- The `docs/DECISIONS.md` staleness on the chart swap (§7) is disclosed
  here rather than concealed — a project genuinely understood by its owner
  can name its own inconsistencies.

---

## 11. Challenges

| Challenge | Why it mattered | Attempted solution | Final solution | Lesson learned |
|---|---|---|---|---|
| `docs/P11-SPEC.md` named but missing | Every downstream requirement traces back to a spec that didn't exist in the repo | Flagged rather than guessed | User redirected to `docs/PLAN.md` as the de facto spec | A named-but-absent source of truth is a blocker worth stopping for, not working around |
| Preventing overengineering | PLAN.md explicitly forbids Redux/Zustand/virtualization/Web Workers/caching for a deliberately small app | Default to the simplest structure that satisfies the spec | Single `useReducer`, no global state library, no premature optimization | "Correctness and clarity over premature optimization" (PLAN.md's own Performance section) is an explicit constraint, not just good taste |
| Source-order semantics | A processor that (incorrectly) sorted events by ID would still pass the canonical oracle by coincidence, since `E01..E06`'s IDs already happen to be in source order | — | A dedicated out-of-order-ID test (`E03, E01, E02`) specifically rules out a hidden sort-by-ID bug | The "happy path" test alone is not proof of a specific implementation detail — an adversarial test is needed |
| Fail-fast (whole-table) validation | Blocking an entire run on one bad row is a real UX cost for a large table with one typo | — | Implemented exactly as PLAN.md requires (no partial output on structural failure) | Correctness-over-convenience trade-offs from the spec should be honored even when a "friendlier" alternative is easy to build |
| Input/output state synchronization | Editing the table must never silently mutate the last displayed result | — | `rows` and `lastResult` kept as two independent reducer fields; only the `RUN` action ever touches `lastResult` | Getting this "for free" from the reducer's shape (rather than an extra guard condition) is more robust than remembering to add a check everywhere |
| One-viewport desktop density | An operations-console layout with 6+ visible sections easily overflows a single 1440×900 viewport | Multiple layout iterations (horizontal metrics row, compact chart, two-column grid) | Dense single-viewport composition (Stage 6, two dedicated layout-refinement commits) | Achieving density without `overflow: hidden` required actually reducing/reorganizing content, not hiding it |
| Event Log horizontal scrollbar | A dynamic-width table with a delete-action column produced an unwanted horizontal scrollbar | — | `table-layout: fixed`, fixed delete-column width, `min-w-0` on cell contents (commit `6dd168c`) | A layout bug traced to a specific CSS mechanism (auto table layout) rather than patched with `overflow-x: hidden` |
| Chart bundle weight | Bklit's area-chart pulls in a real `@visx`/d3 dependency chain (~94 kB minified per the code's own comment) that's unused before the first Run | Read-only investigation first, explicitly avoiding the "raise the warning limit" shortcut | Genuine `React.lazy()` deferral gated on `result !== null`, plus a react-vendor `manualChunks` split | A chunk-size warning is often diagnosing real unused-on-first-paint weight, not just a number to silence |
| Documentation drift after a redesign | `docs/DECISIONS.md`'s Bklit-chart entries were never updated after the ring-chart → area-chart swap | — | Disclosed explicitly in this document (§7) rather than silently patched or hidden | Docs not touched during a later pass will drift from code; the honest response is to name the drift, not paper over it in a new document |

---

## 12. P11 Compliance

| Requirement (per `docs/PLAN.md`, the de facto P11 spec) | Implementation | Evidence |
|---|---|---|
| Editable event table | `EventTable.tsx`, columns `# \| Event ID \| Action \| Parcel ID \| Student \| Pickup Code \| Shelf \| Actions` | `flow.md` §2, §5, §6; `README.md` |
| Run Handover action | `Header.tsx` button → `dispatch({type:"RUN"})` → `appReducer.ts` calls `validateEvents()` then `processHandover()` | `flow.md` §7 |
| Per-event outcomes | `EventTimeline.tsx` renders `result.outcomes` in source order with exact contract terms | `src/lib/types.ts` `OutcomeType`; `flow.md` §10 |
| Final handover board | `HandoverBoard.tsx` — Pending/Collected columns, accepted-arrival / successful-collection order | `flow.md` §2, §14 |
| Summary counts | `SummaryPanel.tsx` — Pending/Collected/Rejected/Events figures via `getSummary()` | `src/lib/selectors.ts` |
| Validation message specificity | `ValidationBanner.tsx` renders every `ValidationError.message` verbatim, no truncation | `flow.md` §8 |
| Built-in sample / Reset | `sampleData.ts`'s `BUILT_IN_EVENTS`, cloned via `getBuiltInEvents()`; `RESET` action calls `createInitialState()` | `flow.md` §1, §11 |
| Complete-table (structural) validation before processing | `validateEvents()` checked over all rows before any `processHandover()` call; zero partial output on failure | `flow.md` §8; `src/tests/domain/validation.test.ts` |
| Duplicate Event ID rejection | `seenIds.has(id)` check → `DUPLICATE_EVENT_ID` | `src/lib/validation.ts`; acceptance test 5 |
| Invalid pickup code rejection | `PICKUP_CODE_REGEX` check → `INVALID_PICKUP_CODE` | `src/lib/constants.ts` |
| Invalid event (structural) rejection | Empty ID/parcel ID, bad action, missing ARRIVE student/shelf → `INVALID_EVENT` | `src/lib/validation.ts` |
| ARRIVE behavior + check order | `PARCEL_ALREADY_SEEN` → `ACTIVE_CODE_COLLISION` → accept | `src/lib/processor.ts`; `flow.md` §9 |
| COLLECT behavior + check order | `PARCEL_NOT_PENDING` → `PICKUP_CODE_MISMATCH` → accept | `src/lib/processor.ts`; `flow.md` §9 |
| State-rejection continuation (no abort) | Every rejection branch is `outcomes.push(...); continue;`, never `return`/`throw` | `src/lib/processor.ts` |
| Source-order processing | Plain `for (const event of events)`, no `.sort()` | `src/lib/processor.ts`; dedicated out-of-order-ID test |
| Pending list ordering | Accepted-arrival order preserved (array push, no re-sort) | `src/lib/processor.ts` |
| Collected list ordering | Successful-collection order preserved | `src/lib/processor.ts` |
| Empty-table behavior | `validateEvents([])`/`processHandover([])` both return valid, zero-length, non-error results | `validation.test.ts`, `processor.test.ts`; acceptance test 4 |
| Built-in oracle exact match | E01–E06 → 3 pending / 1 collected / 1 rejected, exact outcome sequence | `processor.test.ts`, `integration.test.ts`, `App.test.tsx`, `e2e/handover.spec.ts` test 1 |
| Corrected E03 scenario | `ZZZZ→K7M2` flips E03 to `COLLECTED`, moves P01 to collected | `processor.test.ts`; acceptance test 2 |
| E06 collision scenario | `H2N6→T9C4` rejects E06 as `ACTIVE_CODE_COLLISION`, excludes P04 | `processor.test.ts`; acceptance test 3 |
| Empty input run | Explicit `0/0/0`, not a blocked state | acceptance test 4; `App.test.tsx` |
| Duplicate event ID run | Whole run blocked, zero partial output, specific message naming the ID | acceptance test 5 |
| Reset-vs-empty-run distinction | `lastResult: null` (Reset/first load) vs. real zero-length `HandoverResult` (empty run) — every consumer branches on `result === null` first | `flow.md` §3, §11; `App.test.tsx`; `e2e/handover.spec.ts` test 6 |
| No backend/API/DB/Redis/Docker/network service | Verified by direct inspection — no server code, no `fetch`, anywhere in `src/` | — |
| No auth/notifications/bookings/delivery routing | Confirmed absent from the entire feature set | — |

---

## 13. Final Development Summary

How this project was actually built, in order:

1. Assessed the repo and discovered `docs/P11-SPEC.md` was missing;
   stopped and confirmed `docs/PLAN.md` should be treated as the spec.
2. Scaffolded Vite + React + TypeScript + Tailwind, with strict TS from
   the start.
3. Built the pure domain layer first — types, constants, the canonical
   6-event fixture, full-table validation, `processHandover()` with its
   exact mandatory check order, and derived selectors — with zero React
   imports, and a Vitest suite proving the canonical oracle before any UI
   existed.
4. Built the full React UI (shadcn/ui, wired to the domain layer through
   one `useReducer`), added the Motion presentation layer, a Bklit chart,
   an optional shelf map, and the full Playwright acceptance suite (the 6
   required scenarios).
5. Ran an automated accessibility sweep, found and fixed 3 real WCAG AA
   contrast failures by computing actual composited contrast ratios, and
   wrote the project documentation set.
6. Went through two further design passes — a full "Operations Console"
   visual redesign, then a reference-screenshot-driven final pass — each
   time re-verifying the domain/test suites still passed and fixing test
   selectors that had coupled to CSS rather than `data-testid`.
7. Compacted the layout to a dense, one-viewport desktop composition,
   fixed an Event Log horizontal-scrollbar bug, and fixed a genuine
   >500 kB bundle-size warning with real lazy-loading and vendor chunk
   splitting (explicitly rejecting the shortcut of just raising the
   warning threshold).
8. Refreshed `README.md`/`.gitignore` and pushed the complete history (15
   commits) to GitHub.
9. Wrote this document and `PRESENTATION.md` as a final, evidence-only
   documentation pass — explicitly forbidden from touching any application
   code, and required to disclose (not fabricate around) the gaps found
   along the way: the missing `P11-SPEC.md`, the partial prompt log in
   `docs/PROMPTS.md`, the stale Bklit-chart entries in `docs/DECISIONS.md`,
   and the one commit (`d381d067`, "icon updated") with no corresponding
   session record.
