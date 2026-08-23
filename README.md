# Parcel Desk — Hostel Operations Console

A browser-based, in-memory tool for processing a hostel parcel desk's daily
handover: an editable event log (parcels arriving, students collecting) is
validated as a whole, run through a deterministic domain engine, and
rendered as a final pending/collected board, a spatial shelf map, and an
event-by-event timeline. No backend, no database, no network calls at
runtime — see `CLAUDE.md` for the hard constraints and `docs/PLAN.md` for
the governing implementation spec (the project's `docs/P11-SPEC.md` was
never supplied; `PLAN.md` is treated as the authoritative functional
reference throughout, per `docs/DECISIONS.md`).

The visual design follows `reference/final-ui.png` — a dark "operations
console" identity (graphite background, one amber accent, green/red
reserved for success/rejected) rather than a generic admin dashboard.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-checks (`tsc -b`) then produces a static production build in `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run test` | Vitest — domain logic + RTL component tests (`src/tests/`) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright — full user flows + accessibility (`e2e/`), boots its own dev server |
| `npm run lint` | Oxlint |

## Architecture

```
Editable event table (React state)
        │
        ▼
validateEvents()          full-table validation, src/lib/validation.ts
        │
   invalid ──► ValidationError[] ──► UI shows banner, clears stale output
        │
   valid
        ▼
processHandover()         pure domain engine, src/lib/processor.ts
        │
        ▼
HandoverResult             { outcomes, pending, collected }
        │
        ▼
getSummary() / getPendingParcels() / getCollectedParcels()
getShelfMap() / getEventsOverTime()      (src/lib/selectors.ts)
        │
        ▼
React UI (shadcn/ui + Motion + one Bklit chart)
```

`src/lib/` is the domain layer: plain TypeScript, zero React/DOM imports,
unit-tested in isolation (`src/tests/domain/`). Everything under
`src/components/` and `src/app/` only *consumes* what `src/lib/` produces —
no business rule (what counts as a valid pickup code, what happens on a
second ARRIVE for the same parcel, etc.) lives outside `src/lib/`.

## Project structure

```
src/
├── app/
│   ├── App.tsx              root component — one useReducer, no global state lib
│   └── appReducer.ts         app state machine (rows / lastResult / validationErrors / selectedParcelId)
├── components/
│   ├── Header.tsx             wordmark + Run Handover / Reset
│   ├── SummaryPanel.tsx        4 editorial figures + Events Over Time chart
│   ├── EventsOverTimeChart.tsx  lazy-loaded — see "Bundle size" below
│   ├── HandoverBoard.tsx       Pending / Collected columns
│   ├── ShelfMap.tsx            spatial shelf rack, incl. now-empty shelves
│   ├── EventTimeline.tsx       E01→E02→... strip + Rejected Events detail
│   ├── EventTable.tsx          the editable event log
│   ├── ParcelLabel.tsx         shared parcel-card, reused by Board + Shelf Map
│   ├── Panel.tsx               shared bordered-panel chrome
│   ├── OutcomeBadge.tsx, EmptyState.tsx, ValidationBanner.tsx
│   ├── ui/                     shadcn/ui primitives (@base-ui/react-based)
│   └── charts/                 Bklit area-chart, installed from the ui.bklit.com registry
├── lib/                     domain layer — pure TypeScript, framework-independent
│   ├── types.ts                Event, HandoverResult, ValidationError, ...
│   ├── validation.ts            full-table structural validation
│   ├── processor.ts             processHandover() — the event engine
│   ├── selectors.ts             summary / pending / collected / shelf map / events-over-time
│   ├── sampleData.ts            the canonical 6-event fixture
│   ├── constants.ts             pickup-code regex, outcome sets, outcome descriptions
│   └── motion.ts                shared Motion variants (presentation only)
└── tests/
    ├── domain/                  Vitest — exact-assertion domain tests
    └── ui/                      RTL — component rendering/interaction tests
e2e/
├── handover.spec.ts          the 6 required acceptance scenarios
├── accessibility.spec.ts     axe-core sweep (WCAG 2 A/AA) + reduced-motion check
└── keyboard-nav.spec.ts      keyboard-only primary flow
reference/
└── final-ui.png              visual design reference
docs/
├── PLAN.md                   phase-by-phase implementation plan (de facto spec)
├── DECISIONS.md               engineering decisions + why
├── SYSTEM-DESIGN.md           conceptual production architecture (never implemented)
├── PROMPTS.md                  AI-prompting session log
└── TEST-EVIDENCE/              recorded test-run output and screenshots
```

## Testing

Three layers:

1. **Vitest** (`src/tests/domain/`) — exact-assertion tests of the domain
   engine: the canonical 6-event oracle, corrected E03, E06 collision,
   empty input, duplicate event ID, pickup-code regex edge cases,
   source-order processing, every outcome type, and the `getShelfMap`/
   `getEventsOverTime` selectors.
2. **RTL** (`src/tests/ui/`) — renders the real `<App />` in jsdom and
   drives it through user-event interactions: Run Handover, validation
   display, editing-doesn't-mutate-prior-result, Reset, empty states.
3. **Playwright** (`e2e/`) — the same 6 acceptance scenarios end-to-end in
   a real browser, an automated accessibility sweep, a reduced-motion
   check, and a keyboard-only flow. Dev-time/CI only — Playwright is never
   a runtime dependency of the shipped app.

Run everything:

```bash
npm run test
npm run test:e2e
```

## Bundle size

The production build splits into three chunks: a `react-vendor` chunk
(React itself, cached independently of app code across deploys), the main
app chunk, and an async chunk for `EventsOverTimeChart` — that chart pulls
in Bklit's area-chart machinery plus its d3/visx dependency chain, and is
lazy-loaded so it's only fetched once a Run Handover result actually
exists, not on first paint. See `vite.config.ts`'s `manualChunks` and
`SummaryPanel.tsx`'s `React.lazy()` usage.

## Stack

Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui
(`@base-ui/react`-based) · Motion (`motion/react`) · Bklit area-chart ·
Vitest · React Testing Library · Playwright.
