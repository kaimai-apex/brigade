-- 003 — Connections / follows

CREATE SCHEMA IF NOT EXISTS connections;

CREATE TABLE IF NOT EXISTS connections.connections (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    UUID NOT NULL,
    receiver_id  UUID NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_connections_receiver
  ON connections.connections(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_sender
  ON connections.connections(sender_id, status);

CREATE TABLE IF NOT EXISTS connections.follows (
    follower_id  UUID NOT NULL,
    followee_id  UUID NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee
  ON connections.follows(followee_id);
