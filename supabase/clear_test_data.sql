-- RUMA Dragon Boat - Clear Test Data
-- Run this script in Supabase SQL Editor to clear all data EXCEPT members and permissions.

-- 1. Clear Activities & Registrations
-- (activity_registrations should cascade delete, but we clear it explicitly to be safe)
DELETE FROM activity_registrations;
DELETE FROM activities;

-- 2. Clear Announcements
DELETE FROM announcements;

-- 3. Clear Practice Dates & Registrations (Legacy System)
DELETE FROM practice_registrations;
DELETE FROM practice_dates;

-- 4. Clear Equipment & Borrow Records
DELETE FROM borrow_records;
DELETE FROM equipment_inventory;

-- 5. Clear Self Training Records
DELETE FROM training_records;

-- 6. Clear U-Coins Transactions
DELETE FROM u_coins_transactions;

-- Note: We are PRESERVING:
-- - members (隊員資料)
-- - roles
-- - user_roles (權限資料)
-- - auth.users
