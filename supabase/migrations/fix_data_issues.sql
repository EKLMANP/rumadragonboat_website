-- ==========================================
-- RUMA Dragon Boat - Fix Data Issues
-- 1. Enable Public Read Access (for Schedule/News)
-- 2. Restore Default User Roles (to allow Creation)
-- ==========================================

-- 1. Enable Public Read Access
-- ------------------------------------------
-- Activities
DROP POLICY IF EXISTS "Everyone can view activities" ON activities;
DROP POLICY IF EXISTS "Public can view activities" ON activities;
CREATE POLICY "Public can view activities" ON activities FOR SELECT TO anon, authenticated USING (true);

-- Announcements
DROP POLICY IF EXISTS "Public read announcements" ON announcements;
CREATE POLICY "Public read announcements" ON announcements FOR SELECT TO anon, authenticated USING (true);

-- 2. Restore User Roles
-- ------------------------------------------
-- Ensure roles exist
INSERT INTO roles (name, description) VALUES
('admin', 'Administrator'),
('management', 'Management/Coach'),
('member', 'Regular Member')
ON CONFLICT (name) DO NOTHING;

-- Retrieve role IDs
DO $$
DECLARE
  v_admin_role_id UUID;
  v_mgmt_role_id UUID;
  v_member_role_id UUID;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_mgmt_role_id FROM roles WHERE name = 'management';
  SELECT id INTO v_member_role_id FROM roles WHERE name = 'member';

  -- Admin: rumadragonboat@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'rumadragonboat@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_admin_role_id) 
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Management: n79928@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'n79928@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_mgmt_role_id) 
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Member: siaominpan@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'siaominpan@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_member_role_id) 
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  
  -- Also ensure admins have management role? Usually admin implies management, but RLS checks specific roles.
  -- The RLS usually checks `r.name IN ('admin', 'management')` so having just admin is fine.
END $$;
