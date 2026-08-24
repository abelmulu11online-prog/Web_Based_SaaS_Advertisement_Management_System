-- 002_create_categories.sql
-- Hierarchical category tree. Supports unlimited depth via self-reference.
-- Examples: Home Services → Plumbing → Pipe Repair

CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL for top-level categories
  parent_id   UUID        REFERENCES categories (id) ON DELETE RESTRICT,

  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,

  -- Emoji or icon identifier used in UI
  icon        TEXT,

  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-referential index (parent → children lookups)
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug      ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories (is_active);
