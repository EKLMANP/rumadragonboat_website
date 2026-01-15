-- =====================================================
-- 資料表修復腳本：建立 training_records 資料表與權限
-- 請將此腳本內容複製到 Supabase Dashboard > SQL Editor 執行
-- =====================================================

-- 1. 確保 uuid-ossp 擴充功能已啟用 (用於產生 UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 建立 training_records 資料表
CREATE TABLE IF NOT EXISTS training_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    custom_type TEXT,
    notes TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 啟用 RLS (Row Level Security)
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

-- 4. 設定 RLS 政策
-- 先刪除舊政策以避免重複
DROP POLICY IF EXISTS "Users can view their own training records" ON training_records;
DROP POLICY IF EXISTS "Users can insert their own training records" ON training_records;
DROP POLICY IF EXISTS "Coaches/Admins can view all records" ON training_records;
DROP POLICY IF EXISTS "Coaches/Admins can update records" ON training_records;

-- 政策：用戶可以檢視自己的紀錄
CREATE POLICY "Users can view their own training records" 
ON training_records FOR SELECT 
USING (auth.uid() = user_id);

-- 政策：用戶可以新增自己的紀錄
CREATE POLICY "Users can insert their own training records" 
ON training_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 政策：幹部/教練/管理員可以檢視所有紀錄
CREATE POLICY "Coaches/Admins can view all records" 
ON training_records FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('coach', 'admin', 'manager', 'management')
    )
);

-- 政策：幹部/教練/管理員可以修改紀錄 (審核用)
CREATE POLICY "Coaches/Admins can update records" 
ON training_records FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('coach', 'admin', 'manager', 'management')
    )
);

-- 5. 確認
SELECT 'Training records table created successfully!' as status;
