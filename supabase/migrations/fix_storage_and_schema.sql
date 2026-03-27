-- Comprehensive Fix Script
-- 1. Fix Profile Picture Upload (Create 'avatars' bucket)
-- 2. Fix Redemption Error (Reload schema cache)

-- Part 1: Create 'avatars' Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Part 2: Set up RLS Policies for 'avatars'
-- Allow public read access to avatars
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- Part 3: Force Schema Cache Reload (Fix for Redemption Error)
-- This notifies PostgREST to refresh its cache of the database schema
NOTIFY pgrst, 'reload schema';
