-- Force PostgREST to reload the schema cache
-- Run this in Supabase SQL Editor to fix "Could not find the column ... in the schema cache" error

NOTIFY pgrst, 'reload schema';
