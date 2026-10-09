# Council

A multi agent planning tool that makes AI deliberation visible. Instead of one model giving one answer, three specialist agents argue out a real decision, a weekend trip, a dinner plan, a group budget call, in front of the user, then a moderator agent merges their positions into a final plan with the trade offs stated out loud.

Built with FastAPI, PostgreSQL, React and Google Gemini, using a hand-rolled async orchestration loop with no agent framework.

## Features

- **Two-round debate.** Budget, Logistics and Vibe propose in parallel, then react to each other; the Moderator makes the call and logs who won each trade-off.
- **Structured output.** Every agent turn and the final plan are validated against Pydantic schemas.
- **Live, shared plans.** The debate streams over Server-Sent Events; friends in a plan watch the same debate, replayed in order.
- **Accounts and characters.** Retro-styled characters dressed for each scene, pets, friends and invite links.
- **Journeys and maps.** Routes split by travel mode on free OpenStreetMap services, as an animated journey or a live map.
- **Share the decision.** A story-style recap, a quick take or an image card, plus a public read-only recap link.

## Repository layout

```
council/
├── backend/                FastAPI service
│   ├── app/                API, orchestration loop, agents, LLM client, accounts, shared plans
│   ├── migrations/         SQL migrations, applied in order by scripts/migrate.py
│   ├── scripts/            migrate, try_budget, run_scenarios
│   ├── tests/              pytest suite (real Postgres, model calls stubbed)
│   └── requirements.txt
├── frontend/               React + Vite single-page app
│   ├── src/components/     pages and UI (planner, debate, verdict, share sheet, journey)
│   ├── src/components/art/ SVG characters, scenes, vehicles, maps
│   ├── src/hooks/          debate stream and journey hooks
│   └── src/*.js            API client, scenes, story writer, share card, geo helpers
├── docs/                   product, architecture, data model and build plan
├── AGENTS.md               the four agents' prompts and the debate protocol
├── docker-compose.yml      local Postgres
├── render.yaml             one-click Render deploy (one service + database)
└── .github/workflows/      CI
```

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | Product scope, the user, what is in and out |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, orchestration loop, models, streaming, sharing, maps |
| [AGENTS.md](AGENTS.md) | The four agent personas, system prompts and debate protocol |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Database schema |
| [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | The phased build order |

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
   cp .env.example .env                          # then open .env and paste your Groq key after GROQ_API_KEY=
   .venv/bin/python -m scripts.migrate
   .venv/bin/uvicorn app.main:app --reload --port 8787
   ```
   `backend/.env` is gitignored on purpose: it holds your key, so it exists only on your machine and never appears on GitHub.
   Check http://localhost:8787/health: `llm_key_configured` should be `true`.
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
- Accounts: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /me`, `PUT /me` (display name, avatar and email; an empty email clears it).
- Friends: `GET /users/search?q=`, `POST /friends/requests`, `GET /friends`, `POST /friends/{id}/accept`, `DELETE /friends/{id}`.
- Shared plans (bearer token required): `POST /plans`, `GET /plans`, `GET /plans/{id}`, `POST /plans/{id}/members`, `POST /plans/join`, `GET /plans/{id}/stream`, `DELETE /plans/{id}` (the owner deletes it for everyone, anyone else leaves), `POST /plans/{id}/share` (a public recap code).
- Recaps (no sign-in): `GET /recap/{code}` returns the brief, members' names and characters, the debate events and the decision. Recap codes are separate from invite codes, so a shared recap never lets anyone join the plan.
- Plan constraints also accept `origin` and `dest` as `{lat, lon, label}`, so everyone in a plan sees the same route.

## How the app looks and feels

- **Accounts.** Create an account (username and password, email optional so friends can find you; change it later under Account in the editor), then design your character: body, eight skin tones, ten hairstyles and colours, eyes, brows, facial hair, glasses, headwear, top, bottoms, shoes, and a pet (dog, cat or rabbit, with breeds and a name). It is stored on the server, so it is the same on every device.
- **Characters.** Drawn in a retro textured style (flat colour, halftone shadows, paper grain) by `frontend/src/components/art/figure.js`. In any scene but Open road, everyone changes into that scene's outfit: a slip dress or blazer for a date, palm print and slides at the beach, fleece and beanies under the stars, puffers in the snow, and so on, with colours varied across a group.
- **Friends.** Search by username, name or exact email, send and accept requests, or share an invite link (copy it or open a prepared email).
- **Plan together.** Pick friends in the planner; their real characters join your crew. Everyone in the plan sees the same debate and decision live, from their own device. Anyone else can join with the plan's invite link.
- **Your crew.** "Just me" shows you waving, "Two of us" a couple holding hands, three or more a walking group with luggage (up to five drawn, plus "+N"). Your pet walks with you.
- **Scenes that follow the brief.** `frontend/src/scenes.js` matches the brief and switches the whole backdrop: Date night, Beach day, Into the hills, Under the stars, Snow trip, Celebration, Night out, Food run, Road trip or Open road. The people count is picked up from the brief too. You can pin a scene by hand.
- **Getting there.** Choose the travel modes the group is open to (own car, self-drive, bike, cab, state bus, private bus, train, flight, local only) or let the council decide. The agents are told to plan only with those.
- **Journey and map.** Type a starting point or tap the locate button to use your current location, then a destination. The trip is split into legs from the travel modes you picked (ride to the meetup then drive, cab to the airport then fly, train with a cab at each end) and drawn two ways: an animated zig-zag journey where the vehicle swaps at every change, and a real OpenStreetMap map with the route. Places come from OpenStreetMap Nominatim, roads from OSRM, tiles from CARTO; all free, and the app falls back to a built-in list of places when they are unreachable. "Open directions" hands the route to Google Maps.
- **Share the decision.** From the verdict, share a story-style recap (the ask, everyone's pitch, the clash, the call, who won what), a one-line quick take, or an image card in story (9:16) or post (4:5) size, to WhatsApp, Instagram, Messages, Mail, Telegram, X, the device's share menu, or the clipboard. The message links to a read-only recap page anyone can open without an account.
- **Plans.** Your plans and the ones you were added to. Owners can delete a plan for everyone; members can leave.
- **Debate and verdict.** A group chat over the scene, then a boarding-pass ticket with the total, a budget bar, the route and stamped trade-offs.
- Everything is drawn in SVG and CSS, and all motion stops when the device asks for reduced motion.

## Your checklist

Things only you can do, in order:

1. Revoke the Gemini key that was committed in `d88c8dd` and create a new one in Google AI Studio.
2. Locally: `docker compose up -d db`, put the new key in `backend/.env` (copy from `.env.example`), run the migration.
3. Run `python -m scripts.try_budget`, then `python -m scripts.run_scenarios`. If a model name is rejected, set the correct ID in `SPECIALIST_MODEL` / `MODERATOR_MODEL`.
4. Open the app (`npm run dev`) and run the three demo scenarios in the browser.
5. Deploy: on Render, New → Blueprint, pick this repo, paste `GROQ_API_KEY` from console.groq.com and `GEMINI_API_KEY` from aistudio.google.com (and `GOOGLE_CLIENT_ID`, see below). One free web service serves the site and the API on the same URL, next to a free Postgres.
6. Record the screen capture of a full session for the LinkedIn post.

## Deploy

Render (free): `render.yaml` builds the root `Dockerfile`, which compiles the React app and has FastAPI serve it, so the site and API share one URL (no CORS, no cross-service hostnames). Migrations run when the container starts. Free instances sleep after 15 idle minutes; the first request then takes up to a minute, and the sign-in page says so instead of failing.

Supabase instead of Render Postgres: copy the connection string from Supabase (Project Settings → Database, the pooler URI), set it as `DATABASE_URL` on the service, and remove the `databases` block. SSL and pooler settings are applied automatically.

Google sign-in: in Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID of type *Web application*, add your site URL (for example `https://council.onrender.com`, and `http://localhost:5173` for local work) under *Authorized JavaScript origins*, then set `GOOGLE_CLIENT_ID` on the server. The button appears automatically once it is set. Returning users stay signed in for 30 days on the same device, and Google remembers them for one-tap sign-in after that.

Models: Council runs on Groq's free tier by default. Specialists use `SPECIALIST_MODEL` (default `openai/gpt-oss-20b`), the Moderator uses `MODERATOR_MODEL` (default `openai/gpt-oss-120b`). If Groq errors, times out or hits its rate limit, the same call is retried on Gemini automatically (`GEMINI_API_KEY`, models `GEMINI_SPECIALIST_MODEL` / `GEMINI_MODERATOR_MODEL`). Leave `GEMINI_API_KEY` empty to run Groq only, or set `LLM_PROVIDER=gemini` to make Gemini primary. Both are environment variables so they can be changed without code edits.
