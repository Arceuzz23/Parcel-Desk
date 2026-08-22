# System Design — Conceptual Production Architecture

> Conceptual production architecture — not implemented, P11 explicitly excludes
> backend/network services. Everything in this document is discussion only;
> none of it exists in the codebase.

## Purpose
This document exists to demonstrate system-design thinking beyond the scope of
the in-memory browser app, without violating the hard constraints in
`CLAUDE.md` and `docs/PLAN.md`. Nothing here should be implemented.

## Capacity Estimation
- TODO: estimate hostels, desks, parcels/day, peak concurrent handovers.

## API Design
- TODO: conceptual REST/RPC surface for event ingestion and board queries.

## Data Model / DB Schema
- TODO: Postgres schema for events, parcels, students, shelves, desks.

## Caching Strategy
- TODO: Redis usage for active pickup-code lookups, hot desk state.

## Concurrency
- TODO: double-collection race — two staff members collecting the same
  parcel simultaneously; locking/transaction strategy.

## Idempotency
- TODO: event ID as idempotency key for replay-safe ingestion.

## Event Sourcing Trade-off
- TODO: append-only event log vs. mutable current-state table; discuss
  replay/audit benefits vs. query complexity.

## Horizontal Scaling
- TODO: stateless API layer behind a load balancer, sharding by desk/hostel.

## Failure Handling
- TODO: partial write failures, retry semantics, dead-letter handling for
  malformed events.

## Observability
- TODO: metrics (handover latency, rejection rate), structured logging,
  tracing across ingestion → processing → board update.

## Security
- TODO: auth/authz for desk staff, audit trail for collections, PII handling
  for student names.
