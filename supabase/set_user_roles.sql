-- =============================================
-- 設定用戶權限腳本
-- =============================================

-- 1. 查詢 roles 表取得角色 ID
SELECT id, name FROM roles;

-- 2. 查詢 auth.users 取得用戶 ID
SELECT id, email FROM auth.users 
WHERE email IN ('n79928@gmail.com', 'siaominpan@gmail.com');

-- 3. 設定 n79928@gmail.com 為 management 權限
-- 請先執行上面的查詢，取得實際的 user_id 和 role_id，再執行下方的 INSERT
-- 將 <user_id_1> 替換為 n79928@gmail.com 的 user id
-- 將 <management_role_id> 替換為 management 的 role id

-- INSERT INTO user_roles (user_id, role_id)
-- SELECT u.id, r.id
-- FROM auth.users u, roles r
-- WHERE u.email = 'n79928@gmail.com' AND r.name = 'management';

-- 4. 設定 siaominpan@gmail.com 為 member 權限
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT u.id, r.id
-- FROM auth.users u, roles r
-- WHERE u.email = 'siaominpan@gmail.com' AND r.name = 'member';

-- =============================================
-- 快速版本 - 一次設定兩個用戶 (取消註解執行)
-- =============================================

-- 設定 n79928@gmail.com 為 management
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'n79928@gmail.com' AND r.name = 'management'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 設定 siaominpan@gmail.com 為 member
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'siaominpan@gmail.com' AND r.name = 'member'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 5. 確認結果
SELECT 
    u.email,
    r.name as role_name
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.email IN ('n79928@gmail.com', 'siaominpan@gmail.com');
