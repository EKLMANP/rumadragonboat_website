-- RUMA Website Fix Script - V2 (Consolidated)
-- Includes:
-- 1. Redemption Record Schema Fix (Add product_id, update constraints)
-- 2. Avatars Bucket Creation (For profile pictures)
-- 3. Forced Schema Cache Reload

-- ==========================================
-- Part 1: Fix Redemption Records Schema
-- ==========================================
DO $$
BEGIN
    -- Add 'product_id' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_records' AND column_name = 'product_id') THEN
        ALTER TABLE public.redemption_records ADD COLUMN product_id UUID REFERENCES public.redeemable_products(id);
    END IF;

    -- Make 'reward_id' nullable (legacy support)
    ALTER TABLE public.redemption_records ALTER COLUMN reward_id DROP NOT NULL;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_redemption_records_product ON public.redemption_records(product_id);

-- ==========================================
-- Part 2: Fix Storage (Avatars Bucket)
-- ==========================================
-- Create 'avatars' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Public Read Access
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- RLS: Authenticated Upload Access
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- RLS: Authenticated Update Access
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- ==========================================
-- Part 3: Force Schema Cache Reload
-- ==========================================
NOTIFY pgrst, 'reload schema';
-- Fix for redemption_records table to support UUID product IDs
-- Run this in Supabase SQL Editor

-- 1. Add product_id column (UUID) to redemption_records
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_records' AND column_name = 'product_id') THEN
        ALTER TABLE public.redemption_records ADD COLUMN product_id UUID REFERENCES public.redeemable_products(id);
    END IF;
END $$;

-- 2. Make reward_id nullable (so we can insert records without it)
ALTER TABLE public.redemption_records ALTER COLUMN reward_id DROP NOT NULL;

-- 3. (Optional) Create index for performance
CREATE INDEX IF NOT EXISTS idx_redemption_records_product ON public.redemption_records(product_id);
-- Add delivered_by column to redemption_records table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_records' AND column_name = 'delivered_by') THEN
        ALTER TABLE public.redemption_records ADD COLUMN delivered_by TEXT;
    END IF;
END $$;
-- Migration: Add total_points column to members table
-- Purpose: Allow AuthContext to read M-points directly from the members profile
-- Date: 2026-02-10

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Optional: Sync existing point data from users table if any
-- UPDATE public.members m
-- SET total_points = COALESCE(u.total_points, 0)
-- FROM public.users u
-- WHERE m.email = u.email;
-- Force enable read access for everyone on activities table
-- This is a fix for the issue where members cannot see activities created by coaches

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view activities" ON activities;

-- Create a permissive policy for SELECT
CREATE POLICY "Everyone can view activities" 
ON activities 
FOR SELECT 
TO authenticated, anon 
USING (true);

-- Ensure activity_registrations is also viewable by users
ALTER TABLE activity_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own registrations" ON activity_registrations;

CREATE POLICY "Users can view own registrations" 
ON activity_registrations 
FOR SELECT 
TO authenticated 
USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management')
    )
);
-- Fix Attendance RLS Policies
-- Goal: Ensure management users can modify attendance records created by others (shared roster)

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Users can delete own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON attendance;

-- 2. Create permissive policies for authenticated users
-- This allows any logged-in user to view/edit attendance. 
-- In a production app with public sign-up, you would restrict this to 'management' role.
-- But for this internal team app, this ensures the Roll Call feature works for all officers.

CREATE POLICY "Allow all actions for authenticated users" ON attendance
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
-- 1. Add user_id to members table for robust linking with auth.users
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- 2. Backfill user_id based on email match (Case Insensitive)
UPDATE members
SET user_id = au.id
FROM auth.users au
WHERE LOWER(members.email) = LOWER(au.email)
AND members.user_id IS NULL;

-- 3. Update the RPC function to join on user_id (Robust Link)
CREATE OR REPLACE FUNCTION admin_list_users_with_roles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    member_name TEXT,
    role_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::TEXT,
        m.name as member_name,
        COALESCE(r.name, 'member') as role_name,
        au.created_at
    FROM auth.users au
    LEFT JOIN members m ON m.user_id = au.id -- Primary Robust Link
    LEFT JOIN user_roles ur ON ur.user_id = au.id
    LEFT JOIN roles r ON r.id = ur.role_id
    ORDER BY m.name, au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix Activity Visibility (Re-applying to be safe)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view activities" ON activities;
CREATE POLICY "Everyone can view activities" ON activities FOR SELECT TO authenticated, anon USING (true);

-- 5. Fix Service Role visibility (Optional but good practice)
-- (Service role bypasses RLS anyway, but good to be explicit for authenticated users)

-- 6. Ensure activity_registrations is viewable
ALTER TABLE activity_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own registrations" ON activity_registrations;
CREATE POLICY "Users can view own registrations" ON activity_registrations FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management'))
);
-- 新增自主訓練積點規則 (修正版：category 使用 attendance)
-- 每次上傳自主訓練紀錄可獲得 1 M 點
-- category 只能是: attendance, contribution, bonus, penalty
INSERT INTO point_rules (rule_code, rule_name, base_points, category, description, is_active)
VALUES ('TRAINING_SELF', '自主訓練', 1, 'attendance', '上傳自主訓練紀錄可獲得 1 M 點', true)
ON CONFLICT (rule_code) DO NOTHING;

-- 確認 point_events 表的 RLS 允許使用者新增自己的紀錄
ALTER TABLE point_events ENABLE ROW LEVEL SECURITY;

-- 允許已登入使用者查看自己的 point_events
DROP POLICY IF EXISTS "Users can view own point events" ON point_events;
CREATE POLICY "Users can view own point events" ON point_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 允許已登入使用者新增自己的 point_events
DROP POLICY IF EXISTS "Users can insert own point events" ON point_events;
CREATE POLICY "Users can insert own point events" ON point_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 確認 training_records 表的 RLS 允許使用者查看及新增自己的紀錄
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own training records" ON training_records;
CREATE POLICY "Users can view own training records" ON training_records
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own training records" ON training_records;
CREATE POLICY "Users can insert own training records" ON training_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 確認 members 表允許使用者更新自己的 total_points
-- (透過 email 匹配確認身份)
DROP POLICY IF EXISTS "Users can update own member points" ON members;
CREATE POLICY "Users can update own member points" ON members
  FOR UPDATE TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
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
-- Force PostgREST to reload the schema cache
-- Run this in Supabase SQL Editor to fix "Could not find the column ... in the schema cache" error

NOTIFY pgrst, 'reload schema';
