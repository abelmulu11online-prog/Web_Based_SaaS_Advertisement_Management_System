-- 022_extend_subscription_plans.sql
-- Adds profile content limits to subscription plans.
-- Each plan now controls how many products, services, portfolio items,
-- and posts a profile owner can create.

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_products          INTEGER NOT NULL DEFAULT 3  CHECK (max_products          > 0);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_profile_services  INTEGER NOT NULL DEFAULT 3  CHECK (max_profile_services  > 0);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_portfolio_items   INTEGER NOT NULL DEFAULT 2  CHECK (max_portfolio_items   > 0);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_posts             INTEGER NOT NULL DEFAULT 5  CHECK (max_posts             > 0);

-- Update the seeded plans with appropriate limits
-- FREE:     3 products, 3 services, 2 portfolio, 5 posts
-- BASIC:    20 products, 10 services, 10 portfolio, 20 posts
-- PRO:      100 products, 50 services, 50 portfolio, 100 posts
-- BUSINESS: effectively unlimited (9999)

UPDATE subscription_plans SET
  max_products         = 3,
  max_profile_services = 3,
  max_portfolio_items  = 2,
  max_posts            = 5
WHERE name = 'FREE';

UPDATE subscription_plans SET
  max_products         = 20,
  max_profile_services = 10,
  max_portfolio_items  = 10,
  max_posts            = 20
WHERE name = 'BASIC';

UPDATE subscription_plans SET
  max_products         = 100,
  max_profile_services = 50,
  max_portfolio_items  = 50,
  max_posts            = 100
WHERE name = 'PRO';

UPDATE subscription_plans SET
  max_products         = 9999,
  max_profile_services = 9999,
  max_portfolio_items  = 9999,
  max_posts            = 9999
WHERE name = 'BUSINESS';
