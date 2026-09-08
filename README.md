# Permitting Status Log

A permitting/task tracker for civil engineering projects. Originally a single
static HTML file talking directly to Supabase from the browser; now split
into a Python (FastAPI) backend and a React frontend, both deployed to
Vercel.

## Architecture

- **`api/`** — FastAPI backend. Owns all reads/writes to the Supabase
  `projects`, `tasks`, `task_attachments`, and `hidden_playbooks` tables and
  the `task-attachments` storage bucket, using the Supabase **service-role**
  key. This key never reaches the browser. Deployed as a single Vercel
  Python function (`api/index.py`).
- **`web/`** — React + TypeScript + Vite frontend. Talks to the backend for
  all data, and calls the Supabase Edge Function `extract-approval` directly
  (unchanged from the original app) for the AI document-autofill feature,
  using the public **anon** key.
- **Supabase** — Postgres (tables above) + Storage (attachments) + the
  `extract-approval` Edge Function, all unchanged from before this
  migration.

## Local development

Backend:

```bash
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
uvicorn app.main:app --reload --port 8000
```

Frontend (in a separate terminal):

```bash
cd web
cp ../.env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:8000` (see
`web/vite.config.ts`), so the frontend can be developed against a locally
running backend.

## Deploying to Vercel

1. Import this repo into Vercel. `vercel.json` at the repo root routes
   `/api/*` to the Python function and serves the built frontend
   (`web/dist`) for everything else.
2. Set environment variables in the Vercel project:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — backend only.
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — used at build time by
     the frontend.
3. Vercel installs `api/requirements.txt` for the Python function
   automatically and runs the `buildCommand` in `vercel.json` for the
   frontend.

## What changed vs. the original

- All Supabase table/storage access moved server-side (FastAPI, service-role
  key). The browser no longer holds a key capable of writing directly to
  the database, so Supabase Row Level Security on these tables can be
  locked down to deny anon access entirely.
- The AI document-autofill feature (`extract-approval` Edge Function) is
  untouched and still called directly from the browser with the anon key —
  it's unrelated to the tables/storage the backend now owns.
- The custom vanilla-JS dropdown widgets were replaced with native
  `<select>` / `<input list="...">` elements — same data and behavior,
  simpler implementation, minor cosmetic difference in the dropdown arrow.
