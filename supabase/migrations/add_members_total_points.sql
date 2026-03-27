-- Migration: Add total_points column to members table
-- Purpose: Allow AuthContext to read M-points directly from the members profile
-- Date: 2026-02-10

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Optional: Sync existing point data from users table if any
-- UPDATE public.members m
-- SET total_points = COALESCE(u.total_points, 0)
-- FROM public.users u
-- WHERE m.email = u.email;
