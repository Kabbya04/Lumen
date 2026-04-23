# Lumen backend (FastAPI)

Phase 1 shell: health/version endpoints, Docker Compose with Postgres + pgvector, and pydantic-settings.

## Prerequisites

- Python 3.11+ (3.13 recommended; matches the Docker image)
- Docker and Docker Compose

## Quick start with Docker

From the **repository root**:

```bash
docker compose up --build
```

- API: [http://localhost:8000/health](http://localhost:8000/health)
- OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

Postgres (with pgvector) is exposed on **`localhost:5433`** (mapped from container port 5432) so it does not collide with a Postgres already using `5432` on your machine. From the host, use `postgresql://lumen:lumen@localhost:5433/lumen`. Data is stored in the `lumen_pgdata` volume.

### Optional env file

Copy [`.env.example`](.env.example) to `.env` in this directory if you want local overrides. Compose sets `APP_ENV`, `APP_VERSION`, `CORS_ORIGINS`, and `DATABASE_URL` via `docker-compose.yml`; you can also pass variables from your shell or use `--env-file`.

### Pointing at Supabase instead of local Postgres

Set `DATABASE_URL` to your Supabase connection string (transaction pooler on port `6543` or session mode on `5432` per Supabase docs). When running the API **outside** Compose, export:

```bash
export DATABASE_URL="postgresql://..."
```

When using Compose, override the `api` service `environment.DATABASE_URL` in a `docker-compose.override.yml` or pass `-e DATABASE_URL=...` to `docker compose run` as needed. The Phase 1 app does not open a DB connection yet; the variable is wired for later phases and tooling consistency.

## Local development (without Docker for the API)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # optional
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Quality checks

```bash
cd backend
ruff check .
pytest
```

## Environment variables

See [`.env.example`](.env.example). Summary:

| Variable        | Description |
|----------------|-------------|
| `APP_ENV`      | `development`, `staging`, or `production` |
| `APP_VERSION`  | Shown by `/health` and `/version` |
| `CORS_ORIGINS` | Comma-separated origins; empty disables CORS middleware |
| `DATABASE_URL` | Postgres URL (used in later phases; optional for Phase 1) |
