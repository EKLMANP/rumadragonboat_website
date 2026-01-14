-- =============================================
-- 測試用戶設置腳本 (修正版)
-- =============================================

-- 1. 更新現有的 Eric 記錄，加入 email
UPDATE members 
SET email = 'n79928@gmail.com' 
WHERE name = 'Eric';

-- 2. 新增 Siaomin 記錄 (如果不存在)
INSERT INTO members (name, email, position, skill_rating)
VALUES ('Siaomin', 'siaominpan@gmail.com', '新進隊員', 1)
ON CONFLICT (name) DO UPDATE SET
    email = EXCLUDED.email;

-- 3. 查詢確認結果
SELECT id, name, email, position FROM members 
WHERE email IN ('n79928@gmail.com', 'siaominpan@gmail.com');
