-- Create unavailable_periods table for managing when places are unavailable
CREATE TABLE IF NOT EXISTS unavailable_periods (
  id SERIAL PRIMARY KEY,
  place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means indefinite (open-ended)
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups by place
CREATE INDEX IF NOT EXISTS idx_unavailable_periods_place_id ON unavailable_periods(place_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_unavailable_periods_dates ON unavailable_periods(start_date, end_date);
