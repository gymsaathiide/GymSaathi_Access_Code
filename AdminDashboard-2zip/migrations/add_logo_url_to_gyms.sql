-- Add logo_url column to gyms table
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS logo_url TEXT;
