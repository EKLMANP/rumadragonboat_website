-- Add i18n columns to news table
ALTER TABLE news 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS excerpt_en TEXT,
ADD COLUMN IF NOT EXISTS content_en JSONB DEFAULT '[]'::jsonb;
