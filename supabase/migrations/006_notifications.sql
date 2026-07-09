-- 006 — Notifications

CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE IF NOT EXISTS notifications.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    type       TEXT NOT NULL,
    payload    JSONB NOT NULL,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications.notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS notifications.notification_preferences (
    user_id UUID PRIMARY KEY,
    in_app  BOOLEAN NOT NULL DEFAULT TRUE,
    push    BOOLEAN NOT NULL DEFAULT TRUE,
    email   BOOLEAN NOT NULL DEFAULT TRUE,
    sms     BOOLEAN NOT NULL DEFAULT FALSE
);
