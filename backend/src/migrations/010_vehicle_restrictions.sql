-- Add vehicle size restriction fields to places table
-- These fields allow hosts to specify maximum vehicle dimensions that can fit at their site

ALTER TABLE places
ADD COLUMN IF NOT EXISTS max_vehicle_height_ft DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS max_vehicle_width_ft DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS max_vehicle_length_ft DECIMAL(4,1);

-- Also add to pubs table for completeness
ALTER TABLE pubs
ADD COLUMN IF NOT EXISTS max_vehicle_height_ft DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS max_vehicle_width_ft DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS max_vehicle_length_ft DECIMAL(4,1);

COMMENT ON COLUMN places.max_vehicle_height_ft IS 'Maximum vehicle height in feet that can fit at this site';
COMMENT ON COLUMN places.max_vehicle_width_ft IS 'Maximum vehicle width in feet that can fit at this site';
COMMENT ON COLUMN places.max_vehicle_length_ft IS 'Maximum vehicle length in feet that can fit at this site';
