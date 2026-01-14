-- ============================================
-- RUMA Dragon Boat - 清除測試資料 SQL 腳本
-- ============================================
-- 此腳本會清除所有測試資料，但保留：
-- 1. members 表 - 隊員基本資料
-- 2. user_roles 表 - 三個權限用戶
-- 3. equipment_inventory 表 - 裝備庫存（可選保留）
-- ============================================
-- 執行方式：在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 開始交易
BEGIN;

-- 1. 清除船練報名記錄
TRUNCATE TABLE practice_registrations CASCADE;
SELECT '✅ practice_registrations 已清除' as status;

-- 2. 清除船練日期
TRUNCATE TABLE practice_dates CASCADE;
SELECT '✅ practice_dates 已清除' as status;

-- 3. 清除出席記錄
TRUNCATE TABLE attendance CASCADE;
SELECT '✅ attendance 已清除' as status;

-- 4. 清除活動報名
TRUNCATE TABLE activity_registrations CASCADE;
SELECT '✅ activity_registrations 已清除' as status;

-- 5. 清除活動
TRUNCATE TABLE activities CASCADE;
SELECT '✅ activities 已清除' as status;

-- 6. 清除公告
TRUNCATE TABLE announcements CASCADE;
SELECT '✅ announcements 已清除' as status;

-- 7. 清除借用記錄
TRUNCATE TABLE borrow_records CASCADE;
SELECT '✅ borrow_records 已清除' as status;

-- 8. 清除新聞文章（如果需要保留新聞，可以註解掉這行）
TRUNCATE TABLE news CASCADE;
SELECT '✅ news 已清除' as status;

-- 提交交易
COMMIT;

-- ============================================
-- 驗證：顯示各表的資料筆數
-- ============================================
SELECT 'practice_registrations' as table_name, COUNT(*) as count FROM practice_registrations
UNION ALL
SELECT 'practice_dates', COUNT(*) FROM practice_dates
UNION ALL
SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'activity_registrations', COUNT(*) FROM activity_registrations
UNION ALL
SELECT 'activities', COUNT(*) FROM activities
UNION ALL
SELECT 'announcements', COUNT(*) FROM announcements
UNION ALL
SELECT 'borrow_records', COUNT(*) FROM borrow_records
UNION ALL
SELECT 'news', COUNT(*) FROM news
UNION ALL
SELECT 'members (保留)', COUNT(*) FROM members
UNION ALL
SELECT 'user_roles (保留)', COUNT(*) FROM user_roles;
