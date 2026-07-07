# ConnectPro — Documentation Set

Full specification and delivery plan for **ConnectPro**, an enterprise-scale professional networking platform (LinkedIn-style).

## Documents

| File | What's inside |
|---|---|
| [`PROJECT_DESCRIPTION.md`](./PROJECT_DESCRIPTION.md) | Product brief: goals, personas, capabilities, NFRs, scale targets, tech summary |
| [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) | Architecture, request/data flows, Kafka events, caching, security, observability, infra |
| [`MICROSERVICES_SPEC.md`](./MICROSERVICES_SPEC.md) | Per-service responsibilities, datastores, events, endpoints, contracts |
| [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | DDL for every store (PostgreSQL, Cassandra, MongoDB, OpenSearch) with indexes |
| [`API_SPEC.md`](./API_SPEC.md) | Versioned REST + WebSocket endpoint contracts, errors, pagination, rate limits |
| [`BUILD_PHASES.md`](./BUILD_PHASES.md) | Sequenced delivery plan (Phase 0–5) with scope + exit criteria |
| [`CURSOR_IMPLEMENTATION_PLAN.md`](./CURSOR_IMPLEMENTATION_PLAN.md) | Task-level checklist aligned to the build phases |

## Suggested reading order

1. `PROJECT_DESCRIPTION.md` — what and why
2. `SYSTEM_DESIGN.md` — how it fits together
3. `MICROSERVICES_SPEC.md` + `DATABASE_SCHEMA.md` + `API_SPEC.md` — the contracts
4. `BUILD_PHASES.md` → `CURSOR_IMPLEMENTATION_PLAN.md` — how to build it

## At a glance

- **Architecture:** microservices, event-driven (Kafka), cloud-native on AWS EKS
- **Stack:** Next.js/React/TS (web), NestJS/Node (services), Python (ML)
- **Data:** PostgreSQL · Cassandra · MongoDB · Redis · OpenSearch
- **Scale targets:** 100M users · 20M DAU · 500k req/s · 50M msgs/day · 10M posts/day
- **MVP:** Phases 1–2 (auth → profile → connect → post → feed → message)
