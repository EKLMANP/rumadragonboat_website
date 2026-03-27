-- Migration: save_attendance_batch RPC
-- Purpose: Consolidate attendance delete+insert into a single DB round-trip
--          to reduce UI wait time from ~5s → <500ms
-- Created: 2026-03-25

CREATE OR REPLACE FUNCTION save_attendance_batch(
  p_date TEXT,
  p_names TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 1: Remove all existing attendance records for this date
  DELETE FROM attendance WHERE practice_date = p_date;

  -- Step 2: Batch insert new attendance records (skip if no attendees)
  IF p_names IS NOT NULL AND array_length(p_names, 1) > 0 THEN
    INSERT INTO attendance (member_name, practice_date)
    SELECT unnest(p_names), p_date;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (management role users)
GRANT EXECUTE ON FUNCTION save_attendance_batch(TEXT, TEXT[]) TO authenticated;
