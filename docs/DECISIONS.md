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
