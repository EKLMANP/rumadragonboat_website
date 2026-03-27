-- =====================================================
-- 綜合修復腳本：建立所有必要的後端函式 (UAT/PROD)
-- 請將此腳本內容複製到 Supabase Dashboard > SQL Editor 執行
-- =====================================================

-- 1. 取得當前用戶角色 (用於前端權限判斷)
DROP FUNCTION IF EXISTS get_my_roles();

CREATE OR REPLACE FUNCTION get_my_roles()
RETURNS TABLE (role_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name::TEXT as role_name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_roles() TO authenticated;

-- 2. 輔助函式：根據角色名稱取得 ID
CREATE OR REPLACE FUNCTION get_role_id_by_name(role_name TEXT)
RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    SELECT id INTO result_id FROM roles WHERE name = role_name;
    RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_role_id_by_name(TEXT) TO authenticated;

-- 3. 管理員指派角色 (權限檢查 + 刪除舊角色 + 插入新角色)
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

GRANT EXECUTE ON FUNCTION admin_assign_role(UUID, TEXT) TO authenticated;

-- 4. 取得所有用戶及其角色 (修正大小寫對應問題)
DROP FUNCTION IF EXISTS admin_list_users_with_roles();

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
    -- 使用 LOWER() 確保 Email 大小寫不一致也能正確對應
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::TEXT,
        m.name as member_name,
        COALESCE(r.name, 'member') as role_name,
        au.created_at
    FROM auth.users au
    LEFT JOIN members m ON LOWER(m.email) = LOWER(au.email)
    LEFT JOIN user_roles ur ON ur.user_id = au.id
    LEFT JOIN roles r ON r.id = ur.role_id
    ORDER BY m.name, au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_list_users_with_roles() TO authenticated;

-- 5. 確保必要的表格與權限
-- 確保 user_roles 存在
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(user_id, role_id)
);

-- 確保 roles 存在 (如果這一步報錯可以忽略，代表已存在)
INSERT INTO roles (name) VALUES ('admin'), ('management'), ('member')
ON CONFLICT (name) DO NOTHING;

-- 完成
SELECT 'All functions created/updated successfully!' as status;
