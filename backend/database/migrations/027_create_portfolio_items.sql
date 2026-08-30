-- 027_create_portfolio_items.sql
-- Work portfolio / completed projects that a profile can showcase.
-- Used by freelancers, professionals, construction companies, photographers, etc.

CREATE TABLE IF NOT EXISTS portfolio_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning profile
  profile_id        UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- Item identity
  title             TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description       TEXT        CHECK (char_length(description) <= 5000),

  -- Classification
  category          TEXT,       -- free-form category (e.g. "Web Development", "Construction")

  -- Project details
  client            TEXT,       -- optional client name
  project_url       TEXT,       -- link to live project
  completion_date   DATE,       -- when was this completed

  -- Discovery
  tags              TEXT[],
  is_featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order        INTEGER     NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_profile_id ON portfolio_items (profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_published  ON portfolio_items (profile_id, is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_portfolio_featured   ON portfolio_items (profile_id, is_featured)  WHERE is_featured  = TRUE;
