-- 035_update_subscription_plans.sql
-- Replace marketplace-era limits with directory-era limits on subscription_plans.
-- Adds max_gallery_images and max_social_links columns.
-- Updates all plan values to match the new directory feature set.

-- Add new columns
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_gallery_images  INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_social_links    INTEGER NOT NULL DEFAULT 3;

-- Update Free plan
UPDATE subscription_plans SET
  max_profile_services  = 3,
  max_portfolio_items   = 2,
  max_posts             = 5,
  max_gallery_images    = 3,
  max_social_links      = 3,
  is_featured           = FALSE
WHERE name = 'FREE';

-- Update Basic plan
UPDATE subscription_plans SET
  max_profile_services  = 10,
  max_portfolio_items   = 10,
  max_posts             = 20,
  max_gallery_images    = 10,
  max_social_links      = 999,
  is_featured           = FALSE
WHERE name = 'BASIC';

-- Update Pro plan
UPDATE subscription_plans SET
  max_profile_services  = 50,
  max_portfolio_items   = 50,
  max_posts             = 100,
  max_gallery_images    = 30,
  max_social_links      = 999,
  is_featured           = TRUE
WHERE name = 'PRO';

-- Update Business plan
UPDATE subscription_plans SET
  max_profile_services  = 9999,
  max_portfolio_items   = 9999,
  max_posts             = 9999,
  max_gallery_images    = 9999,
  max_social_links      = 9999,
  is_featured           = TRUE
WHERE name = 'BUSINESS';
