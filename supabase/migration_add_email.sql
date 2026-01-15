-- =====================================================
-- RUMA Dragon Boat - 新增 email 欄位至 members 表
-- 執行此檔案於 Supabase SQL Editor
-- =====================================================

-- 新增 email 欄位
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);

-- 完成
-- 現在 members 表可以透過 email 與 auth.users 進行關聯
