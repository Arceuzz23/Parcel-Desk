-- Active: 1784572858063@@localhost@5432
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
