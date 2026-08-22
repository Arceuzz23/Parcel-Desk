# System Design — Conceptual Production Architecture

> Conceptual production architecture — not implemented, P11 explicitly excludes
> backend/network services. Everything in this document is discussion only;
> none of it exists in the codebase.

## Purpose
This document exists to demonstrate system-design thinking beyond the scope of
the in-memory browser app, without violating the hard constraints in
`CLAUDE.md` and `docs/PLAN.md`. Nothing here should be implemented.

## Capacity Estimation
Assume a mid-size university housing system: 50 hostels, each with one
parcel desk, each desk handling ~150 parcel events/day (arrivals + collections
combined) during move-in-adjacent peaks, ~30/day at baseline. That's
~7,500 events/day system-wide at peak, ~1,500 at baseline — call it
~10 events/sec at the single busiest minute of a single busiest desk
(a delivery truck drop-off spike), not an aggregate load problem. This is a
low-QPS, bursty-per-desk workload, not a high-throughput system: the
interesting constraints are correctness under concurrent desk staff and
data durability, not raw scale. A single small Postgres instance with
read replicas per region would be over-provisioned for years.

## API Design
A conceptual REST surface, one resource per domain concept:

- `POST /desks/{deskId}/events` — append one event (ARRIVE or COLLECT) to a
  desk's log. Idempotent on `eventId` (see Idempotency below). Returns the
  single `EventOutcome` for that event — not a full re-run of the desk's
  history, since production events arrive one at a time in real time, not
  as a batch table edit like this app's UI.
- `GET /desks/{deskId}/board` — current pending/collected board state +
  summary, computed the same way `processHandover()` does here, but
  incrementally maintained rather than replayed from scratch on every
  request (see Event Sourcing Trade-off).
- `GET /desks/{deskId}/events?since=...` — paginated event log, for audit
  and for rebuilding board state after a cache miss or bug-driven replay.

