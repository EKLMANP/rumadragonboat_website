-- Add delivered_by column to redemption_records table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_records' AND column_name = 'delivered_by') THEN
        ALTER TABLE public.redemption_records ADD COLUMN delivered_by TEXT;
    END IF;
END $$;
