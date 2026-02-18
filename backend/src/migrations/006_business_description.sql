-- Add business_description field to places table
-- This allows hosts to describe their business and services offered

ALTER TABLE places ADD COLUMN IF NOT EXISTS business_description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN places.business_description IS 'Description of business services, goods, menus, opening times etc offered to guests';