Deliberately no `PUT`/`DELETE` on events — the event log is append-only;
correcting a mistake means appending a new event, not editing history
(mirrors this app's "no mutation" domain principle, extended to durability).

## Data Model / DB Schema
Postgres, roughly:

```
desks(id, hostel_id, name)
students(id, hostel_id, name)
events(id, desk_id, event_id_external, action, parcel_id, student_id,
       pickup_code, shelf, created_at, created_by_staff_id)
  unique(desk_id, event_id_external)   -- idempotency + duplicate-ID rejection
parcels(id, desk_id, parcel_id_external, state, pickup_code, shelf,
        arrived_event_id, collected_event_id)
  unique(desk_id, parcel_id_external)
```

`parcels` is a materialized projection of `events` (see Event Sourcing
below) — `state` is `PENDING`/`COLLECTED`, updated transactionally
whenever a new event resolves to `ARRIVED`/`COLLECTED`. `events` alone is
sufficient to rebuild `parcels` from scratch; `parcels` exists purely as a
read-optimization so `GET /board` doesn't replay the full log per request.

## Caching Strategy
Redis (or equivalent) for the one genuinely hot lookup: "is this pickup
code currently active for this desk?" — the same check `processHandover()`
does in-memory via a `Map` here, but needed at request time in production
to reject an `ACTIVE_CODE_COLLISION` in milliseconds without a full-table
scan. Key: `desk:{id}:active-code:{code}` → parcel ID, TTL-free (removed on
collection, not expired), invalidated transactionally alongside the
Postgres write so cache and DB never disagree about which codes are live.
Board summary counts could be cached too, but at this QPS a direct query is
simpler and the cache would mostly add invalidation bugs for no real
latency win.

## Concurrency
The double-collection race — two staff members at different terminals both
scan the same pickup code within the same second — is the one concurrency
bug worth designing for explicitly. Mitigation: `COLLECT` is a single
transactional `UPDATE parcels SET state = 'COLLECTED', ... WHERE
parcel_id = $1 AND state = 'PENDING'` — the `WHERE state = 'PENDING'` guard
makes it a compare-and-swap. Whichever request's UPDATE affects 0 rows
lost the race and gets `PARCEL_NOT_PENDING` (an honest, correct outcome —
by the time it ran, the parcel genuinely wasn't pending anymore), not a
500 or a double-collected parcel. No explicit locking needed; Postgres row
versioning (MVCC) handles it.

## Idempotency
`eventId` (the human-entered "E01"-style ID in this app, or a
client-generated UUID in a real terminal app) is the idempotency key,
enforced via the `unique(desk_id, event_id_external)` constraint above. A
retried network request that resubmits the same event returns the
previously-computed outcome rather than reprocessing — important because
"COLLECT" is not naturally idempotent (running it twice would try to
collect an already-collected parcel and get a confusing rejection) unless
the API recognizes "I've seen this exact event ID before" and short-circuits.

## Event Sourcing Trade-off
The append-only `events` log (mirroring this app's `Event[]` input) is the
source of truth; `parcels` is a derived, mutable projection. Trade-off:
replay/audit is trivial (need to know why a parcel is in a given state?
replay its events) and matches this app's domain model exactly, but every
new query shape (e.g. "how long do parcels typically sit pending?") means
either a new projection or an expensive log scan — there's no free
flexible querying the way a normalized mutable-state table would give you.
Given the audit trail requirement (who collected what, when, with what
code) is a hard requirement for a parcel desk regardless, event sourcing
is the right trade here: the audit log isn't a nice-to-have bolted onto a
mutable-state design, it's the design.

## Horizontal Scaling
At the estimated load, a single API instance behind a load balancer,
stateless (all state in Postgres/Redis), would comfortably serve every
desk in the system — horizontal scaling here is about *availability*, not
throughput. Sharding by `desk_id` (or `hostel_id`) if it ever mattered:
each desk's events are independent of every other desk's, so there's no
cross-shard transaction ever required, which is what makes this an easy
system to scale if it needed to be — it just doesn't, at this load.

## Failure Handling
A malformed event (the production equivalent of this app's
`ValidationError`) is rejected synchronously at the API boundary with the
same structural-vs-state distinction this app enforces — a request that
fails structural validation is rejected outright (4xx, nothing written);
a request that fails a *state* rule (`PARCEL_NOT_PENDING`, etc.) is
accepted and durably recorded with that outcome, because that's a
legitimate, auditable event in the desk's history, not an error. Partial
write failures (DB write succeeds, cache invalidation fails) are handled
by treating Postgres as the source of truth and Redis as a best-effort
cache: a cache/DB mismatch self-heals on the next write to that key,
and a periodic reconciliation job (or a cache-aside read-through on miss)
bounds how long any mismatch can persist.

## Observability
Metrics: event-processing latency (p50/p99), rejection rate by outcome
type (a spike in `ACTIVE_CODE_COLLISION` might mean a pickup-code
generation bug upstream, not desk-staff error), events/sec per desk.
Structured logs: one log line per processed event, including its outcome
— effectively the same `EventOutcome` shape this app already produces,
just persisted instead of only rendered. Tracing: a span per request from
ingestion through validation through the state-machine decision through
the DB write, so a slow `COLLECT` can be attributed to lock contention vs.
cache lookup vs. network rather than guessed at.

## Security
Desk staff authenticate per-terminal (shared desk login is realistic here
— it's a physical front desk, not a personal account); authorization is
desk-scoped, so a staff member's session can only write events for their
own desk, not query or mutate another hostel's board. Every event already
carries an audit trail by construction (event sourcing above) — who
processed which parcel, when. Student names are the only PII in this
domain; they'd be encrypted at rest and excluded from any metrics/logging
pipeline (log the parcel ID and outcome, never the student name) to keep
the audit trail useful for operations without turning application logs
into a PII store.
