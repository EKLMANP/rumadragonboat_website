-- Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('活動', '比賽', '裝勤', '榮譽', '其他')),
  date DATE NOT NULL,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Public read announcements') THEN
    CREATE POLICY "Public read announcements" ON announcements FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Management manage announcements') THEN
    CREATE POLICY "Management manage announcements" ON announcements FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management')
      )
    );
  END IF;
END $$;

-- Add avatar_url to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
