# Council, Data Model

No user accounts in v1, so every table keys off a session rather than a user. This keeps the schema small and avoids building auth before there is anything worth gating behind it.

## sessions

id, uuid, primary key.
created_at, timestamp.
brief_text, the raw text the user submitted.
constraints, jsonb, optional structured fields, budget, headcount, dates, location, parsed from or alongside the free text brief.
status, text, one of pending, in_progress, complete, failed.

## agent_turns

id, uuid, primary key.
session_id, foreign key to sessions.
agent, text, one of budget, logistics, vibe, moderator.
round, integer, one or two, null for the moderator's synthesis turn which is not part of either round.
option_title, text, nullable.
description, text, nullable.
estimated_cost, numeric, nullable.
stance, text, one of propose, support, flag, nullable for the moderator.
commentary, text, the free text shown in the transcript.
created_at, timestamp, used to order the transcript as it streams in.

## final_plans

id, uuid, primary key.
session_id, foreign key to sessions, one row per session once synthesis completes.
title, text.
description, text.
estimated_cost, numeric, nullable.
summary, text, the plain language paragraph.
trade_off_log, jsonb, a list of objects, each with agents_involved, the disagreement, and which_concern_won.
created_at, timestamp.

## users (added in migration 002)

id, uuid. username, unique, 3 to 20 lowercase letters, digits, dots and underscores. email, unique, optional, used so friends can find you. display_name. password_hash, scrypt with a per-user salt. avatar, jsonb, the character from the editor (body, skin, hair, face, outfit, extras, and a pet with kind, breed and name), validated by backend/app/avatar.py. created_at.

## auth_tokens

token, primary key, random. user_id. created_at. expires_at, 30 days after sign-in. Sent as a bearer token.

## friendships

requester_id, addressee_id, status pending or accepted, created_at. One row per pair; accepting flips the status.

## sessions, new columns

owner_id, the user who created the plan. invite_code, unique, for invite links. scene, the backdrop the owner saw, so every member sees the same one.

## plan_members

session_id, user_id, role owner or member, joined_at. Only members can read or stream a plan. Members can add their accepted friends; anyone else joins with the invite code.

## session_events

id, session_id, seq, type, payload jsonb, created_at. Every event the debate emits, in order. A member who opens a plan late replays these and then follows the live stream, so everyone sees the same debate.

## Notes on this schema

agent_turns intentionally holds both rounds and every agent in one table rather than splitting by round or by agent, since the transcript UI needs to render them in a single time ordered stream, and a single table with a round column makes that query trivial. final_plans is kept separate from agent_turns rather than treating the moderator's synthesis as just another turn, because the frontend needs to fetch the final plan on its own for the summary card without pulling the entire transcript.
