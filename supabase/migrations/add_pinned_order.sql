-- Add pinned_order column to news table
ALTER TABLE news 
ADD COLUMN pinned_order INTEGER DEFAULT 100;

-- Update existing pinned news to have default order
UPDATE news SET pinned_order = 100 WHERE pinned_order IS NULL;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
