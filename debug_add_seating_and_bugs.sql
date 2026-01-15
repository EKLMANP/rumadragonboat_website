-- =====================================================
-- 新功能資料表：建立 seating_arrangements 與 bug_reports
-- 請將此腳本內容複製到 Supabase Dashboard > SQL Editor 執行
-- =====================================================

-- 1. 建立 seating_arrangements (槳位存檔)
CREATE TABLE IF NOT EXISTS seating_arrangements (
    practice_date DATE PRIMARY KEY,
    boat_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 啟用 RLS
ALTER TABLE seating_arrangements ENABLE ROW LEVEL SECURITY;

-- 政策：所有人都可以查看槳位 (包括一般隊員)
DROP POLICY IF EXISTS "Everyone can view seating" ON seating_arrangements;
CREATE POLICY "Everyone can view seating"
ON seating_arrangements FOR SELECT
USING (true);

-- 政策：只有幹部/教練可以新增或修改槳位
DROP POLICY IF EXISTS "Coaches can insert/update seating" ON seating_arrangements;
CREATE POLICY "Coaches can insert/update seating"
ON seating_arrangements FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('coach', 'admin', 'manager', 'management')
    )
);


-- 2. 建立 bug_reports (Bug 回報)
CREATE TABLE IF NOT EXISTS bug_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id),
    reporter_name TEXT,
    reporter_email TEXT,
    description TEXT NOT NULL,
    screenshot_url TEXT,
    is_fixed BOOLEAN DEFAULT false,
    fixed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- 政策：任何已登入用戶都可以回報 Bug
DROP POLICY IF EXISTS "Users can insert bug reports" ON bug_reports;
CREATE POLICY "Users can insert bug reports"
ON bug_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- 政策：用戶可以查看自己的回報，管理員可以查看所有回報
DROP POLICY IF EXISTS "Admins can view all bug reports" ON bug_reports;
CREATE POLICY "Admins can view all bug reports"
ON bug_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'manager', 'management')
    )
    OR auth.uid() = reporter_id
);

-- 政策：只有管理員可以修改 (標記已修復)
DROP POLICY IF EXISTS "Admins can update bug reports" ON bug_reports;
CREATE POLICY "Admins can update bug reports"
ON bug_reports FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'manager', 'management')
    )
);


-- 3. 建立 Storage Bucket (bug-reports)
-- 注意：如果 bucket 已存在不會重複建立
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-reports', 'bug-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 權限：允許登入用戶上傳
DROP POLICY IF EXISTS "Authenticated users can upload bug reports" ON storage.objects;
CREATE POLICY "Authenticated users can upload bug reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bug-reports');

-- Storage 權限：公開讀取 (方便管理員查看)
DROP POLICY IF EXISTS "Public can view bug reports" ON storage.objects;
CREATE POLICY "Public can view bug reports"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bug-reports');

SELECT 'Tables and storage created successfully!' as status;
