-- Enable Public Read Access for Activities and Announcements

-- 1. Activities
DROP POLICY IF EXISTS "Everyone can view activities" ON activities;
CREATE POLICY "Public can view activities" ON activities FOR SELECT TO anon, authenticated USING (true);

-- 2. Announcements
DROP POLICY IF EXISTS "Public read announcements" ON announcements;
CREATE POLICY "Public read announcements" ON announcements FOR SELECT TO anon, authenticated USING (true);

-- 3. Users (For verifying created_by?)
-- We probably don't want to expose full user table to anon, but maybe select name?
-- For now, keep users restricted. The frontend might need to fetch `created_by` name.
-- If filtering or display relies on `created_by` user data, that might be tricky for anon.
-- But activities typically just show the event.
