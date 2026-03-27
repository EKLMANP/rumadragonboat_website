-- =====================================================
-- RUMA Supabase 資料庫效能優化 SQL (修正版)
-- 執行位置: Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: 建立索引 (提升查詢效能)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activity_registrations_user_id ON activity_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_registrations_activity_id ON activity_registrations(activity_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_practice_date ON attendance(practice_date);
CREATE INDEX IF NOT EXISTS idx_attendance_member_name ON attendance(member_name);
CREATE INDEX IF NOT EXISTS idx_practice_dates_confirmed_date ON practice_dates(confirmed_date);
CREATE INDEX IF NOT EXISTS idx_borrow_records_member_name ON borrow_records(member_name);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at);

-- =====================================================
-- PART 2: 確認角色資料
-- =====================================================

INSERT INTO roles (name, description) VALUES
    ('guest', '訪客'),
    ('member', '隊員'),
    ('management', '幹部'),
    ('admin', '管理員')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- PART 3: 指派角色 (使用直接 SQL，避免類型問題)
-- =====================================================

-- Admin: rumadragonboat@gmail.com
INSERT INTO user_roles (user_id, role_id)
SELECT au.id, r.id
FROM auth.users au, roles r
WHERE au.email = 'rumadragonboat@gmail.com' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Management: kenny.chen.tpe@gmail.com
INSERT INTO user_roles (user_id, role_id)
SELECT au.id, r.id
FROM auth.users au, roles r
WHERE au.email = 'kenny.chen.tpe@gmail.com' AND r.name = 'management'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Management: n79928@gmail.com
INSERT INTO user_roles (user_id, role_id)
SELECT au.id, r.id
FROM auth.users au, roles r
WHERE au.email = 'n79928@gmail.com' AND r.name = 'management'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- =====================================================
-- PART 4: 優化 get_my_roles 函數
-- =====================================================

DROP FUNCTION IF EXISTS get_my_roles();

CREATE OR REPLACE FUNCTION get_my_roles()
RETURNS TABLE (role_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name::TEXT as role_name
    FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_my_roles() TO authenticated;

-- =====================================================
-- PART 5: 驗證
-- =====================================================

SELECT ur.user_id, au.email, r.name as role_name
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
JOIN roles r ON ur.role_id = r.id;

SELECT 'Done!' as status;
