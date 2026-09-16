-- 016_create_subscription_plans.sql
-- The subscription plan catalogue for Phase 6.
--
-- Stores the four tiers the platform offers:
--   FREE, BASIC, PRO, BUSINESS
--
-- Prices are in Ethiopian Birr (ETB).
-- Plans are stored in the database — changing a price means updating one row,
-- NOT redeploying the application.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Internal machine name — used in business logic comparisons (e.g. name = 'FREE')
  name              TEXT           NOT NULL UNIQUE
                      CHECK (name IN ('FREE', 'BASIC', 'PRO', 'BUSINESS')),

  -- Human-readable label shown to users in the UI
  display_name      TEXT           NOT NULL,

  -- Monthly price in Ethiopian Birr.
  -- FREE plan = 0.00 ETB. Must be non-negative.
  price_etb         NUMERIC(10, 2) NOT NULL DEFAULT 0.00
                      CHECK (price_etb >= 0),

  -- Maximum number of advertisements the user may have in PUBLISHED status at once
  max_active_ads    INTEGER        NOT NULL CHECK (max_active_ads > 0),

  -- Maximum number of images per individual advertisement
  max_images_per_ad INTEGER        NOT NULL CHECK (max_images_per_ad > 0),

  -- TRUE for PRO and BUSINESS — their ads show a "Featured" badge in listings
  is_featured       BOOLEAN        NOT NULL DEFAULT FALSE,

  -- FALSE means the plan is retired and cannot be subscribed to.
  -- Existing subscribers keep the plan; new checkouts are blocked.
  is_active         BOOLEAN        NOT NULL DEFAULT TRUE,

  -- Controls the display order on the /pricing page (lower = shown first)
  sort_order        INTEGER        NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ── Seed the four plans ───────────────────────────────────────────────────────
-- ON CONFLICT DO NOTHING makes the seed safe to re-run (idempotent).
-- The four plan rows are the source of truth for all limit enforcement.

INSERT INTO subscription_plans
  (name, display_name, price_etb, max_active_ads, max_images_per_ad, is_featured, sort_order)
VALUES
  ('FREE',     'Free',      0.00,    1,   3,  FALSE, 0),
  ('BASIC',    'Basic',     99.00,   5,   5,  FALSE, 1),
  ('PRO',      'Pro',       299.00,  20,  10, TRUE,  2),
  ('BUSINESS', 'Business',  799.00,  100, 10, TRUE,  3)
ON CONFLICT (name) DO NOTHING;
