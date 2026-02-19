-- Add status field to places table to track availability
ALTER TABLE places
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'unavailable'));

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_places_status ON places(status);
