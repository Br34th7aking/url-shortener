# url-shortener

Production-grade URL shortener — edge-first architecture.

- **Edge:** Cloudflare Worker + Workers KV does the redirect; fires click events to Axiom.
- **Origin:** Django + DRF (management + dashboard API) · Postgres (source of truth) · Redis (throttle, live-count, SSE pub/sub) · JWT auth.
- **Frontend:** React + TypeScript + Vite + React Query.
- **Practices:** TDD, tracer-bullet phasing, Docker, CI (GitHub Actions), OpenAPI.

See [`PLAN.md`](./PLAN.md) for the full master plan and phase breakdown.

## Layout
```
backend/   Django/DRF origin (Dockerized)
frontend/  React + TS SPA
worker/    Cloudflare Worker (edge redirect + Axiom ingest)
nginx/     reverse proxy
```

## Status
🚧 Phase 0 — walking skeleton (in progress).
