-- Force enable read access for everyone on activities table
-- This is a fix for the issue where members cannot see activities created by coaches

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view activities" ON activities;

-- Create a permissive policy for SELECT
CREATE POLICY "Everyone can view activities" 
ON activities 
FOR SELECT 
TO authenticated, anon 
USING (true);

-- Ensure activity_registrations is also viewable by users
ALTER TABLE activity_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own registrations" ON activity_registrations;

CREATE POLICY "Users can view own registrations" 
ON activity_registrations 
FOR SELECT 
TO authenticated 
USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management')
    )
);
