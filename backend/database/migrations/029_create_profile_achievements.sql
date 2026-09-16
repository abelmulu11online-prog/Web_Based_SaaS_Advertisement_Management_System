-- 029_create_profile_achievements.sql
-- Awards, certifications, and accomplishments profiles can advertise.
-- Examples: programming competition win, AWS certification, major project completion.

CREATE TABLE IF NOT EXISTS profile_achievements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning profile
  profile_id      UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- Achievement identity
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     TEXT        CHECK (char_length(description) <= 2000),

  -- Details
  date            DATE,
  organization    TEXT,       -- who issued/awarded it
  certificate_url TEXT,       -- link to certificate or proof
  external_link   TEXT,       -- any relevant external link

  -- Display
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order      INTEGER     NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievements_profile_id ON profile_achievements (profile_id);
CREATE INDEX IF NOT EXISTS idx_achievements_published  ON profile_achievements (profile_id, is_published) WHERE is_published = TRUE;
