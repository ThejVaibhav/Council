-- Schema from DATA_MODEL.md
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    brief_text  text NOT NULL,
    constraints jsonb,
    status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'complete', 'failed'))
);

CREATE TABLE agent_turns (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent          text NOT NULL CHECK (agent IN ('budget', 'logistics', 'vibe', 'moderator')),
    round          integer CHECK (round IN (1, 2)),
    option_title   text,
    description    text,
    estimated_cost numeric,
    stance         text CHECK (stance IN ('propose', 'support', 'flag')),
    commentary     text NOT NULL DEFAULT '',
    created_at     timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX agent_turns_session_created_idx ON agent_turns (session_id, created_at);

CREATE TABLE final_plans (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    title          text NOT NULL,
    description    text NOT NULL,
    estimated_cost numeric,
    summary        text NOT NULL,
    trade_off_log  jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at     timestamptz NOT NULL DEFAULT now()
);
