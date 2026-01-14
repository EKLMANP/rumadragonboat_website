-- RUMA Dragon Boat - Schema Update
-- 1. Roles & Permissions
-- 2. Activities & Registrations
-- 3. Schema fixes (users table, email in members)

-- ==========================================
-- 1. ROLES SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO roles (name, description) VALUES
('admin', 'Administrator'),
('management', 'Management/Coach'),
('member', 'Regular Member')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- RLS for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- Allow all authenticated users to read roles (needed for AuthContext)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Allow read access for authenticated users'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users" ON user_roles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;


-- ==========================================
-- 2. ACTIVITIES SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('boat_practice', 'team_building', 'race', 'internal_competition')),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  deadline DATE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'Everyone can view activities') THEN
    CREATE POLICY "Everyone can view activities" ON activities FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'Management can manage activities') THEN
    CREATE POLICY "Management can manage activities" ON activities FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management')
      )
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS activity_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- RLS for registrations
ALTER TABLE activity_registrations ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_registrations' AND policyname = 'Users can view own registrations') THEN
    CREATE POLICY "Users can view own registrations" ON activity_registrations FOR SELECT TO authenticated USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management')
        )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_registrations' AND policyname = 'Users can register themselves') THEN
    CREATE POLICY "Users can register themselves" ON activity_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_registrations' AND policyname = 'Users can cancel own') THEN
    CREATE POLICY "Users can cancel own" ON activity_registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;


-- ==========================================
-- 3. SCHEMA FIXES & ROLE ASSIGNMENT
-- ==========================================

-- Assign Roles to specific emails
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
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_admin_role_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Management: n79928@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'n79928@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_mgmt_role_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Member: siaominpan@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'siaominpan@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_member_role_id) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Fix table columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS email TEXT;

-- Create users table (needed for AuthContext) if not exists
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Public profiles') THEN
    CREATE POLICY "Public profiles" ON users FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Sync auth.users to users
INSERT INTO users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
