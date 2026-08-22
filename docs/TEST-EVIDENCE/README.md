# Test Evidence

Recorded output from the three testing layers (docs/PLAN.md), captured
after the accessibility contrast fixes (see docs/DECISIONS.md), plus
screenshots of the app in each spec-mandated state.

## Vitest — domain (`src/tests/domain/`) + RTL (`src/tests/ui/`)

```
> hostel_parcel_desk@0.0.0 test
> vitest run

 RUN  v4.1.11 D:/Vishu/hostel_parcel_desk

 Test Files  5 passed (5)
      Tests  51 passed (51)
```

Breakdown: `validation.test.ts` (regex + structural rules), `processor.test.ts`
(canonical oracle, corrected E03, E06 collision, empty input, source-order,
every ARRIVE/COLLECT state rule, purity), `selectors.test.ts`,
`integration.test.ts` (validation→processing pipeline), and
`src/tests/ui/App.test.tsx` (8 RTL tests: initial render, Run Handover,
empty-table run, duplicate-ID validation, invalid-pickup-code validation,
edit-doesn't-mutate-prior-result, Reset, Add Event) — 43 domain + 8 UI = 51.

## Playwright — E2E (`e2e/`)

```
Running 9 tests using 9 workers

  ✓ 2. corrected E03 pickup code collects P01
  ✓ 3. E06 active-code collision excludes P04
  ✓ 1. built-in fixture matches the canonical oracle
  ✓ 5. a duplicate event ID blocks the run with zero partial output
  ✓ 4. running an empty table yields an explicit 0/0/0 — not a placeholder
  ✓ 6. Reset (no result) is visually distinct from an empty completed run
  ✓ accessibility › initial (pre-run) state has no detectable violations
  ✓ accessibility › validation error state has no detectable violations
  ✓ accessibility › after Run Handover has no detectable violations

  9 passed (5.1s)
```

The 6 `handover.spec.ts` tests are the acceptance scenarios required by
docs/PLAN.md, driven through the real browser UI. The 3
`accessibility.spec.ts` tests run an axe-core (WCAG 2 A/AA) sweep on the
pre-run, populated-result, and validation-error states — see
docs/DECISIONS.md for the 3 real contrast failures this caught and how
they were fixed.

## Build / type-check

```
$ npx tsc -b        # exit 0, no output
$ npm run build      # ✓ built in ~300ms, no TypeScript/console errors
```

## Screenshots

Captured via a headless-Chromium script driving the real dev server
(`npm run dev`), not mocked — each corresponds to a specific acceptance
scenario:

- `01-reset-pre-run-state.png` — the 6 built-in events loaded, before any
  run: summary tiles show "—", Outcomes/Board show "No result yet"
  placeholders (not 0/0/0) — the reset-vs-empty-run distinction at rest.
- `02-canonical-oracle-result.png` — after Run Handover on the unmodified
  built-in fixture: outcomes in source order (E03 = PICKUP_CODE_MISMATCH),
  board = Pending {P01, P03, P04} / Collected {P02}, summary 3/1/1,
  matching the canonical oracle exactly.
- `03-empty-table-run.png` — all rows deleted, then Run Handover: an
  explicit 0/0/0 summary and "Run completed — 0 events" copy, visually
  distinct from screenshot 01's pre-run placeholders.
- `04-duplicate-event-id-validation.png` — E06's ID changed to E05
  (colliding with row 5): validation banner names the exact event, field,
  and issue ("E05 · Event ID · Duplicate event ID: E05"); summary/outcomes/
  board all stay in their pre-run placeholder state — zero partial output.
