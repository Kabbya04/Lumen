# Lumen: Backend & Platform Implementation Plan

This document turns the production migration blueprint into an actionable, phased plan. **LLM inference, embeddings, and RAG retrieval are explicitly deferred** until a later phase; everything here prepares the API, data layer, auth, storage, and deployment so those features plug in cleanly.

---

## Table of Contents

1. [Target architecture (reference)](#target-architecture-reference)
2. [Scope and principles](#scope-and-principles)
3. [Phase 1: Backend shell & local development](#phase-1-backend-shell--local-development)
4. [Phase 2: Supabase Auth & protected API](#phase-2-supabase-auth--protected-api)
5. [Phase 3: Data model & migrations](#phase-3-data-model--migrations)
6. [Phase 4: Storage, uploads & document parsing (no LLM)](#phase-4-storage-uploads--document-parsing-no-llm)
7. [Phase 5: Hardening, observability & deployment](#phase-5-hardening-observability--deployment)
8. [Phase 6 (later): AI orchestration, embeddings & RAG](#phase-6-later-ai-orchestration-embeddings--rag)
9. [Open decisions](#open-decisions)
10. [Appendix: Environment variables (checklist)](#appendix-environment-variables-checklist)

---

## Target architecture (reference)

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | React (Vite), hosted on **Vercel** | UI/UX only; no secrets for server-side keys |
| Backend | **FastAPI** on **Render** or **Railway** | Orchestration, auth verification, parsing, future RAG |
| Database | **Supabase Postgres** + **pgvector** | Users (via Auth), document metadata, future vectors |
| Object storage | **Supabase Storage** | Original PDF/DOCX/TXT files |
| Auth | **Supabase Auth** (Google + email/password) | JWT issued to client; API validates JWT |
| CI/CD | **GitHub Actions** | Test and optionally build; deploy hooks to hosts |

**Future (out of scope for Phases 1–5):** Groq SDK for chat/summary/quiz; OpenAI `text-embedding-3-small` for chunk vectorization; vector search in Postgres.

---

## Scope and principles

- **In scope now:** FastAPI app layout, Docker-based local dev, JWT validation, schema/migrations, private file upload path, text extraction (PyMuPDF, python-docx) persisted for later use, health/readiness, CORS, basic rate limiting, GitHub Actions, deployment wiring.
- **Out of scope for now:** Calling Groq/OpenAI, generating summaries, quizzes, chat completions, embedding writes, and semantic search queries.
- **Security:** Service role key and DB credentials exist **only** on the backend. The frontend uses the Supabase **anon** key (and receives user JWTs from Supabase Auth)—never the service role.

---

## Phase 1: Backend shell & local development

### Goals

- A runnable FastAPI application with a clear project layout.
- Repeatable local environment (Docker Compose) so new contributors can start the API without manual Postgres installs.
- Documented configuration via environment variables (no secrets in code).

### Prerequisites

- Docker and Docker Compose installed locally.
- Python 3.11+ (or the version you standardize on) for local runs outside Docker, if desired.

### Tasks

1. **Repository layout**
   - Add a top-level `backend/` (or `api/`) directory containing:
     - Application package (e.g. `app/main.py` with FastAPI instance).
     - Optional `app/routers/` for route modules (`health`, later `documents`, etc.).
     - Optional `app/core/config.py` for settings.
   - Add `backend/requirements.txt` (or `pyproject.toml` with dependencies pinned conservatively).
   - Add `backend/.env.example` listing all required and optional variables (no real values).

2. **Minimal API surface**
   - Implement `GET /health` returning `{ "status": "ok" }` (or similar) for load balancers and uptime checks.
   - Implement `GET /version` or include version in `/health` (read from env or package metadata) for support/debugging.
   - Enable OpenAPI docs at `/docs` and `/redoc` (default FastAPI) for contract exploration.

3. **Configuration**
   - Use **pydantic-settings** (or equivalent) to load:
     - `APP_ENV` (`development` | `staging` | `production`).
     - `CORS_ORIGINS` (comma-separated list; empty in early phase is acceptable until Phase 5).
   - Fail fast on startup if critical vars are missing in production (define which vars become critical per phase).

4. **Docker Compose**
   - **Service: `api`**
     - Build from `backend/Dockerfile`.
     - Mount source for hot reload in development (optional) or use plain reload inside container.
     - Expose port (e.g. `8000`).
   - **Service: `db` (optional but recommended)**
     - Image: `postgres:16` (or aligned with Supabase major version when known).
     - Enable **`pgvector`** via image that includes it (e.g. `pgvector/pgvector:pg16`) or run `CREATE EXTENSION vector` in an init script so local DB matches production capabilities.
     - Named volume for data persistence.
     - Environment: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` documented in README or this plan’s appendix.
   - Document in root or `backend/README.md`: `docker compose up`, how to override `DATABASE_URL` to point at Supabase instead of local Postgres.

5. **Dockerfile**
   - Multi-stage optional; at minimum: non-root user, `pip install -r requirements.txt`, `uvicorn` entrypoint.
   - Production-oriented: no dev-only tools in final stage if using multi-stage.

6. **Quality baseline**
   - Add formatter/linter config (e.g. `ruff`) and a minimal test with `httpx` + `pytest` hitting `/health`.
   - Add a `Makefile` or scripts in `package.json` at repo root only if the team already uses them; otherwise document shell commands.

### Deliverables

- `backend/` tree with FastAPI app, Dockerfile, `requirements.txt`, `.env.example`.
- `docker-compose.yml` (repo root or `backend/`) that starts API + optional Postgres with pgvector.
- Short **backend README**: how to run locally, env vars, and how to switch DB target to Supabase.

### Acceptance criteria

- `docker compose up` (or documented equivalent) starts the API and returns 200 from `GET /health`.
- Local Postgres (if used) accepts connections and allows `CREATE EXTENSION IF NOT EXISTS vector`.
- No secrets committed; `.env` gitignored.

---

## Phase 2: Supabase Auth & protected API

### Goals

- Users sign in on the frontend via Supabase (Google and/or email); the **backend trusts only validated JWTs**.
- A reusable FastAPI dependency extracts the authenticated user id (`sub`) and rejects invalid or expired tokens.

### Prerequisites

- Supabase project created (free tier is fine).
- Auth providers enabled in Supabase dashboard (Google OAuth app credentials; email provider if used).
- JWT settings understood: issuer (`iss`), audience (`aud`) if you enforce it, and signing method (JWKS).

### Tasks

1. **Supabase project configuration**
   - Note **Project URL** and **anon** vs **service_role** keys (service role stays server-only).
   - Configure **Site URL** and **Redirect URLs** for local dev (`http://localhost:5173`) and future Vercel URLs.
   - Decide whether the API validates JWT using:
     - **JWKS URL** from Supabase (recommended for rotation), or
     - Shared **JWT secret** (simpler but coordinate with Supabase JWT settings).

2. **FastAPI JWT validation**
   - Implement a dependency (e.g. `get_current_user`) that:
     - Reads `Authorization: Bearer <token>`.
     - Verifies signature, `exp`, and optionally `iss` / `aud`.
     - Returns a small context object: at minimum `user_id` (string UUID from `sub`).
   - Map common failures to **401** (missing/invalid token) with stable error body (no token leakage).

3. **Protected routes**
   - Add `GET /me` (or `/users/me`) returning `{ "user_id": "..." }` and optionally claims you choose to expose (keep minimal).
   - Ensure OpenAPI shows security scheme (Bearer JWT) for protected routes.

4. **Testing**
   - Document manual test: obtain JWT from Supabase (e.g. sign in on a minimal page or Supabase dashboard tools) and `curl` the API with `Authorization` header.
   - Optional: pytest with a **mocked** JWT or short-lived test token strategy (avoid committing real keys).

5. **Service role usage (boundary)**
   - Do **not** use the service role in the JWT dependency; use it only for server-side Supabase Admin operations (Storage, optional admin DB) in later phases.
   - Document this split in code comments or internal doc.

### Deliverables

- Auth dependency module and protected `/me` route.
- Updated `.env.example`: `SUPABASE_URL`, JWT verification settings (JWKS URL or secret), and any `SUPABASE_SERVICE_ROLE_KEY` placeholder marked server-only.

### Acceptance criteria

- Valid Supabase user JWT → `GET /me` returns 200 with correct `sub`.
- Missing or malformed token → 401.
- Service role key never appears in frontend bundle or repo history.

---

## Phase 3: Data model & migrations

### Goals

- Persistent schema for documents (and optional text/chunks) aligned with future RAG, **without** embedding or LLM columns required yet.
- Migrations are versioned and applicable to local Postgres and Supabase.

### Prerequisites

- Phase 2 complete (you know `user_id` from JWT maps to Supabase `auth.users.id`).
- Choice of migration tool: **Supabase CLI migrations** and/or **Alembic** in the FastAPI repo (pick one source of truth to avoid drift).

### Tasks

1. **Extensions**
   - On Supabase and local DB: `CREATE EXTENSION IF NOT EXISTS vector;` (even if unused until Phase 6, so environments match).

2. **Core tables (recommended minimum)**

   **`documents`**

   - `id` (UUID, PK, default `gen_random_uuid()`).
   - `user_id` (UUID, NOT NULL) — matches Supabase Auth `sub`.
   - `title` (text, nullable or derived from filename).
   - `original_filename` (text).
   - `mime_type` (text).
   - `storage_bucket` (text, default constant) and `storage_object_path` (text) — path to file in Supabase Storage.
   - `status` (text or enum): e.g. `uploaded`, `processing`, `parsed`, `failed` (adjust to your workflow).
   - `parse_error` (text, nullable).
   - `created_at`, `updated_at` (timestamptz, defaults).

   **`document_text`** (optional but recommended before RAG)

   - `document_id` (UUID, FK → `documents.id`, ON DELETE CASCADE).
   - `extracted_text` (text) or split into pages if you want `document_pages` later.
   - `extracted_at` (timestamptz).
   - Unique constraint on `document_id` if one row per document.

   **`document_chunks`** (prepare for Phase 6; can be empty)

   - `id` (UUID, PK).
   - `document_id` (FK).
   - `chunk_index` (int).
   - `content` (text).
   - `embedding` (vector(N)) **nullable** until Phase 6, or omit column until then and add via migration—either is fine if documented.
   - `metadata` (jsonb, optional: page number, heading, etc.).

3. **Indexes**
   - `documents(user_id, created_at DESC)` for listing.
   - Future: IVFFlat/HNSW on `embedding` when populated (Phase 6).

4. **Row Level Security (RLS)**
   - **If the frontend never queries these tables directly** and only the FastAPI backend uses the service role or a direct Postgres connection: RLS can be minimal at first, but document the threat model.
   - **If any client-side Supabase queries touch `documents`**: enable RLS and policies so `user_id = auth.uid()` for select/insert/update as appropriate.

5. **Migration files**
   - One migration per logical change; name with timestamp or sequential id.
   - Document how to apply: `supabase db push` / `supabase migration up` or `alembic upgrade head`.

6. **Database connection from FastAPI**
   - Use **SQLAlchemy 2** + async driver, or **`asyncpg`** with a thin repository layer—match team preference.
   - Prefer **Supabase transaction pooler** (port 6543) or **PgBouncer** mode for serverless/worker-heavy deployments; session mode (5432) when using long-lived connections from a single container.
   - Connection string in env: `DATABASE_URL` (never commit).

### Deliverables

- Migration scripts creating tables and indexes.
- Small data access layer (repositories or CRUD functions) used by routes in Phase 4.
- Diagram or short prose in this doc or README: **user → documents → document_text → (future chunks/vectors)**.

### Acceptance criteria

- Migrations apply cleanly on fresh local Postgres and on a Supabase dev project.
- A test or script can insert a `documents` row tied to a fake `user_id` and read it back.

---

## Phase 4: Storage, uploads & document parsing (no LLM)

### Goals

- Authenticated users upload files; objects land in **private** Supabase Storage; metadata rows exist in Postgres.
- Server extracts **plain text** from PDF and DOCX (and optionally pass-through for TXT/MD) and stores it for later embedding—**no** calls to Groq/OpenAI.

### Prerequisites

- Phase 2–3 complete.
- Supabase Storage bucket created (private).
- Service role key available only to backend for Storage upload/delete if using server-side SDK.

### Tasks

1. **Storage bucket policy**
   - Bucket name convention (e.g. `documents`).
   - Path convention: `{user_id}/{document_id}/{sanitized_filename}` to avoid collisions and simplify audits.
   - Policies: only the owning user can read/write **if** using client uploads; if **server-only uploads** via service role, restrict public access and serve downloads through signed URLs or proxied API.

2. **Upload API design**
   - `POST /documents` (multipart): fields `file` + optional `title`.
   - Flow:
     1. Validate JWT → `user_id`.
     2. Validate MIME type and **max size** (enforce in FastAPI and align with Supabase limits).
     3. Generate `document_id` (UUID).
     4. Upload bytes to Storage at computed path (Supabase Python client or REST with service role).
     5. Insert `documents` row with `status = uploaded` or `processing`.
     6. Trigger parse step (sync or async—see below).

3. **Parsing pipeline (no AI)**
   - **PDF:** PyMuPDF (`fitz`) extract text; handle empty extraction (scanned PDFs) by setting `status = failed` or `parsed` with empty text and a clear `parse_error` / flag for “OCR needed later.”
   - **DOCX:** `python-docx` extract paragraphs.
   - **TXT / Markdown:** read as UTF-8 text with validation.
   - Write result to `document_text` (or update `documents` if you prefer a single table—less normalized).
   - Set `status = parsed` or `failed` with error message.

4. **Sync vs async**
   - **MVP:** synchronous parse inside the request if files are small and timeout limits are acceptable.
   - **Recommended for production shape:** return `202 Accepted` with `document_id` and process parse in a **background task** (FastAPI `BackgroundTasks` for single-worker MVP) or a **queue + worker** if you move to separate worker dyno later; store `status` transitions visibly for the UI.

5. **Read/list APIs**
   - `GET /documents` — paginated list for `user_id`.
   - `GET /documents/{id}` — metadata + parse status; **do not** return full extracted text in list if large—optional `?include_text=true` for detail view.

6. **Download / preview (optional in this phase)**
   - `GET /documents/{id}/download` returning redirect to **signed URL** or streaming through API (trade-off: bandwidth vs simplicity).

### Deliverables

- Upload, list, and detail endpoints wired to Storage + DB.
- Parsing module isolated (e.g. `app/services/extract.py`) for unit tests with fixture files.
- Updated `.env.example`: bucket name, max upload size, Supabase keys as applicable.

### Acceptance criteria

- End-to-end: authenticated upload of a small PDF and DOCX creates Storage object, `documents` row, and `document_text` with non-empty text when the file has extractable text.
- Unauthenticated upload returns 401.
- Large file or disallowed MIME returns **413** or **415** with clear errors.

---

## Phase 5: Hardening, observability & deployment

### Goals

- Production-safe defaults: CORS, limits, logging, health/readiness, CI, and deploy paths for Vercel (frontend) and Render/Railway (backend).

### Tasks

1. **CORS**
   - Configure allowed origins from env: production Vercel URL, preview URL pattern if feasible, `http://localhost:5173` for dev.
   - Disallow `*` when credentials or JWT in headers matter.

2. **Rate limiting**
   - Apply limits to `POST /documents` and auth-adjacent endpoints (e.g. per IP or per `user_id` using a simple in-memory limiter for single instance, or Redis later).

3. **Request size limits**
   - Uvicorn/Starlette configuration for max body size consistent with Supabase upload limits.

4. **Logging and correlation**
   - Structured JSON logs in production (level from env).
   - Optional `X-Request-ID` middleware; include `user_id` in logs only where GDPR/privacy policy allows.

5. **Readiness**
   - `GET /health` — lightweight (process up).
   - `GET /ready` — checks DB connectivity (and optionally Storage head request); return 503 if not ready.

6. **GitHub Actions**
   - Workflow on **pull_request** and **push** to `main`:
     - Backend: checkout, setup Python, cache deps, `ruff check`, `pytest`.
     - Optional: `docker build` for `backend/` to catch broken Dockerfiles.
   - Secrets: none required for public CI unless you add integration tests against a real Supabase project (usually optional).

7. **Deployment**
   - **Frontend (Vercel):** connect repo; set env `VITE_API_BASE_URL` (or your chosen name) to production API URL; ensure preview deployments point to staging API if you have one.
   - **Backend (Render/Railway):** set env vars from appendix; use same Docker image or native Python build per host docs; configure health check URL to `/health` or `/ready`.
   - Document **cold start** behavior on free tier and that long synchronous parses may timeout—links back to Phase 4 async recommendation.

8. **Documentation refresh**
   - Root README section: “Running full stack” with links to `backend/README` and Supabase setup checklist.

### Deliverables

- CI workflow file(s) under `.github/workflows/`.
- Production-oriented settings in FastAPI/uvicorn documented.
- Deployment checklist (can live at the end of this file or in README).

### Acceptance criteria

- CI passes on a clean clone.
- Staging/prod API passes `/ready` with DB connected.
- Frontend can call `/me` with a real JWT from deployed Supabase Auth (once wired).

---

## Phase 6 (later): AI orchestration, embeddings & RAG

### Goals (high level only)

- Port analysis and RAG-related logic from `lumen/src/lib/` (e.g. Groq client patterns, `rag.ts` behaviors) into Python services.
- Chunk `document_text`, call OpenAI embeddings, store vectors in `document_chunks.embedding`, create vector index.
- Expose endpoints: summarize, key points, Q&A, chat—each validating JWT, scoping to `user_id` and `document_id`.
- Secrets: `GROQ_API_KEY`, `OPENAI_API_KEY` only on server.

### Prerequisites

- Phases 1–5 complete; parsed text available in DB.
- Cost and rate limits understood for OpenAI/Groq.

### Tasks (outline)

1. Define chunking strategy (size, overlap, respect paragraphs/pages).
2. Batch embedding writes; backfill command for existing documents.
3. RPC or raw SQL for `similarity_search` with pgvector; parameterize `match_count` and filters.
4. Implement prompt templates server-side; no prompt injection from raw client strings without sanitization bounds.
5. Optional: job queue for long analyses; idempotency keys for “generate summary once per document version.”

This phase is intentionally brief here; expand in a separate doc when you start it.

---

## Open decisions

Record your choices here as you make them:

| Decision | Options | Notes |
|----------|---------|--------|
| Migration source of truth | Supabase CLI vs Alembic | Avoid maintaining both in parallel without automation. |
| DB access pattern | Direct Postgres vs Supabase client for data | Service role + REST vs SQLAlchemy/asyncpg. |
| Parse execution | Sync vs background worker | Free-tier timeouts favor async for large PDFs. |
| Client vs server Storage upload | Presigned upload vs API proxy | Presigned reduces API bandwidth; API proxy simplifies policy. |
| Include `document_text` in Phase 4 | Yes vs metadata-only | **Recommended yes** for smoother Phase 6. |

---

## Appendix: Environment variables (checklist)

Copy to `backend/.env.example` and tick off as phases complete.

**Phase 1**

- `APP_ENV`
- `CORS_ORIGINS` (optional until Phase 5)

**Phase 2**

- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET` *or* JWKS-derived verification config
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

**Phase 3**

- `DATABASE_URL` (pooler or direct per hosting choice)

**Phase 4**

- `SUPABASE_STORAGE_BUCKET` (or hardcode with constant in code—document either way)
- `MAX_UPLOAD_BYTES`
- Optional: `ALLOWED_MIME_TYPES` (comma-separated)

**Phase 5**

- Production `CORS_ORIGINS`
- `LOG_LEVEL`

**Phase 6 (later)**

- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `EMBEDDING_MODEL` (e.g. `text-embedding-3-small`)
- `EMBEDDING_DIMENSIONS` (must match pgvector column)

---

## Document history

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-04-04 | Initial detailed phased plan (backend-first, LLM deferred). |
