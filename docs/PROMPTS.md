# AI Prompting Log

Real prompts used during this project, logged as work happens (not
reconstructed after the fact). Evidence for the "AI Prompting Strategy"
grading criterion.

## Session log

### 1. Initial assessment (Phase 0)

> Read CLAUDE.md, docs/P11-SPEC.md, and docs/PLAN.md. Do not modify
> anything yet. Inspect the repository and determine its current state.
> Then report: 1. repository state 2. required setup 3. dependencies
> needed 4. potential technical risks 5. the next implementation phase.
> Do not implement anything until the assessment is complete.

Result: `docs/P11-SPEC.md` did not exist in the repo, despite CLAUDE.md
naming it the single authoritative spec. Flagged as a genuine blocker per
CLAUDE.md's own "if ambiguous in a way that changes behavior, stop and
ask" rule, rather than guessing at spec content or silently proceeding.
Asked the user directly; they chose to treat `docs/PLAN.md` (which already
encodes detailed validation rules, processor logic, and acceptance tests)
as the de facto spec. `git init` + first commit followed as the Phase 0
checkpoint.

### 2. Core domain engine (Phases 1-4, 6)

> PHASE 1 — PROJECT SETUP / PHASE 2 — DOMAIN MODEL / PHASE 3 —
> VALIDATION / PHASE 4 — EVENT PROCESSOR / PHASE 6 — DOMAIN TESTS.
> [...] The domain engine is the highest priority. [...] Do NOT
> implement: backend / API / database / Redis / Docker / authentication
> / network service. [...] Only stop and ask me if you hit the
> Rule-of-3 condition or a genuine specification ambiguity that
> materially changes the implementation.

Scaffolded Vite+React+TS, then built `src/lib/{types,constants,
sampleData,validation,processor,selectors}.ts` and 43 Vitest tests before
touching any UI, per the "domain logic must be callable with zero React
imports" architectural principle. No Rule-of-3 stops were hit — the
canonical oracle matched on the first implementation, verified against the
exact check-order rules in PLAN.md (PARCEL_ALREADY_SEEN before
ACTIVE_CODE_COLLISION; PARCEL_NOT_PENDING before PICKUP_CODE_MISMATCH).

### 3. Full UI, Motion, Bklit, Playwright, docs (Phases 7-16)

> Continue straight through the remaining phases without stopping, but
> add comments everywhere because in my interview i have to do live
> changes/modifications so i need to be thorough with the code.

Built the shadcn/ui + Tailwind v4 UI shell, wired it to the domain layer
through a single `useReducer` (`src/app/appReducer.ts`), added the Motion
presentation layer and one Bklit ring chart, wrote the Playwright
acceptance suite (6 required scenarios) plus an axe-core accessibility
sweep, and filled in this documentation set — all in one pass per the
"don't stop" instruction, verifying with real tool runs (not assumed) at
each step: `tsc -b`, `vitest run`, `playwright test`, and a headless
Chromium smoke check with screenshots after every UI-affecting change.

Two library-verification moments worth recording (per PLAN.md's Library
Verification Rule — never assume an API, check the installed version):
`bklit` is not an npm package but a shadcn *registry*
(`npx shadcn add https://ui.bklit.com/r/ring-chart.json`), discovered via
web search after `npm install bklit` 404'd; and the installed shadcn CLI
(v4.19) generates components on `@base-ui/react` primitives, not the
Radix primitives older shadcn documentation assumes — confirmed by
reading the actual generated `button.tsx`/`select.tsx` output rather than
assuming.

The "add comments everywhere" instruction is a deliberate departure from
this assistant's own default (no-comment) style, scoped to this project
only, because the user needs to explain the code live in an interview —
comments throughout `src/lib/`, `src/app/`, and `src/components/` are
aimed at *why*, not *what* (the domain-rule check ordering, the
Reset-vs-empty-run state distinction, the reasoning behind each Motion/
accessibility fix), not restating what well-named code already shows.
