-- =====================================================
-- 儲存空間修復腳本：建立 training-photos Bucket 與權限
-- 請將此腳本內容複製到 Supabase Dashboard > SQL Editor 執行
-- =====================================================

-- 1. 建立 Bucket (如果不存在)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('training-photos', 'training-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 設定 RLS 政策 (先刪除舊的避免衝突)
DROP POLICY IF EXISTS "Public Access to Training Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload training photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own training photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own training photos" ON storage.objects;

-- 允許公開讀取 (檢視照片)
CREATE POLICY "Public Access to Training Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'training-photos' );

-- 允許登入用戶上傳照片
CREATE POLICY "Authenticated users can upload training photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'training-photos' 
    AND auth.role() = 'authenticated'
);

-- 允許用戶更新自己的照片 (可選)
CREATE POLICY "Users can update their own training photos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'training-photos' AND auth.uid()::text = (storage.foldername(name))[1] );

-- 允許用戶刪除自己的照片 (可選)
CREATE POLICY "Users can delete their own training photos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'training-photos' AND auth.uid()::text = (storage.foldername(name))[1] );

-- 3. 確認
SELECT 'Storage bucket and policies configured successfully!' as status;
