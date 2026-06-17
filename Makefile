.PHONY: help up down logs worker test

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-8s\033[0m %s\n", $$1, $$2}'

up: ## Start origin + frontend (Postgres, Redis, Django :8000, Vite :5173)
	docker compose up --build

down: ## Stop and remove containers
	docker compose down

logs: ## Tail all container logs
	docker compose logs -f

worker: ## Run the edge Worker locally on :8787 (needs worker/.dev.vars for AXIOM_TOKEN)
	cd worker && npx wrangler dev --port 8787

test: ## Run every test suite (backend, frontend, worker)
	cd backend && .venv/bin/pytest -q
	cd frontend && npm test
	cd worker && npm test
