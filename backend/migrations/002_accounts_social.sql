-- Accounts, friends and shared plans.

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username      text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_.]{3,20}$'),
    email         text UNIQUE,
    display_name  text NOT NULL,
    password_hash text NOT NULL,
    avatar        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_tokens (
    token      text PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens (user_id);

CREATE TABLE friendships (
    requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);
CREATE INDEX friendships_addressee_idx ON friendships (addressee_id);

ALTER TABLE sessions
    ADD COLUMN owner_id    uuid REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN invite_code text UNIQUE,
    ADD COLUMN scene       text;

CREATE TABLE plan_members (
    session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, user_id)
);
CREATE INDEX plan_members_user_idx ON plan_members (user_id);

-- Every event the debate emits, in order, so anyone in the plan can replay it or follow it live.
CREATE TABLE session_events (
    id         bigserial PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    seq        integer NOT NULL,
    type       text NOT NULL,
    payload    jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (session_id, seq)
);
