-- 003_create_locations.sql
-- Geographic information for provider profiles.
--
-- Uses plain NUMERIC columns for lat/lng for now.
-- Designed so a PostGIS `geography` or `geometry` column can be added
-- later via a separate migration (ALTER TABLE ... ADD COLUMN geog GEOGRAPHY(...))
-- without restructuring this table.

CREATE TABLE IF NOT EXISTS locations (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Administrative hierarchy (coarse → fine)
  country       TEXT,
  region        TEXT,           -- state / province / governorate
  city          TEXT,
  subcity       TEXT,           -- district / borough
  neighborhood  TEXT,           -- quarter / kebele / ward

  -- Street-level address
  address       TEXT,

  -- WGS-84 decimal degrees.
  -- Valid range: latitude -90..90, longitude -180..180
  latitude      NUMERIC(10, 7)  CHECK (latitude  BETWEEN -90  AND 90),
  longitude     NUMERIC(10, 7)  CHECK (longitude BETWEEN -180 AND 180),

  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Indexes used for future geo-search and filtering by area
CREATE INDEX IF NOT EXISTS idx_locations_city      ON locations (city);
CREATE INDEX IF NOT EXISTS idx_locations_region    ON locations (region);
CREATE INDEX IF NOT EXISTS idx_locations_country   ON locations (country);
CREATE INDEX IF NOT EXISTS idx_locations_lat_lng   ON locations (latitude, longitude);
