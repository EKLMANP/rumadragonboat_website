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
