-- Migration 022: add review_notes to discovery_review_queue
ALTER TABLE discovery_review_queue ADD COLUMN IF NOT EXISTS review_notes TEXT;
