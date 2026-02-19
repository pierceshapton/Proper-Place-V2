-- Add separate column for business images
ALTER TABLE places ADD COLUMN IF NOT EXISTS business_image_urls TEXT[];

-- Add comment for clarity
COMMENT ON COLUMN places.business_image_urls IS 'URLs to business-specific photos (menu, storefront, etc)';
