-- RUMA Dragon Boat - Restore History Data
-- Run this script in Supabase SQL Editor to restore sample data

-- 0. Restore Mock Members (Satisfy Foreign Key for Borrow Records)
-- We need ensure these members exist before adding borrow records.
INSERT INTO members (name, position, skill_rating, weight)
SELECT 'Eric', 'Left', 5, 75
WHERE NOT EXISTS (SELECT 1 FROM members WHERE name = 'Eric');

INSERT INTO members (name, position, skill_rating, weight)
SELECT 'Jessica', 'Right', 3, 60
WHERE NOT EXISTS (SELECT 1 FROM members WHERE name = 'Jessica');


-- 1. Restore Equipment Inventory (公用裝備)
INSERT INTO equipment_inventory (item, count, updated_at)
SELECT '公用木槳', 20, NOW()
WHERE NOT EXISTS (SELECT 1 FROM equipment_inventory WHERE item = '公用木槳');

INSERT INTO equipment_inventory (item, count, updated_at)
SELECT '公用救生衣 (L)', 10, NOW()
WHERE NOT EXISTS (SELECT 1 FROM equipment_inventory WHERE item = '公用救生衣 (L)');

INSERT INTO equipment_inventory (item, count, updated_at)
SELECT '公用救生衣 (M)', 15, NOW()
WHERE NOT EXISTS (SELECT 1 FROM equipment_inventory WHERE item = '公用救生衣 (M)');

INSERT INTO equipment_inventory (item, count, updated_at)
SELECT '公用救生衣 (S)', 10, NOW()
WHERE NOT EXISTS (SELECT 1 FROM equipment_inventory WHERE item = '公用救生衣 (S)');

INSERT INTO equipment_inventory (item, count, updated_at)
SELECT '碳纖槳 (隊產)', 5, NOW()
WHERE NOT EXISTS (SELECT 1 FROM equipment_inventory WHERE item = '碳纖槳 (隊產)');

INSERT INTO equipment_inventory (item, count, updated_at)
SELECT '計時碼表', 2, NOW()
WHERE NOT EXISTS (SELECT 1 FROM equipment_inventory WHERE item = '計時碼表');


-- 2. Restore Practice Dates (年度日程表)
INSERT INTO practice_dates (confirmed_date, display_date, place, meeting_time)
SELECT '2026-01-04', '2026/01/04(Sun)', '碧潭', '08:00'
WHERE NOT EXISTS (SELECT 1 FROM practice_dates WHERE display_date = '2026/01/04(Sun)');

INSERT INTO practice_dates (confirmed_date, display_date, place, meeting_time)
SELECT '2026-01-11', '2026/01/11(Sun)', '碧潭', '08:00'
WHERE NOT EXISTS (SELECT 1 FROM practice_dates WHERE display_date = '2026/01/11(Sun)');

INSERT INTO practice_dates (confirmed_date, display_date, place, meeting_time)
SELECT '2026-01-18', '2026/01/18(Sun)', '碧潭', '08:00'
WHERE NOT EXISTS (SELECT 1 FROM practice_dates WHERE display_date = '2026/01/18(Sun)');

INSERT INTO practice_dates (confirmed_date, display_date, place, meeting_time)
SELECT '2026-01-25', '2026/01/25(Sun)', '碧潭', '08:00'
WHERE NOT EXISTS (SELECT 1 FROM practice_dates WHERE display_date = '2026/01/25(Sun)');

INSERT INTO practice_dates (confirmed_date, display_date, place, meeting_time)
SELECT '2026-02-01', '2026/02/01(Sun)', '碧潭', '08:00'
WHERE NOT EXISTS (SELECT 1 FROM practice_dates WHERE display_date = '2026/02/01(Sun)');

INSERT INTO practice_dates (confirmed_date, display_date, place, meeting_time)
SELECT '2026-02-08', '2026/02/08(Sun)', '碧潭', '08:00'
WHERE NOT EXISTS (SELECT 1 FROM practice_dates WHERE display_date = '2026/02/08(Sun)');


-- 3. Restore Activities (新版活動報名系統)
INSERT INTO activities (name, type, date, start_time, end_time, location, deadline, description)
SELECT '與浪共舞：春季特訓', 'boat_practice', '2026-03-14', '08:00:00', '12:00:00', '碧潭西岸', '2026-03-10', '針對 2026 賽季的第一次長距離划行訓練，請大家務必準時出席。'
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = '與浪共舞：春季特訓' AND date = '2026-03-14');

INSERT INTO activities (name, type, date, start_time, end_time, location, deadline, description)
SELECT 'RUMA 年度春酒 Party', 'team_building', '2026-03-20', '18:30:00', '21:30:00', '金色三麥 信義店', '2026-03-15', '吃喝玩樂，慶祝新賽季開始！當天有抽獎活動喔！'
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'RUMA 年度春酒 Party' AND date = '2026-03-20');

INSERT INTO activities (name, type, date, start_time, end_time, location, deadline, description)
SELECT '2026 台北國際龍舟錦標賽', 'race', '2026-06-08', '07:00:00', '17:00:00', '大佳河濱公園', '2026-05-01', '年度重點賽事，目標前三名！請預留全天時間。'
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = '2026 台北國際龍舟錦標賽' AND date = '2026-06-08');

INSERT INTO activities (name, type, date, start_time, end_time, location, deadline, description)
SELECT '新人體驗營 (第一梯次)', 'team_building', '2026-04-10', '09:00:00', '12:00:00', '碧潭', '2026-04-05', '歡迎帶朋友來體驗划龍舟的樂趣！'
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = '新人體驗營 (第一梯次)' AND date = '2026-04-10');


-- 4. Restore Announcements (最新公告)
INSERT INTO announcements (title, content, category, date, pinned)
SELECT '2026 年度賽事行事曆公佈', '各位隊員請注意，今年的主要賽事日期已經公佈，請大家先將時間預留下來。5月議長盃、6月台北國際... 詳細請看行事曆。', '活動', '2026-01-01', true
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = '2026 年度賽事行事曆公佈');

INSERT INTO announcements (title, content, category, date, pinned)
SELECT '公用裝備借用規則更新', '為了確保裝備壽命，即日起借用公用槳請務必填寫借用紀錄，歸還時請清洗乾淨。', '裝勤', '2026-01-05', false
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = '公用裝備借用規則更新');

INSERT INTO announcements (title, content, category, date, pinned)
SELECT '賀！2025 花蓮太平洋浴池賽 榮獲季軍', '感謝大家的努力，我們在花蓮拿到了第三名！照片已經上傳到群組相簿。', '榮譽', '2025-11-20', false
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = '賀！2025 花蓮太平洋浴池賽 榮獲季軍');


-- 5. Restore Sample Borrow Records (借用紀錄)
INSERT INTO borrow_records (member_name, borrow_date, item, count)
SELECT 'Eric', '2026-01-11', '公用木槳', 1
WHERE NOT EXISTS (SELECT 1 FROM borrow_records WHERE member_name = 'Eric' AND borrow_date = '2026-01-11' AND item = '公用木槳');

INSERT INTO borrow_records (member_name, borrow_date, item, count)
SELECT 'Jessica', '2026-01-11', '公用救生衣 (S)', 1
WHERE NOT EXISTS (SELECT 1 FROM borrow_records WHERE member_name = 'Jessica' AND borrow_date = '2026-01-11' AND item = '公用救生衣 (S)');
