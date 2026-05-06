-- Add activity_id to seating_arrangements so AM/PM sessions on the same date
-- can have independent snapshots without overwriting each other.
-- practice_date is kept for backward compatibility with existing rows.

ALTER TABLE public.seating_arrangements
  ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL;

-- Unique constraint: each activity has at most one saved seating snapshot.
-- Multiple NULLs are allowed (old rows without activity_id).
CREATE UNIQUE INDEX IF NOT EXISTS seating_arrangements_activity_id_unique
  ON public.seating_arrangements (activity_id)
  WHERE activity_id IS NOT NULL;
