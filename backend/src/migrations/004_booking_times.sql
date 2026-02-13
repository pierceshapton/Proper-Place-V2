-- Add check-in and check-out time columns to bookings
-- Default check-in/check-out time is 12:00 (midday)

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS early_checkin_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_checkout_fee DECIMAL(10,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN bookings.check_in_time IS 'Time of check-in, default 12:00 midday';
COMMENT ON COLUMN bookings.check_out_time IS 'Time of check-out, default 12:00 midday';
COMMENT ON COLUMN bookings.early_checkin_fee IS 'Extra fee for check-in before 12:00';
COMMENT ON COLUMN bookings.late_checkout_fee IS 'Extra fee for check-out after 12:00';
