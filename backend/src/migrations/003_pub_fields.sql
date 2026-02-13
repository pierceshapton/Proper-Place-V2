-- Add pub-specific fields to places table
-- This allows hosts to specify location type and pub-specific information

-- Add place_type column to distinguish between different location types
ALTER TABLE places ADD COLUMN IF NOT EXISTS place_type VARCHAR(50) DEFAULT 'private_land';

-- Add pub-specific columns
ALTER TABLE places ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(100);
ALTER TABLE places ADD COLUMN IF NOT EXISTS kitchen_hours VARCHAR(100);
ALTER TABLE places ADD COLUMN IF NOT EXISTS food_menu_description TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS serves_food BOOLEAN DEFAULT false;

-- Create index on place_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_places_place_type ON places(place_type);

-- Add comment for documentation
COMMENT ON COLUMN places.place_type IS 'Location type: private_land, pub, farm, car_park, business, other';
COMMENT ON COLUMN places.opening_hours IS 'Opening hours in format HH:MM - HH:MM';
COMMENT ON COLUMN places.kitchen_hours IS 'Kitchen hours in format HH:MM - HH:MM';
COMMENT ON COLUMN places.food_menu_description IS 'Description of food offerings at pubs/restaurants';
COMMENT ON COLUMN places.serves_food IS 'Whether the location serves food';
