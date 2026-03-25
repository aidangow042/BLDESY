-- Add contact phone and email columns to jobs table
-- These allow customers to share their contact details with builders

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_email text;
