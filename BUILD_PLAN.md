# Council, Build Plan

Each phase should be runnable and worth looking at before the next one starts. Do not let Claude Code jump ahead to the frontend before the orchestration loop actually works against the real API, a broken core loop hidden behind a polished UI is the worst version of this project to end up with two days before a demo.

## Phase 0, scaffold

Set up the repo structure, a backend folder for FastAPI and a frontend folder for the React app. Install dependencies. Set up environment variable handling for the Gemini API key, never commit it. Stand up a Postgres instance, local for development, and run the schema from DATA_MODEL.md as a migration. Confirm a basic FastAPI health check endpoint responds and a basic Vite React app renders, before any agent logic exists.

## Phase 1, one agent end to end

Build the Gemini API client wrapper, a single function that takes a system prompt and a user message and returns the structured JSON shape described in AGENTS.md, using Gemini's structured output support rather than manual parsing. Wire up just the Budget agent against a hardcoded test brief and confirm it returns a sane structured response from the real API. This phase exists to prove the core mechanic works before three agents and two rounds add complexity on top of it.

## Phase 2, full orchestration loop

Add Logistics and Vibe using the same client wrapper. Implement round one, all three called in parallel against the brief alone. Implement round two, all three called again with round one's output added to context. Implement the Moderator call on Gemini 3.7 Flash, taking the full transcript and returning the final plan shape. Persist every turn to agent_turns and the final result to final_plans as the loop runs. At the end of this phase, hitting one backend endpoint with a brief should produce a complete session in the database, start to finish, with no frontend involved yet.

## Phase 3, streaming

Convert the orchestration endpoint to a Server Sent Events stream, emitting one event per agent turn as it completes rather than returning everything at once at the end. Build the minimal frontend, a text input for the brief, a transcript panel that appends each agent turn as its event arrives, and a final plan card that renders once the moderator's synthesis event arrives. No styling polish yet, the goal of this phase is the live, watching it happen feel working end to end.

## Phase 4, demo polish

Style the transcript, a distinct color and label per agent, Budget, Logistics, Vibe, Moderator, so the debate is visually easy to follow at a glance. Add the final plan card design, the structured option plus the trade off log rendered clearly, not buried in prose. Run all three demo scenarios from PRD.md against the live system and fix anything that produces a weak or generic sounding transcript, since the specialist prompts in AGENTS.md may need tightening once real output is visible. Add basic error handling, if an agent call fails or times out, the UI should show that gracefully rather than hanging.

## Phase 5, deploy and capture

Deploy backend and Postgres, deploy frontend, confirm the deployed version works against all three demo scenarios, not just localhost. Record a screen capture of a full session running live, brief to final plan, for the LinkedIn post. Write the GitHub README with a short project description, the architecture diagram in words, and a link to the live demo if hosting costs allow it to stay up.

## What to explicitly skip for v1

Do not add a fourth agent. Do not add real booking or pricing APIs. Do not add user accounts. Do not add a round three. Each of these is a legitimate v2 idea once the core loop is proven and the demo has shipped, not before.
