-- 017_create_user_subscriptions.sql
-- Tracks which subscription plan each user is currently on.
--
-- One row per user, always. The UNIQUE constraint on user_id makes it
-- impossible for a user to ever have two active subscriptions simultaneously.
--
-- Status transitions:
--   FREE    → ACTIVE   (user pays via Chapa — webhook sets this)
--   ACTIVE  → EXPIRED  (daily cron job sets this when current_period_end passes)
--   EXPIRED → ACTIVE   (user pays again — same as first-time payment)

-- ── Subscription status enum ──────────────────────────────────────────────────
CREATE TYPE subscription_status AS ENUM (
  'FREE',     -- On the free plan. No payment required. No expiry date.
  'ACTIVE',   -- On a paid plan. current_period_end is in the future.
  'EXPIRED'   -- Paid plan has lapsed. Ads are paused. User must renew.
);

-- ── Main table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                   UUID                NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to users. UNIQUE = one subscription per user, always.
  -- CASCADE = deleting the user also deletes their subscription row.
  user_id              UUID                NOT NULL UNIQUE
                          REFERENCES users (id) ON DELETE CASCADE,

  -- FK to the plan this user is currently on.
  -- RESTRICT = cannot delete a plan that has active subscribers.
  plan_id              UUID                NOT NULL
                          REFERENCES subscription_plans (id) ON DELETE RESTRICT,

  status               subscription_status NOT NULL DEFAULT 'FREE',

  -- NULL for FREE plan users — the free plan has no billing period.
  -- Set to NOW() when a payment is confirmed.
  current_period_start TIMESTAMPTZ,

  -- NULL for FREE plan users — the free plan never expires.
  -- Set to NOW() + 30 days when a payment is confirmed.
  -- The cron job checks this daily to find expired subscriptions.
  current_period_end   TIMESTAMPTZ,

  created_at           TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- The UNIQUE constraint already creates an index on user_id.
-- Explicit index for clarity and to document its purpose.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sub_user_id
  ON user_subscriptions (user_id);

-- Used by the cron job and admin queries: "find all ACTIVE subscriptions"
CREATE INDEX IF NOT EXISTS idx_user_sub_status
  ON user_subscriptions (status);

-- Partial index — only rows that have a period_end set (paid plans).
-- Used by the cron job: "find all ACTIVE subscriptions past their end date"
CREATE INDEX IF NOT EXISTS idx_user_sub_period_end
  ON user_subscriptions (current_period_end)
  WHERE current_period_end IS NOT NULL;
