# Council, Architecture

## Stack

Frontend, React with Vite, plain CSS or Tailwind, no component library needed for something this small. Backend, FastAPI. Database, Postgres, SQLite is acceptable for local development but the demo deployment should run Postgres since it is one less thing to swap later. Model access, Groq's OpenAI-compatible API directly (free tier, generous token limits), with the Google Gemini API kept as a switchable alternative (LLM_PROVIDER=gemini), no agent framework in v1. A hand rolled orchestration loop is both simpler to reason about and a stronger thing to explain in an interview than a framework call nobody can see inside.

## Why no framework

LangGraph, CrewAI, and similar tools exist for this exact pattern, but for a three agent, two round debate, the actual orchestration logic is maybe 150 lines of Python, a loop that calls the API, collects structured output, and feeds the previous turns into the next call's context. Writing that by hand means every part of the system is something that was actually built, not configured, which matters both for learning and for the story told about the project afterward. A framework becomes worth it past four or five agents or branching conversation paths, neither applies here.

## Model choice per agent

The three specialist agents, Budget, Logistics, and Vibe, run on GPT-OSS 20B via Groq (SPECIALIST_MODEL, default openai/gpt-oss-20b). Their job in each turn is narrow, propose or react from one fixed perspective, which does not need the most expensive model, and keeping them fast matters since three of them run per round and the user is watching live.

The Moderator agent runs on GPT-OSS 120B via Groq (MODERATOR_MODEL, default openai/gpt-oss-120b). Its job is harder, read the full transcript, resolve genuine disagreements between the three specialists, and produce a coherent final plan with an honest trade off log. That step is the one place in the pipeline where reasoning quality visibly shows up in the output, so it gets the stronger model.

## Orchestration flow

The user submits a brief, free text plus optional structured constraints, budget figure, headcount, dates.

Round one, proposal. The backend calls all three specialist agents in parallel, each with only the brief in context, no knowledge yet of the other two agents' output. Each returns one or two concrete options from its own lens, in a structured JSON shape, plus a short free text rationale.

Round two, reaction. The backend calls all three specialist agents again, this time with the brief plus all three round one outputs in context. Each agent reacts specifically to the other two, flags a conflict if one exists, for example Budget flags that Vibe's pick is over budget, and may revise its own position.

Synthesis. The Moderator receives the full two round transcript and produces the final plan, a structured option, a short list of named trade offs, each one stating which agent's concern won and why, and a one paragraph summary in plain language.

Each call's output is streamed to the frontend as it completes, agent turns appear as they are generated rather than after the whole pipeline finishes, so the user is watching the debate happen rather than waiting on a loading spinner.

## Streaming approach

Server Sent Events from FastAPI to the React frontend, one event per agent turn as it completes. This is simpler than a websocket for this use case since the data only flows one direction, server to client, and FastAPI's native streaming response handles it without extra infrastructure.

## Structured output

Each specialist turn returns JSON with fields for option_title, short description, estimated cost where relevant, and a one line stance, plus a separate free text field for the human readable commentary the UI displays in the transcript. Use Gemini's structured output support (response_schema, from Pydantic models in backend/app/schemas.py) to enforce this shape rather than parsing free text, since a malformed field breaking the UI mid demo is the single worst failure mode to leave unguarded.

## Guardrails

Hard cap of two rounds, no open ended back and forth, both for latency and for API cost. A timeout per agent call, if one agent fails to return, the orchestrator proceeds with the other two and the Moderator notes the gap rather than the whole pipeline hanging. No live external data, agents reason from the brief and general world knowledge only in v1, which removes an entire class of API key and rate limit failure modes right before a demo.

## Deployment

Frontend on Vercel, backend on Render or Railway, Postgres as a managed instance on the same platform as the backend. Keep the Gemini API key server side only, never exposed to the frontend bundle.

## Accounts and shared plans

Added after v1 at the product owner's request. Users sign up with a username and password (email optional, used for finding friends). Profiles and characters live in Postgres, so they look the same on every device.

A shared plan's debate no longer runs inside the HTTP request. POST /plans starts it as a background task; every event is written to session_events with a sequence number and fanned out through an in-process broker (backend/app/broker.py). GET /plans/{id}/stream replays the stored events and then follows the broker until the debate ends, so the owner and every invited friend see the identical transcript and verdict, live or after the fact. The broker is in-process, which assumes a single backend instance; scaling out would need Postgres LISTEN/NOTIFY or Redis in its place.

The original anonymous /sessions endpoints still exist for scripts and tests.

## Travel modes and routes

The planner sends the travel modes the group is open to as a constraint. The orchestrator turns them into an explicit instruction: plan only with these modes, and say so if none serves the destination.

Routes use free, keyless services straight from the browser (frontend/src/geo.js): OpenStreetMap Nominatim to find places and name the device's location, OSRM for road geometry and distance, and CARTO's OSM basemap for the map tiles (Leaflet, loaded lazily). Every call has a timeout, results are cached in localStorage, and when a service is unreachable the app falls back to the built-in gazetteer in frontend/src/places.js and straight-line estimates. planLegs() splits a trip into legs from the chosen modes (nearest real airports for flights, a station or bus stand near each end for rail and bus, a meetup point when a bike or walk leads into a car). When a plan starts, both ends are pinned as coordinates in the constraints so every member sees the same route.

## Sharing and recaps

frontend/src/story.js writes the share text from the transcript: a short story (the ask, round one's pitches, round two's reactions, the verdict with cost and route, who won what), a one-line quick take, and a plain-text email. Wording varies per plan from a seeded pick, so the same plan always reads the same. frontend/src/shareCard.js draws the image card on a canvas: the crew (rendered from the same SVG figures) in the scene's outfits, the opening pitches, the call, facts and stamps; it measures every block first so long titles or summaries never overflow.

POST /plans/{id}/share mints a share code (separate from the invite code) and GET /recap/{code} serves a read-only view without sign-in: the brief, members' display names and characters, the stored debate events and the decision. The frontend opens it at ?recap=CODE and replays the events through the same reducer the live view uses.
