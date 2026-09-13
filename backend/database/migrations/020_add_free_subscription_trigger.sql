-- 020_add_free_subscription_trigger.sql
-- Automatically assigns every new user to the FREE plan at the database level.
--
-- WHY a trigger instead of application code?
--   A database trigger fires for EVERY insert into `users`, regardless of
--   where that insert comes from — your API, a seed script, an admin tool,
--   a test file, or a future migration that creates users directly.
--   Application-level code only fires when you remember to call it.
--   The trigger cannot be forgotten.
--
-- RESULT:
--   Every user always has exactly one row in user_subscriptions.
--   Enforcement logic (publish gate, image limit) never needs to handle
--   a "user has no subscription" edge case — it simply doesn't exist.

-- ── Trigger function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION assign_free_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Look up the FREE plan's UUID.
  -- Migration 016 seeds this row before this trigger is created.
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'FREE'
  LIMIT 1;

  -- Guard: if the FREE plan row doesn't exist for some reason, do not fail
  -- the user INSERT — just skip. This is a safety net, not normal operation.
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO user_subscriptions (user_id, plan_id, status)
    VALUES (NEW.id, free_plan_id, 'FREE');
  END IF;

  -- RETURN NEW is required for AFTER triggers — it signals PostgreSQL
  -- that the original INSERT on `users` should proceed normally.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Attach the trigger to the users table ─────────────────────────────────────
-- AFTER INSERT: the trigger fires after the user row is committed, so
-- the user.id FK reference in user_subscriptions is always valid.
-- FOR EACH ROW: runs once per inserted user (not once per statement).
CREATE TRIGGER trg_assign_free_subscription
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION assign_free_subscription();
