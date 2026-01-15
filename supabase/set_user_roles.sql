-- =====================================================
-- 設定使用者角色 (請在建立使用者後執行)
-- =====================================================

DO $$
DECLARE
  v_admin_role_id UUID;
  v_mgmt_role_id UUID;
  v_user_id UUID;
BEGIN
  -- 取得 Role ID
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_mgmt_role_id FROM roles WHERE name = 'management';

  -- 1. 設定 Admin (rumadragonboat@gmail.com)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'rumadragonboat@gmail.com';
  IF v_user_id IS NOT NULL THEN
    -- 先移除可能存在的 member 角色 (可選)或是直接疊加，這裡選擇直接插入 admin
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_admin_role_id) 
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to rumadragonboat@gmail.com';
  ELSE
    RAISE NOTICE 'User rumadragonboat@gmail.com not found. Please create it in Authentication > Users first.';
  END IF;

  -- 2. 設定 Management (n79928@gmail.com)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'n79928@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_mgmt_role_id) 
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Management role assigned to n79928@gmail.com';
  ELSE
    RAISE NOTICE 'User n79928@gmail.com not found. Please create it in Authentication > Users first.';
  END IF;

END $$;
