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
