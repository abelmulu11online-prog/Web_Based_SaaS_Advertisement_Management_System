-- 018_create_payment_records.sql
-- Tracks every payment attempt — from the moment the user clicks "Subscribe"
-- to the final SUCCESS or FAILED outcome.
--
-- One row is created (PENDING) when the user starts a checkout.
-- It is updated to SUCCESS by the webhook handler after Chapa confirms payment.
-- It stays PENDING (or is updated to FAILED) if the user abandons or payment fails.
--
-- This table is the bridge between our system and Chapa:
--   tx_ref  = our reference (we generate it)
--   chapa_tx_id = Chapa's reference (they provide it after payment)

-- ── Payment record status enum ────────────────────────────────────────────────
CREATE TYPE payment_record_status AS ENUM (
  'PENDING',  -- Checkout started. User has not completed payment yet.
  'SUCCESS',  -- Payment confirmed by Chapa Verify API.
  'FAILED'    -- Payment failed or expired without completion.
);

-- ── Main table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_records (
  id              UUID                  NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which user initiated this payment
  user_id         UUID                  NOT NULL
                     REFERENCES users (id) ON DELETE CASCADE,

  -- Which plan was being purchased
  plan_id         UUID                  NOT NULL
                     REFERENCES subscription_plans (id) ON DELETE RESTRICT,

  -- Our unique transaction reference — generated server-side as sub_{userId}_{timestamp}.
  -- NEVER accepted from the client.
  -- Used to match our record with the incoming Chapa webhook and verify call.
  tx_ref          TEXT                  NOT NULL UNIQUE,

  -- Chapa's own transaction ID — filled in by the webhook handler after payment.
  -- NULL until payment is confirmed.
  chapa_tx_id     TEXT,

  -- The ETB amount we sent to Chapa in the initialize call.
  -- Always taken from subscription_plans.price_etb — never from client input.
  amount_etb      NUMERIC(10, 2)        NOT NULL CHECK (amount_etb > 0),

  status          payment_record_status NOT NULL DEFAULT 'PENDING',

  -- Which payment method the user chose: 'telebirr', 'cbe_birr', etc.
  -- Filled by the webhook handler from Chapa's verify response.
  payment_method  TEXT,

  -- Full JSON response from Chapa's Verify API — stored for audit and debugging.
  -- Useful if a user disputes a charge: you can show exactly what Chapa returned.
  chapa_response  JSONB,

  created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ           NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- The UNIQUE constraint already creates an index on tx_ref.
-- Fast lookup by our transaction reference (used in webhook handler and fallback endpoint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_records_tx_ref
  ON payment_records (tx_ref);

-- Payment history page: "show all payments for this user"
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id
  ON payment_records (user_id);

-- Admin/reconciliation: "find all PENDING payments older than 24 hours"
CREATE INDEX IF NOT EXISTS idx_payment_records_status
  ON payment_records (status);
