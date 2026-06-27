-- Add dedupe_hash to reports with a UNIQUE constraint
ALTER TABLE reports ADD COLUMN IF NOT EXISTS dedupe_hash TEXT UNIQUE;
