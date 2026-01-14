-- =============================================
-- 修復 RLS 政策 - 允許用戶更新自己的 member 記錄
-- =============================================

-- 1. 首先檢查 members 表是否有 RLS 啟用
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'members';

-- 2. 添加 RLS 政策允許用戶透過 email 讀取和更新自己的記錄

-- 刪除可能存在的舊政策 (如有錯誤請忽略)
DROP POLICY IF EXISTS "Users can view own member record" ON members;
DROP POLICY IF EXISTS "Users can update own member record" ON members;

-- 允許用戶讀取自己的 member 記錄
CREATE POLICY "Users can view own member record" ON members
    FOR SELECT
    USING (email = auth.jwt() ->> 'email');

-- 允許用戶更新自己的 member 記錄
CREATE POLICY "Users can update own member record" ON members
    FOR UPDATE
    USING (email = auth.jwt() ->> 'email');

-- 3. 如果 RLS 尚未啟用，需要啟用 (請謹慎，這會影響所有查詢)
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 4. 為已登入用戶添加查詢所有成員的權限 (如果需要)
DROP POLICY IF EXISTS "Authenticated users can view all members" ON members;
CREATE POLICY "Authenticated users can view all members" ON members
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. 確認政策
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'members';
