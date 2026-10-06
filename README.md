# Council

A multi agent planning tool that makes AI deliberation visible. Instead of one model giving one answer, three specialist agents argue out a real decision, a weekend trip, a dinner plan, a group budget call, in front of the user, then a moderator agent merges their positions into a final plan with the trade offs stated out loud.

## Why this project

Most consumer AI tools hide the reasoning and show only the output. Council does the opposite. The product is the argument, not just the answer. That is also the right technical story for a portfolio piece, since it demonstrates actual multi agent orchestration, structured agent to agent communication, and model selection per role, not a single prompt wrapped in a UI.

## Document index

PRD.md, the product scope, the user, what is in and out for the MVP.

ARCHITECTURE.md, the system design, the orchestration loop, model choice per agent, streaming approach.

AGENTS.md, the four agent personas, their system prompts, and the debate protocol.

DATA_MODEL.md, the database schema.

BUILD_PLAN.md, the phased build order for Claude Code to execute against.

## How to use this with Claude Code

Point Claude Code at BUILD_PLAN.md first and ask it to execute Phase 0, then proceed phase by phase, referencing ARCHITECTURE.md and AGENTS.md as it builds each component. Do not ask it to build everything in one shot, the phased order exists because each phase should be runnable and demoable before the next one starts.

## Local development

Prerequisites: Python 3.11+, Node 20+, and Docker (or your own Postgres 16).

Ports are picked to stay clear of the usual defaults, so Council can run next to other projects:

| Service | Port | Change it with |
| --- | --- | --- |
| Postgres (Docker) | 55432 | `COUNCIL_DB_PORT` when running `docker compose`, plus `DATABASE_URL` in `backend/.env` |
| Backend (FastAPI) | 8787 | the `--port` flag on uvicorn, plus `COUNCIL_API_URL` for the frontend |
| Frontend (Vite) | 5288 | `COUNCIL_WEB_PORT`, plus `CORS_ORIGINS` in `backend/.env` |

1. Start Postgres:
   ```
   docker compose up -d db
   ```
2. Backend, in one terminal:
   ```
   cd backend
   python -m venv .venv
   .venv/bin/pip install -r requirements.txt     # Windows: .venv\Scripts\pip
   cp .env.example .env                          # then open .env and paste your key after GEMINI_API_KEY=
   .venv/bin/python -m scripts.migrate
   .venv/bin/uvicorn app.main:app --reload --port 8787
   ```
   `backend/.env` is gitignored on purpose: it holds your key, so it exists only on your machine and never appears on GitHub.
   Check http://localhost:8787/health: `gemini_key_configured` should be `true`.
3. Frontend, in a second terminal:
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Open http://localhost:5288. In dev, `/api/*` is proxied to the backend, so no key or backend URL reaches the browser bundle.

Checks, from `backend/`:

- `.venv/bin/python -m pytest` runs the offline tests (model calls stubbed, needs Postgres).
- `.venv/bin/python -m scripts.try_budget` runs the Budget agent once against the real Gemini API.
- `.venv/bin/python -m scripts.run_scenarios` runs the three PRD demo scenarios end to end against the real API and prints each transcript and its duration.

## API

- `POST /sessions/stream` with `{"brief": "...", "constraints": {...}}` streams Server Sent Events: `session`, `round_start`, `turn` (one per specialist turn), `agent_error` (an agent failed or timed out, the debate continues), `moderator_start`, `final_plan`, then `done` or `error`.
- `POST /sessions` runs the same debate without streaming and returns all events at once.
- Both return `429` when `MAX_CONCURRENT_DEBATES` debates are already running, and `422` for an invalid brief or constraints (`budget`, `headcount`, `dates`, `location`, all optional).
- Gemini rate limits and server errors are retried with backoff inside each agent's time budget; a failed call does not stop the debate.
- `GET /sessions/{id}` returns the saved session, transcript, and final plan.

## How the app looks and feels

- **Profile first.** On first visit you pick a name, a character (woman, man, or prefer not to say) and a skin tone. It is stored in the browser's localStorage on that device only; there are still no accounts.
- **Your crew.** The people selector draws you waving for "Just me", a couple holding hands for "Two of us", and a walking group with luggage for three or more (up to five drawn, plus a "+N" badge).
- **Scenes that follow the brief.** As you type, `frontend/src/scenes.js` matches the brief against keyword lists and switches the whole backdrop: Date night (velvet, rising hearts, roses), Beach day (animated sea, fish, caps, shorts, seafood), Into the hills, Under the stars, Snow trip, Celebration, Night out, Food run, Road trip, or the default Open road. Outfits change with the scene. You can pin a scene by hand from the "Scene" menu. The same file also picks up a people count from the brief ("six friends", "a date").
- **Debate and verdict.** The debate is a group chat over the dimmed scene; the Moderator's decision is a boarding-pass ticket with the total, a bar against your budget, and stamped trade-offs.
- Everything is drawn in SVG and CSS, with no image files, and all motion stops when the device asks for reduced motion.

## Your checklist

Things only you can do, in order:

1. Revoke the Gemini key that was committed in `d88c8dd` and create a new one in Google AI Studio.
2. Locally: `docker compose up -d db`, put the new key in `backend/.env` (copy from `.env.example`), run the migration.
3. Run `python -m scripts.try_budget`, then `python -m scripts.run_scenarios`. If a model name is rejected, set the correct ID in `SPECIALIST_MODEL` / `MODERATOR_MODEL`.
4. Open the app (`npm run dev`) and run the three demo scenarios in the browser.
5. Deploy: create the Render blueprint from `render.yaml`, set `GEMINI_API_KEY` and `CORS_ORIGINS`; import `frontend/` into Vercel with `VITE_API_BASE` set to the Render URL; then set `CORS_ORIGINS` to the Vercel URL.
6. Record the screen capture of a full session for the LinkedIn post.

## Deploy

Backend and Postgres: `render.yaml` is a Render blueprint (runs migrations before each deploy). Set `GEMINI_API_KEY` and `CORS_ORIGINS` (the frontend's URL) in the Render dashboard.
Frontend: deploy `frontend/` to Vercel (build `npm run build`, output `dist`) with `VITE_API_BASE` set to the backend URL.

Models: specialists use `SPECIALIST_MODEL` (default `gemini-3.5-flash`), the Moderator uses `MODERATOR_MODEL` (default `gemini-3.7-flash`). Both are environment variables so they can be changed without code edits.
