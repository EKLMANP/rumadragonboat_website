-- =====================================================
-- Database Functions for Admin Role Management
-- 執行此 SQL 於 Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. 刪除現有函式（如果存在）
DROP FUNCTION IF EXISTS admin_assign_role(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_list_users_with_roles();
DROP FUNCTION IF EXISTS get_role_id_by_name(TEXT);

-- 2. 建立輔助函式：根據角色名稱取得角色 ID
CREATE OR REPLACE FUNCTION get_role_id_by_name(role_name TEXT)
RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    SELECT id INTO result_id FROM roles WHERE name = role_name;
    RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 建立管理員指派角色函式
CREATE OR REPLACE FUNCTION admin_assign_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS JSONB AS $$
DECLARE
    role_id_val UUID;
    caller_roles TEXT[];
BEGIN
    -- 取得呼叫者的角色列表
    SELECT ARRAY_AGG(r.name) INTO caller_roles
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid();
    
    -- 檢查呼叫者是否為 admin 或 management
    IF NOT ('admin' = ANY(caller_roles) OR 'management' = ANY(caller_roles)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only admin or management can assign roles');
    END IF;
    
    -- 取得角色 ID
    SELECT id INTO role_id_val FROM roles WHERE name = new_role;
    
    IF role_id_val IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role name');
    END IF;
    
    -- 刪除該用戶現有角色
    DELETE FROM user_roles WHERE user_id = target_user_id;
    
    -- 插入新角色
    INSERT INTO user_roles (user_id, role_id) VALUES (target_user_id, role_id_val);
    
    RETURN jsonb_build_object('success', true, 'message', 'Role assigned successfully');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 建立取得所有用戶及其角色的函式
CREATE OR REPLACE FUNCTION admin_list_users_with_roles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    member_name TEXT,
    role_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- 返回所有 members 與其對應的 auth user 和角色
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::TEXT,
        m.name as member_name,
        COALESCE(r.name, 'member') as role_name,
        au.created_at
    FROM auth.users au
    LEFT JOIN members m ON m.email = au.email
    LEFT JOIN user_roles ur ON ur.user_id = au.id
    LEFT JOIN roles r ON r.id = ur.role_id
    ORDER BY m.name, au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 授予執行權限
GRANT EXECUTE ON FUNCTION admin_assign_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_role_id_by_name(TEXT) TO authenticated;

-- 6. 確保 user_roles 表有正確的 RLS 政策讓函式可以操作
-- (SECURITY DEFINER 函式會以建立者身份執行，繞過 RLS)
