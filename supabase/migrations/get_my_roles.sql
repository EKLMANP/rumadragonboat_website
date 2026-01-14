-- =====================================================
-- RPC Function to Get User Roles (bypasses RLS)
-- 執行此 SQL 於 Supabase Dashboard > SQL Editor
-- =====================================================

-- 刪除現有函式（如果存在）
DROP FUNCTION IF EXISTS get_my_roles();

-- 建立函式：取得當前登入用戶的角色
CREATE OR REPLACE FUNCTION get_my_roles()
RETURNS TABLE (role_name TEXT) AS $$
BEGIN
    -- 使用 SECURITY DEFINER 繞過 RLS
    RETURN QUERY
    SELECT r.name::TEXT as role_name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予執行權限給已認證用戶
GRANT EXECUTE ON FUNCTION get_my_roles() TO authenticated;

-- 確認函式已建立
SELECT 'get_my_roles() function created successfully!' as status;
