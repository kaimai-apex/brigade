-- 011 — Background jobs
--
-- Postgres-backed rather than Redis-backed. The reference uses Redis because
-- Rails does, but a Postgres queue buys transactional enqueueing: a job can be
-- written in the same transaction as the row it operates on, so a rollback
-- cannot leave a job pointing at a record that was never created. That is the
-- most common source of "the worker says the record is missing".
--
-- Rollback: DROP TABLE brigade.jobs CASCADE; DROP TYPE brigade.job_state;

CREATE TYPE brigade.job_state AS ENUM ('queued', 'running', 'succeeded', 'failed', 'dead');

CREATE TABLE brigade.jobs (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  queue         TEXT        NOT NULL,
  worker        TEXT        NOT NULL,
  args          JSONB       NOT NULL DEFAULT '{}'::jsonb,

  state         brigade.job_state NOT NULL DEFAULT 'queued',
  attempts      SMALLINT    NOT NULL DEFAULT 0,
  max_attempts  SMALLINT    NOT NULL DEFAULT 5,
  run_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at     TIMESTAMPTZ,
  locked_by     TEXT,
  last_error    TEXT,

  -- Set by callers that must not enqueue the same work twice (a second
  -- "recompute degrees for profile X" while one is already pending is waste).
  -- Partial-unique below, so NULL means "no deduplication".
  dedupe_key    TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,

  CONSTRAINT jobs_queue_valid
    CHECK (queue IN ('default', 'push', 'ingress', 'mailers', 'pull', 'scheduler'))
);

CREATE UNIQUE INDEX jobs_dedupe
  ON brigade.jobs (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND state IN ('queued', 'running');

-- The claim query orders by queue weight then run_at, so this covers the hot path.
CREATE INDEX jobs_claim
  ON brigade.jobs (state, run_at)
  WHERE state = 'queued';

CREATE INDEX jobs_reap
  ON brigade.jobs (state, locked_at)
  WHERE state = 'running';

-- ---------------------------------------------------------------------------
-- Claim one job, honouring queue weights.
--
-- The weights are the point: without them a 50,000-row import starves every
-- notification in the system and users think the site is broken. Weight is
-- applied as an ordering key, so a heavier queue is always drained first while
-- lighter queues still make progress whenever the heavy ones are empty.
--
-- SKIP LOCKED is what lets many workers claim concurrently without blocking
-- each other on the same row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brigade.claim_job(worker_name TEXT)
RETURNS SETOF brigade.jobs
LANGUAGE sql
VOLATILE
AS $$
  UPDATE brigade.jobs SET
    state = 'running',
    attempts = attempts + 1,
    locked_at = now(),
    locked_by = worker_name
  WHERE id = (
    SELECT j.id FROM brigade.jobs j
    WHERE j.state = 'queued' AND j.run_at <= now()
    ORDER BY
      CASE j.queue
        WHEN 'default'   THEN 1
        WHEN 'push'      THEN 2
        WHEN 'ingress'   THEN 3
        WHEN 'mailers'   THEN 4
        WHEN 'pull'      THEN 5
        WHEN 'scheduler' THEN 6
      END,
      j.run_at,
      j.id
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
$$;

-- A worker that dies mid-job leaves the row locked forever. Anything held past
-- the timeout goes back on the queue; workers are idempotent, so re-running is
-- safe and losing the job is not.
CREATE OR REPLACE FUNCTION brigade.reap_stalled_jobs(timeout_seconds INT DEFAULT 300)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  reaped INT;
BEGIN
  WITH stalled AS (
    UPDATE brigade.jobs SET state = 'queued', locked_at = NULL, locked_by = NULL
    WHERE state = 'running'
      AND locked_at < now() - make_interval(secs => timeout_seconds)
    RETURNING id
  )
  SELECT count(*) INTO reaped FROM stalled;
  RETURN reaped;
END;
$$;
