-- Migration 021: discovery_review_queue
-- Auto-find scheduler places candidates here for manual star-rating before entering pipeline.

CREATE TABLE IF NOT EXISTS discovery_review_queue (
  id                          SERIAL PRIMARY KEY,
  google_place_id             TEXT,
  business_name               TEXT NOT NULL,
  location                    TEXT,
  latitude                    DECIMAL(10,7),
  longitude                   DECIMAL(10,7),
  website                     TEXT,
  google_rating               DECIMAL(3,1),
  google_reviews_count        INTEGER,
  discovery_fit_score         INTEGER NOT NULL DEFAULT 0,
  discovery_parking_confidence INTEGER NOT NULL DEFAULT 0,
  discovery_access_score      INTEGER NOT NULL DEFAULT 0,
  discovery_campervan_priority INTEGER NOT NULL DEFAULT 0,
  admin_notes                 TEXT,
  source                      TEXT NOT NULL DEFAULT 'discovery_auto_find',
  status                      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at                 TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_drq_status ON discovery_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_drq_created_at ON discovery_review_queue(created_at DESC);
