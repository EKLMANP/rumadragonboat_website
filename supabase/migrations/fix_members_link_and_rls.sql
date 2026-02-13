-- 1. Add user_id to members table for robust linking with auth.users
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- 2. Backfill user_id based on email match (Case Insensitive)
UPDATE members
SET user_id = au.id
FROM auth.users au
WHERE LOWER(members.email) = LOWER(au.email)
AND members.user_id IS NULL;

-- 3. Update the RPC function to join on user_id (Robust Link)
CREATE OR REPLACE FUNCTION admin_list_users_with_roles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    member_name TEXT,
    role_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::TEXT,
        m.name as member_name,
        COALESCE(r.name, 'member') as role_name,
        au.created_at
    FROM auth.users au
    LEFT JOIN members m ON m.user_id = au.id -- Primary Robust Link
    LEFT JOIN user_roles ur ON ur.user_id = au.id
    LEFT JOIN roles r ON r.id = ur.role_id
    ORDER BY m.name, au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix Activity Visibility (Re-applying to be safe)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view activities" ON activities;
CREATE POLICY "Everyone can view activities" ON activities FOR SELECT TO authenticated, anon USING (true);

-- 5. Fix Service Role visibility (Optional but good practice)
-- (Service role bypasses RLS anyway, but good to be explicit for authenticated users)

-- 6. Ensure activity_registrations is viewable
ALTER TABLE activity_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own registrations" ON activity_registrations;
CREATE POLICY "Users can view own registrations" ON activity_registrations FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management'))
);
