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

## Run it locally

The origin stack runs in Docker; the edge Worker runs on its native Cloudflare
runtime (`wrangler dev`) since it can't be containerized.

```bash
# 1. Origin + frontend: Postgres, Redis, Django (:8000), Vite (:5173)
make up            # == docker compose up --build

# 2. Edge Worker (:8787) — separate terminal
cp worker/.dev.vars.example worker/.dev.vars   # add your Axiom token; the
                                               # SHARED_SECRET default already
                                               # matches the dev origin
make worker        # == cd worker && npx wrangler dev --port 8787
```

Then open http://localhost:5173, shorten a URL, and visit the returned
`localhost:8787/<code>` link — the first hit warms Workers KV from the origin,
the next is served straight from the edge. `make test` runs all three suites.

## Status
✅ Phase 1 — core spine: create + edge redirect + click event. (See `PLAN.md`.)
