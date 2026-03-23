-- Optional lead_type column for Quick Add Lead
-- Run via idempotent script if lead_type already exists.
ALTER TABLE leads ADD COLUMN lead_type TEXT;
