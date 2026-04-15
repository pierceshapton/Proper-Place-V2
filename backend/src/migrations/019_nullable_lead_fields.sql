-- Make host_leads personal fields nullable so CRM/KML imports work without contact info
ALTER TABLE host_leads ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE host_leads ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE host_leads ALTER COLUMN email DROP NOT NULL;
ALTER TABLE host_leads ALTER COLUMN phone DROP NOT NULL;
