-- Add booking reference column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_ref VARCHAR(20) UNIQUE;

-- Create index for fast reference lookups
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_ref);

-- Backfill existing bookings with references (PP-YYMMDD-XXXX)
DO $$
DECLARE
  rec RECORD;
  ref_val TEXT;
  yy TEXT;
  mm TEXT;
  dd TEXT;
  seq INT;
BEGIN
  FOR rec IN SELECT id, created_at FROM bookings WHERE booking_ref IS NULL ORDER BY id LOOP
    yy := to_char(rec.created_at, 'YY');
    mm := to_char(rec.created_at, 'MM');
    dd := to_char(rec.created_at, 'DD');
    seq := rec.id;
    ref_val := 'PP-' || yy || mm || dd || '-' || LPAD(seq::TEXT, 4, '0');
    UPDATE bookings SET booking_ref = ref_val WHERE id = rec.id;
  END LOOP;
END $$;
