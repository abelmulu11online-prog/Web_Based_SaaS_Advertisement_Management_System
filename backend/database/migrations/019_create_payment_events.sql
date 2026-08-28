-- 019_create_payment_events.sql
-- Immutable audit log of every webhook POST that Chapa sends to our server.
--
-- PURPOSE 1 — Audit trail:
--   Every webhook event is recorded here with its full payload.
--   If a payment is disputed or something goes wrong, you can see exactly
--   what Chapa sent and when we processed it.
--
-- PURPOSE 2 — Idempotency lock:
--   Chapa may deliver the same webhook more than once (network retries,
--   server restarts, etc.). The UNIQUE constraint on chapa_tx_ref means
--   only the FIRST INSERT succeeds. A second INSERT for the same tx_ref
--   fails with a unique violation (PostgreSQL error code 23505).
--   The webhook handler catches this and returns 200 without re-processing.
--
-- PURPOSE 3 — Distributed lock:
--   If two server instances receive the same webhook simultaneously,
--   only one INSERT wins. The other gets a 23505 error — a safe exit.
--   This prevents double-activation even under horizontal scaling.

CREATE TABLE IF NOT EXISTS payment_events (
  id            UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Our transaction reference from payment_records.tx_ref.
  -- UNIQUE: the second INSERT of the same tx_ref is rejected — that is intentional.
  chapa_tx_ref  TEXT        NOT NULL UNIQUE,

  -- The Chapa event type string, e.g. 'charge.completed'
  event_type    TEXT        NOT NULL,

  -- The complete raw webhook payload stored as JSON.
  -- Never redact this — it is needed for audit and reconciliation.
  payload       JSONB       NOT NULL,

  -- When our server processed this event
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Index ─────────────────────────────────────────────────────────────────────

-- The UNIQUE constraint creates this index automatically, but we name it
-- explicitly so its purpose is clear in database tooling.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_tx_ref
  ON payment_events (chapa_tx_ref);
